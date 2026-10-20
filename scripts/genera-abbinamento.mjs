// Genera be/src/main/resources/abbinamento-id.json per il passaggio da pokemontcg.io a TCGdex:
//   node scripts/genera-abbinamento.mjs
// Si lancia una volta sola, finché pokemontcg.io risponde (si spegne il 1° marzo 2027): è l'unico punto del
// progetto che lo chiama. Il file serve alla migrazione V9 (id vecchi -> nuovi, immagini di TCGdex) e alle carte
// che su TCGdex non hanno immagine (riserve: l'immagine di pokemontcg.io, solo come dato).
// Le pagine di pokemontcg.io lette si salvano in una cache temporanea: dopo un'interruzione si riparte da lì
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NUMERI_ALTROVE, SET_PER_NOME, abbinaPerNome, abbinaSet, normalizzaNumero } from './abbinamento-regole.mjs'

const POKEMONTCG = 'https://api.pokemontcg.io/v2'
const TCGDEX_GRAPHQL = 'https://api.tcgdex.net/v2/graphql'
const DESTINAZIONE = new URL('../be/src/main/resources/abbinamento-id.json', import.meta.url)
// l'API resta giù anche per minuti: 20 tentativi con attese fino a un minuto
const TENTATIVI = 20
// pagine più piccole del massimo (250): con quelle grandi pokemontcg.io risponde 500/502 molto più spesso
const PAGINA = 100
const CACHE = join(tmpdir(), 'scintilla-genera-abbinamento.json')

// senza User-Agent pokemontcg.io risponde 403 ai client che non sono browser o curl
const intestazioni = { 'User-Agent': 'scintilla-genera-abbinamento' }

const attendi = (ms) => new Promise((risolvi) => setTimeout(risolvi, ms))

