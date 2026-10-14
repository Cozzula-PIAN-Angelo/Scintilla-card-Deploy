// Regole con cui genera-artisti.mjs trasforma il campo artist di pokemontcg.io nell'elenco degli artisti.
// Funzioni pure, testate in artisti-regole.test.mjs

// stesso artista scritto in due modi: la grafia rara punta a quella più usata
export const ALIAS = {
  'K Hoshiba': 'K. Hoshiba',
  'akyCG Works': 'aky CG Works',
}

// nomi che la ricerca per frase di pokemontcg.io non ritrova (la verifica dello script li segnala):
// la parola "Pokemon" dentro una frase non trova niente, nemmeno con i jolly
export const QUERY_MANUALI = {
  'Pokemon Rumble': 'artist:"Rumble"',
}

const SEPARATORI_COAUTORI = /\s*(?:,|\+|\/|&)\s*/
const RARITA_ILLUSTRAZIONE = new Set(['Illustration Rare', 'Special Illustration Rare'])

// un nome di pokemontcg.io contiene a capo e spazi multipli
export function pulisci(grafia) {
  return grafia.replace(/\s+/g, ' ').trim()
}

// nomi puliti degli autori di una grafia: coautori divisi, prefisso "Direc." (regista) tolto, alias applicati
export function dividi(grafia) {
  return pulisci(grafia)
    .split(SEPARATORI_COAUTORI)
    .map((parte) => parte.replace(/^Direc\.\s*/, ''))
    .filter((parte) => parte !== '')
    .map((parte) => ALIAS[parte] ?? parte)
}

export function slug(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// pokemontcg.io va in errore con accenti e virgolette nella frase cercata: al loro posto il jolly *
export function query(nomi) {
  return nomi.map((nome) => `artist:"${nome.replace(/[^\x20-\x7e]|"/g, '*')}"`).join(' OR ')
}

// la più recente tra le illustrazioni piene, nate per mettere in mostra l'artista; altrimenti la più recente
export function sceltaAvatar(carte) {
  const piuRecente = (a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id)
  const pregiate = carte.filter((carta) => RARITA_ILLUSTRAZIONE.has(carta.rarity))
  return [...(pregiate.length > 0 ? pregiate : carte)].sort(piuRecente)[0].immagine
}
