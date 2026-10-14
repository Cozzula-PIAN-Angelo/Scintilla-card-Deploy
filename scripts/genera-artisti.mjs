// Genera be/src/main/resources/artisti.json, l'elenco degli artisti della sezione Artisti, da tutte le carte
// di pokemontcg.io. Si rilancia quando escono set nuovi, poi si fa il deploy:
//   node scripts/genera-artisti.mjs
// Chiave facoltativa: POKEMONTCG_API_KEY (alza i limiti dell'API). Con l'API instabile può durare mezz'ora;
// le pagine lette si salvano in una cache temporanea, così dopo un'interruzione si riparte da dove si era
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ALIAS, QUERY_MANUALI, dividi, query, sceltaAvatar, slug } from './artisti-regole.mjs'

const API = 'https://api.pokemontcg.io/v2/cards'
const DESTINAZIONE = new URL('../be/src/main/resources/artisti.json', import.meta.url)
// riservato alla pagina delle carte senza artista
const SLUG_SCONOSCIUTO = 'sconosciuto'
// l'API resta giù anche per minuti: 20 tentativi con attese fino a un minuto
const TENTATIVI = 20
// pagine più piccole del massimo (250): con quelle grandi pokemontcg.io risponde 500/502 molto più spesso
const PAGINA = 100
const CACHE = join(tmpdir(), 'scintilla-genera-artisti.json')

const intestazioni = {
  // senza User-Agent pokemontcg.io risponde 403 ai client che non sono browser o curl
  'User-Agent': 'scintilla-genera-artisti',
  ...(process.env.POKEMONTCG_API_KEY ? { 'X-Api-Key': process.env.POKEMONTCG_API_KEY } : {}),
}

const attendi = (ms) => new Promise((risolvi) => setTimeout(risolvi, ms))

// GET con tentativi: pokemontcg.io dà spesso 500/502/429 a caso. Si ritentano quelli e gli errori di rete;
// gli altri stati (400, 403, 404) non cambiano riprovando e fermano subito lo script
async function leggi(parametri) {
  const url = `${API}?${new URLSearchParams(parametri)}`
  for (let tentativo = 1; ; tentativo++) {
    let risposta
    try {
      risposta = await fetch(url, { headers: intestazioni })
    } catch (errore) {
      if (tentativo >= TENTATIVI) throw errore
    }
    if (risposta?.ok) return await risposta.json()
    if (risposta) {
      const temporaneo = risposta.status >= 500 || risposta.status === 429
      if (!temporaneo || tentativo >= TENTATIVI) throw new Error(`HTTP ${risposta.status} su ${url}`)
    }
    await attendi(Math.min(2 ** (tentativo - 1), 60) * 1000)
  }
}

async function scaricaTutte() {
  // orderBy=id pagina in modo stabile: con la cache si riparte dalla pagina dopo l'ultima completa
  const carte = new Map(existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : [])
  if (carte.size > 0) console.error(`ripresa dalla cache: ${carte.size} carte`)
  for (let pagina = Math.floor(carte.size / PAGINA) + 1; ; pagina++) {
    const risposta = await leggi({ page: pagina, pageSize: PAGINA, orderBy: 'id', select: 'id,artist,rarity,set,images' })
    if (!risposta.data?.length) break
    for (const carta of risposta.data) carte.set(carta.id, carta)
    writeFileSync(CACHE, JSON.stringify([...carte]), 'utf8')
    process.stderr.write(`\rcarte lette: ${carte.size} / ${risposta.totalCount}`)
    if (carte.size >= risposta.totalCount) break
  }
  process.stderr.write('\n')
  return [...carte.values()]
}

// nome pulito -> { grafie, carte, candidati per l'avatar }
function raggruppa(carte) {
  const perNome = new Map()
  let sconosciuti = 0
  let conCoautori = 0
  for (const carta of carte) {
    if (!carta.artist) {
      sconosciuti++
      continue
    }
    const nomi = dividi(carta.artist)
    if (nomi.length > 1) conCoautori++
    for (const nome of nomi) {
      if (!perNome.has(nome)) perNome.set(nome, { grafie: new Set(), carte: new Set(), candidati: [] })
      const voce = perNome.get(nome)
      voce.grafie.add(carta.artist)
      voce.carte.add(carta.id)
      voce.candidati.push({
        rarity: carta.rarity,
        data: carta.set?.releaseDate ?? '',
        id: carta.id,
        immagine: carta.images?.small,
      })
    }
  }
  return { perNome, sconosciuti, conCoautori }
}

function componi(perNome) {
  const artisti = [...perNome].map(([nome, voce]) => {
    const alias = Object.keys(ALIAS).filter((grafia) => ALIAS[grafia] === nome)
    return {
      slug: slug(nome),
      nome,
      grafie: [...voce.grafie].sort(),
      query: QUERY_MANUALI[nome] ?? query([nome, ...alias]),
      carte: voce.carte.size,
      avatar: sceltaAvatar(voce.candidati),
    }
  })
  const visti = new Map()
  for (const artista of artisti) {
    if (artista.slug === SLUG_SCONOSCIUTO) throw new Error(`Lo slug "${SLUG_SCONOSCIUTO}" è riservato: ${artista.nome}`)
    if (visti.has(artista.slug)) {
      throw new Error(`Slug "${artista.slug}" doppio: "${visti.get(artista.slug)}" e "${artista.nome}" (aggiungi un alias)`)
    }
    visti.set(artista.slug, artista.nome)
  }
  return artisti.sort((a, b) => a.slug.localeCompare(b.slug))
}

// ogni query deve ritrovare almeno tutte le carte dell'artista: un nome che l'API non trova si scopre qui
// più query insieme: una alla volta, con i 502 e le attese dei tentativi, la verifica durerebbe ore
const VERIFICHE_IN_PARALLELO = 6

async function verifica(artisti) {
  const errori = []
  const daFare = [...artisti]
  let fatte = 0
  const lavora = async () => {
    for (let artista = daFare.shift(); artista; artista = daFare.shift()) {
      const risposta = await leggi({ q: artista.query, pageSize: 1, select: 'id' })
      if (risposta.totalCount < artista.carte) {
        errori.push(`${artista.nome}: la query ${artista.query} trova ${risposta.totalCount} carte, attese ${artista.carte}`)
      }
      process.stderr.write(`\rquery verificate: ${++fatte} / ${artisti.length}`)
    }
  }
  await Promise.all(Array.from({ length: VERIFICHE_IN_PARALLELO }, lavora))
  process.stderr.write('\n')
  if (errori.length > 0) throw new Error(`Query da sistemare:\n${errori.join('\n')}`)
}

const carte = await scaricaTutte()
const { perNome, sconosciuti, conCoautori } = raggruppa(carte)
const artisti = componi(perNome)
await verifica(artisti)

const testo = JSON.stringify({ generatoIl: new Date().toISOString().slice(0, 10), sconosciuti, artisti }, null, 1)
writeFileSync(DESTINAZIONE, testo + '\n', 'utf8')
rmSync(CACHE, { force: true })

console.log(`Carte lette: ${carte.length}`)
console.log(`Artisti: ${artisti.length}`)
console.log(`Alias applicati: ${Object.entries(ALIAS).map(([da, a]) => `${da} -> ${a}`).join(', ')}`)
console.log(`Carte con più autori: ${conCoautori}`)
console.log(`Carte senza artista: ${sconosciuti}`)
console.log(`Scritto ${DESTINAZIONE.pathname} (${Math.round(Buffer.byteLength(testo) / 1024)} KB)`)