// richiesta con tentativi: 5xx, 429 ed errori di rete si ritentano; gli altri stati fermano subito lo script
async function leggi(url, opzioni = {}) {
  for (let tentativo = 1; ; tentativo++) {
    let risposta
    try {
      // senza timeout una risposta che non arriva ferma lo script per sempre
      risposta = await fetch(url, { ...opzioni, headers: { ...intestazioni, ...opzioni.headers }, signal: AbortSignal.timeout(60_000) })
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

async function graphql(query) {
  const risposta = await leggi(TCGDEX_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (risposta.errors) throw new Error(`GraphQL di TCGdex: ${JSON.stringify(risposta.errors)}`)
  return risposta.data
}

async function carteVecchie() {
  // orderBy=id pagina in modo stabile: con la cache si riparte dalla pagina dopo l'ultima completa
  const carte = new Map(existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : [])
  if (carte.size > 0) console.error(`ripresa dalla cache: ${carte.size} carte`)
  for (let pagina = Math.floor(carte.size / PAGINA) + 1; ; pagina++) {
    const parametri = new URLSearchParams({ page: pagina, pageSize: PAGINA, orderBy: 'id', select: 'id,number,set,images' })
    const risposta = await leggi(`${POKEMONTCG}/cards?${parametri}`)
    if (!risposta.data?.length) break
    for (const carta of risposta.data) carte.set(carta.id, { id: carta.id, number: carta.number, set: carta.set.id, large: carta.images?.large })
    writeFileSync(CACHE, JSON.stringify([...carte]), 'utf8')
    process.stderr.write(`\rcarte di pokemontcg.io lette: ${carte.size} / ${risposta.totalCount}`)
    if (carte.size >= risposta.totalCount) break
  }
  process.stderr.write('\n')
  return [...carte.values()]
}

// chiavi in ordine alfabetico: il file cambia il meno possibile tra due generazioni
const ordinato = (mappa) => Object.fromEntries([...mappa].sort(([a], [b]) => a.localeCompare(b)))

const setVecchi = (await leggi(`${POKEMONTCG}/sets?pageSize=250&select=id,name,releaseDate,total`)).data
const vecchie = await carteVecchie()
const setNuovi = (await graphql('{ sets { id name releaseDate serie { id } cardCount { total } } }')).sets
  .filter((s) => s.serie?.id !== 'tcgp')
const idSetNuovi = new Set(setNuovi.map((s) => s.id))
const nuove = (await graphql('{ cards { id localId name image set { id } } }')).cards.filter((c) => idSetNuovi.has(c.set?.id))

const { abbinati, mancanti } = abbinaSet(setVecchi, setNuovi)
if (mancanti.length > 0) {
  console.error(`set di pokemontcg.io senza abbinamento: ${mancanti.join(', ')} (aggiungerli a SET_A_MANO)`)
  process.exit(1)
}

// carte nuove per set e numero normalizzato
const perSetENumero = new Map(nuove.map((c) => [`${c.set.id}|${normalizzaNumero(c.localId)}`, c]))
const carte = new Map()
const riserve = new Map()
const perId = new Map(nuove.map((c) => [c.id, c]))
const abbina = (vecchia, nuova) => {
  carte.set(vecchia.id, nuova.id)
  if (!nuova.image && vecchia.large) riserve.set(nuova.id, vecchia.large)
}
let senzaAbbinamento = []
for (const vecchia of vecchie) {
  // nei set numerati in modo diverso il numero porterebbe sulla carta sbagliata: solo il nome
  if (SET_PER_NOME.has(vecchia.set)) {
    senzaAbbinamento.push(vecchia)
    continue
  }
  const numero = normalizzaNumero(vecchia.number)
  const nuova = perSetENumero.get(`${abbinati.get(vecchia.set)}|${numero}`)
    ?? (NUMERI_ALTROVE[vecchia.set] && perSetENumero.get(`${NUMERI_ALTROVE[vecchia.set]}|${numero}`))
  if (nuova) abbina(vecchia, nuova)
  else senzaAbbinamento.push(vecchia)
}
// le carte dei set numerati in modo diverso: per nome, chiesto a pokemontcg.io solo per quei set
const usate = new Set(carte.values())
for (const set of SET_PER_NOME) {
  const daAbbinare = senzaAbbinamento.filter((c) => c.set === set)
  if (daAbbinare.length === 0) continue
  const nomi = new Map((await leggi(`${POKEMONTCG}/cards?${new URLSearchParams({ q: `set.id:${set}`, pageSize: 250, select: 'id,name' })}`))
    .data.map((c) => [c.id, c.name]))
  const perNome = abbinaPerNome(daAbbinare.map((c) => ({ id: c.id, name: nomi.get(c.id) })),
    nuove.filter((c) => c.set.id === abbinati.get(set)), usate)
  for (const vecchia of daAbbinare) {
    if (perNome.has(vecchia.id)) abbina(vecchia, perId.get(perNome.get(vecchia.id)))
  }
}
senzaAbbinamento = senzaAbbinamento.filter((c) => !carte.has(c.id)).map((c) => c.id)
const immagini = new Map(nuove.filter((c) => c.image).map((c) => [c.id, c.image]))

const file = {
  generatoIl: new Date().toISOString().slice(0, 10),
  set: ordinato(abbinati),
  carte: ordinato(carte),
  immagini: ordinato(immagini),
  riserve: ordinato(riserve),
}
writeFileSync(DESTINAZIONE, JSON.stringify(file, null, 1) + '\n', 'utf8')

console.log(`set abbinati: ${abbinati.size} / ${setVecchi.length}`)
console.log(`carte di pokemontcg.io abbinate: ${carte.size} / ${vecchie.length}`)
console.log(`carte di TCGdex con immagine: ${immagini.size} / ${nuove.length}; riserve: ${riserve.size}`)
console.log(`senza abbinamento (${senzaAbbinamento.length}), i primi: ${senzaAbbinamento.slice(0, 20).join(', ')}`)
