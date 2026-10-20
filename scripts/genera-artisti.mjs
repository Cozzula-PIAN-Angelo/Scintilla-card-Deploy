// Genera be/src/main/resources/artisti.json, l'elenco degli artisti della sezione Artisti, da tutte le carte
// di TCGdex. Si rilancia quando escono set nuovi, poi si fa il deploy:
//   node scripts/genera-artisti.mjs
// Tutte le carte arrivano con una chiamata GraphQL (qualche MB, pochi secondi)
import { writeFileSync } from 'node:fs'
import { ALIAS, dividi, sceltaAvatar, slug } from './artisti-regole.mjs'

const GRAPHQL = 'https://api.tcgdex.net/v2/graphql'
const DESTINAZIONE = new URL('../be/src/main/resources/artisti.json', import.meta.url)
// riservato alla pagina delle carte senza artista
const SLUG_SCONOSCIUTO = 'sconosciuto'
// i set di Pokémon TCG Pocket (gioco per telefono) non sono carte da collezionare
const SERIE_POCKET = 'tcgp'
const TENTATIVI = 5

const attendi = (ms) => new Promise((risolvi) => setTimeout(risolvi, ms))

async function graphql(query) {
  for (let tentativo = 1; ; tentativo++) {
    try {
      const risposta = await fetch(GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(120_000),
      })
      if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`)
      const corpo = await risposta.json()
      if (corpo.errors) throw new Error(`GraphQL di TCGdex: ${JSON.stringify(corpo.errors).slice(0, 500)}`)
      return corpo.data
    } catch (errore) {
      if (tentativo >= TENTATIVI) throw errore
      await attendi(tentativo * 5000)
    }
  }
}

// la GraphQL non risolve la serie del set dentro la carta: set e carte si chiedono a parte e si uniscono per id
async function scaricaTutte() {
  const { sets } = await graphql('{ sets { id releaseDate serie { id } } }')
  const perId = new Map(sets.filter((set) => set.serie?.id !== SERIE_POCKET).map((set) => [set.id, set]))
  const { cards } = await graphql('{ cards { id illustrator rarity image set { id } } }')
  return cards
    .filter((carta) => perId.has(carta.set?.id))
    .map((carta) => ({ ...carta, data: perId.get(carta.set.id).releaseDate ?? '' }))
}

// nome pulito -> { grafie, carte, candidati per l'avatar }
function raggruppa(carte) {
  const perNome = new Map()
  let sconosciuti = 0
  let conCoautori = 0
  for (const carta of carte) {
    if (!carta.illustrator) {
      sconosciuti++
      continue
    }
    const nomi = dividi(carta.illustrator)
    if (nomi.length > 1) conCoautori++
    for (const nome of nomi) {
      if (!perNome.has(nome)) perNome.set(nome, { grafie: new Set(), carte: new Set(), candidati: [] })
      const voce = perNome.get(nome)
      voce.grafie.add(carta.illustrator)
      voce.carte.add(carta.id)
      voce.candidati.push({
        rarity: carta.rarity,
        data: carta.data,
        id: carta.id,
        immagine: carta.image ? `${carta.image}/low.webp` : null,
      })
    }
  }
  return { perNome, sconosciuti, conCoautori }
}

// grafie: i valori grezzi di illustrator, così come li cerca il backend (una chiamata per grafia)
function componi(perNome) {
  const artisti = [...perNome].map(([nome, voce]) => ({
    slug: slug(nome),
    nome,
    grafie: [...voce.grafie].sort(),
    carte: voce.carte.size,
    // senza immagine nessun avatar: la pagina mostra le iniziali
    avatar: sceltaAvatar(voce.candidati.filter((candidato) => candidato.immagine)) ?? null,
  }))
  const visti = new Map()
  for (const artista of artisti) {
    if (artista.slug === '') throw new Error(`Slug vuoto per "${artista.nome}" (aggiungi un alias)`)
    if (artista.slug === SLUG_SCONOSCIUTO) throw new Error(`Lo slug "${SLUG_SCONOSCIUTO}" è riservato: ${artista.nome}`)
    if (visti.has(artista.slug)) {
      throw new Error(`Slug "${artista.slug}" doppio: "${visti.get(artista.slug)}" e "${artista.nome}" (aggiungi un alias)`)
    }
    visti.set(artista.slug, artista.nome)
  }
  return artisti.sort((a, b) => a.slug.localeCompare(b.slug))
}

const carte = await scaricaTutte()
const { perNome, sconosciuti, conCoautori } = raggruppa(carte)
const artisti = componi(perNome)

const testo = JSON.stringify({ generatoIl: new Date().toISOString().slice(0, 10), sconosciuti, artisti }, null, 1)
writeFileSync(DESTINAZIONE, testo + '\n', 'utf8')

console.log(`Carte lette: ${carte.length}`)
console.log(`Artisti: ${artisti.length}`)
console.log(`Alias applicati: ${Object.entries(ALIAS).map(([da, a]) => `${da} -> ${a}`).join(', ')}`)
console.log(`Carte con più autori: ${conCoautori}`)
console.log(`Carte senza artista: ${sconosciuti}`)
console.log(`Scritto ${DESTINAZIONE.pathname} (${Math.round(Buffer.byteLength(testo) / 1024)} KB)`)
