# Esporta i dati del database (di solito quello di Render) in dati-iniziali.b64: lo legge DatiInizialiSeeder
# al primo avvio di un database nuovo. Formato: base64 di gzip di un JSON {"tabella": [righe...]}.
# Il file contiene email e hash delle password: non va in git (vedi .gitignore), si carica su Render come
# Secret File di scintilla-be.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\esporta-dati.ps1 -FileUrl C:\percorso\render-url.txt
# render-url.txt contiene solo l'External Database URL di Render: così la password non passa dal terminale.
param(
    [Parameter(Mandatory = $true)][string]$FileUrl,
    [string]$Uscita = (Join-Path (Get-Location) 'dati-iniziali.b64'),
    [string]$Psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
)

$ErrorActionPreference = 'Stop'

# stesso ordine di DatiInizialiSeeder.TABELLE: prima le tabelle a cui puntano le chiavi esterne
$tabelle = @(
    'ruoli', 'utenti', 'ruoli_utenti', 'espansioni', 'oggetti', 'oggetti_pokedex', 'pokemon_importati',
    'artisti_importati', 'utenti_oggetti_preferiti', 'binder', 'binder_slot', 'binder_immagini', 'collezione',
    'token_revocati'
)
$limite = 1048576       # 1 MB: limite di Render per tutti i Secret File di un servizio
$soglia = 900 * 1024

$url = (Get-Content $FileUrl -Raw).Trim()
# la password passa a psql con PGPASSWORD: negli argomenti resterebbe visibile nell'elenco dei processi
if ($url -match '^(postgres(?:ql)?://[^:/@]+):([^@]*)@(.+)$') {
    $env:PGPASSWORD = [Uri]::UnescapeDataString($Matches[2])
    $url = "$($Matches[1])@$($Matches[3])"
}
$campi = ($tabelle | ForEach-Object { "'$_', coalesce((SELECT json_agg(t) FROM $_ t), '[]'::json)" }) -join ', '
$query = "SELECT json_build_object($campi);"

# psql scrive in UTF-8 (nomi e testi con accenti); PowerShell lo deve leggere uguale
$env:PGCLIENTENCODING = 'UTF8'
$codificaPrima = [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
    $json = (& $Psql $url -X -A -t -q -c $query | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $json) { throw "Export non riuscito: psql ha restituito $LASTEXITCODE" }
    # righe per tabella contate dal database: ConvertFrom-Json di PowerShell 5.1 si ferma sopra ~2 MB di JSON
    $conti = ($tabelle | ForEach-Object { "SELECT '$_', count(*) FROM $_" }) -join ' UNION ALL '
    & $Psql $url -X -A -t -q -F ' ' -c $conti | ForEach-Object {
        $tabella, $righe = $_ -split ' '
        Write-Host ('{0,-26} {1,6} righe' -f $tabella, $righe)
    }
} finally {
    [Console]::OutputEncoding = $codificaPrima
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

$memoria = New-Object System.IO.MemoryStream
$gzip = New-Object System.IO.Compression.GZipStream($memoria, [System.IO.Compression.CompressionMode]::Compress)
$byte = [System.Text.Encoding]::UTF8.GetBytes($json)
$gzip.Write($byte, 0, $byte.Length)
$gzip.Close()
$base64 = [Convert]::ToBase64String($memoria.ToArray())

if ($base64.Length -gt $limite) {
    throw "Il file verrebbe di $([math]::Round($base64.Length / 1KB)) kB: oltre il limite di 1 MB dei Secret File di Render. Nessun file scritto."
}
if ($base64.Length -gt $soglia) {
    Write-Warning "Il file pesa $([math]::Round($base64.Length / 1KB)) kB, vicino al limite di 1 MB dei Secret File di Render."
}

[System.IO.File]::WriteAllText($Uscita, $base64, (New-Object System.Text.ASCIIEncoding))
Write-Host "Scritto $Uscita ($([math]::Round($base64.Length / 1KB)) kB)"
