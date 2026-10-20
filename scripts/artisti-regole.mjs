// Regole con cui genera-artisti.mjs trasforma il campo illustrator di TCGdex nell'elenco degli artisti.
// Funzioni pure, testate in artisti-regole.test.mjs

// stesso artista scritto in due modi: la grafia rara punta a quella più usata
export const ALIAS = {
  'K Hoshiba': 'K. Hoshiba',
  'akyCG Works': 'aky CG Works',
  // grafie di TCGdex; un elenco divide due nomi scritti senza separatore
  'Saino Misaki': 'saino misaki',
  'Takuyoa': 'takuyoa',
  'Noriko Takaya 樋口 真嗣': 'Noriko Takaya',
  '高屋 法子': 'Noriko Takaya',
  '"Big Mama" Tagawa"': '"Big Mama" Tagawa',
  '"Big Mama" Tagawa"Big Mama" Tagawa': '"Big Mama" Tagawa',
  'Sumiyoshi Kizuki"Big Mama" Tagawa': ['Sumiyoshi Kizuki', '"Big Mama" Tagawa'],
  'Ken Sugimori Yusuke Ohmura': ['Ken Sugimori', 'Yusuke Ohmura'],
}

const SEPARATORI_COAUTORI = /\s*(?:,|\+|\/|&)\s*/
// in minuscolo: TCGdex scrive "Special illustration rare"
const RARITA_ILLUSTRAZIONE = new Set(['illustration rare', 'special illustration rare'])

// un nome può contenere a capo e spazi multipli
export function pulisci(grafia) {
  return grafia.replace(/\s+/g, ' ').trim()
}

// nomi puliti degli autori di una grafia: coautori divisi, prefissi "Illus." e "Direc." (regista) tolti, alias
// applicati (anche quelli che dividono due nomi), senza doppioni. "N/A" (nessun artista) non dà nomi
export function dividi(grafia) {
  if (pulisci(grafia) === 'N/A') return []
  const nomi = pulisci(grafia)
    .split(SEPARATORI_COAUTORI)
    .map((parte) => parte.replace(/^(?:Illus\.|Direc\.)\s*/, ''))
    .filter((parte) => parte !== '')
    .flatMap((parte) => ALIAS[parte] ?? parte)
  return [...new Set(nomi)]
}

export function slug(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// la più recente tra le illustrazioni piene, nate per mettere in mostra l'artista; altrimenti la più recente;
// null senza carte
export function sceltaAvatar(carte) {
  const piuRecente = (a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id)
  const pregiate = carte.filter((carta) => RARITA_ILLUSTRAZIONE.has(carta.rarity?.toLowerCase()))
  return [...(pregiate.length > 0 ? pregiate : carte)].sort(piuRecente)[0]?.immagine ?? null
}
