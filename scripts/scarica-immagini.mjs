// Copia in fe/public/immagini le immagini che oggi arrivano ancora dai server di pokemontcg.io e Scrydex, che si
// spengono con l'API il 1° marzo 2027: le riserve delle carte che TCGdex non ha, le carte rimaste con l'id vecchio,
// i simboli dei set (quelli di TCGdex non si caricano) e i loghi che TCGdex non ha. Le converte in webp e aggiorna
// be/src/main/resources/abbinamento-id.json con i percorsi locali (mappe riserve, riserveVecchie, simboli, loghi).
//   node scripts/genera-abbinamento.mjs   (prima, per la cache delle carte di pokemontcg.io)
//   node scripts/scarica-immagini.mjs
// Riparte da dove si era fermato: i file già scritti si saltano. Usa sharp, dipendenza di sviluppo del frontend
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { percorsoCarta, percorsoSet } from './immagini-regole.mjs'

const sharp = createRequire(new URL('../fe/package.json', import.meta.url))('sharp')

const POKEMONTCG = 'https://api.pokemontcg.io/v2'
const TCGDEX_GRAPHQL = 'https://api.tcgdex.net/v2/graphql'
const ABBINAMENTO = new URL('../be/src/main/resources/abbinamento-id.json', import.meta.url)
const PUBBLICA = fileURLToPath(new URL('../fe/public', import.meta.url))
const CACHE_CARTE = join(tmpdir(), 'scintilla-genera-abbinamento.json')
const TENTATIVI = 20
const IN_PARALLELO = 8
// larghezze delle copie: carte come nella griglia e nel dettaglio, loghi come nella vetrina, simboli fino a 4 volte
// la dimensione mostrata (24 px)
const LARGHEZZA = { carta: 450, logo: 400, simbolo: 96 }

const intestazioni = { 'User-Agent': 'scintilla-scarica-immagini' }
const attendi = (ms) => new Promise((risolvi) => setTimeout(risolvi, ms))

// GET con tentativi: 5xx, 429 ed errori di rete si ritentano; gli altri stati fermano subito
async function scarica(url, json = false) {
  for (let tentativo = 1; ; tentativo++) {
    let risposta
    try {
      risposta = await fetch(url, { headers: intestazioni, signal: AbortSignal.timeout(60_000) })
    } catch (errore) {
      if (tentativo >= TENTATIVI) throw errore
    }
    if (risposta?.ok) return json ? await risposta.json() : Buffer.from(await risposta.arrayBuffer())
    if (risposta) {
      const temporaneo = risposta.status >= 500 || risposta.status === 429
      if (!temporaneo || tentativo >= TENTATIVI) throw new Error(`HTTP ${risposta.status} su ${url}`)
    }
    await attendi(Math.min(2 ** (tentativo - 1), 60) * 1000)
  }
}

if (!existsSync(CACHE_CARTE)) throw new Error(`Cache delle carte di pokemontcg.io assente: lancia prima node scripts/genera-abbinamento.mjs`)
const abbinamento = JSON.parse(readFileSync(ABBINAMENTO, 'utf8'))
const carteVecchie = JSON.parse(readFileSync(CACHE_CARTE, 'utf8')).map(([, carta]) => carta)
const setVecchi = (await scarica(`${POKEMONTCG}/sets?pageSize=250&select=id,images`, true)).data
const setTcgdex = await (await fetch(TCGDEX_GRAPHQL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ sets { id logo } }' }),
})).json()
const conLogo = new Set(setTcgdex.data.sets.filter((s) => s.logo).map((s) => s.id))

// lavori: { url, file (percorso relativo al sito), tipo }
const lavori = []
const riserve = {}
for (const [idNuovo, url] of Object.entries(abbinamento.riserve)) {
  // un URL già locale viene da un giro precedente: la sorgente è nella cache delle carte vecchie
  const sorgente = url.startsWith('/') ? null : url
  riserve[idNuovo] = percorsoCarta(idNuovo)
  if (sorgente) lavori.push({ url: sorgente, file: riserve[idNuovo], tipo: 'carta' })
}
// le riserve di un giro precedente non hanno più l'URL originale: si ritrova dalle carte vecchie abbinate
const vecchiaPerNuova = new Map(Object.entries(abbinamento.carte).map(([vecchio, nuovo]) => [nuovo, vecchio]))
const perIdVecchio = new Map(carteVecchie.map((c) => [c.id, c]))
for (const [idNuovo, url] of Object.entries(abbinamento.riserve)) {
  if (!url.startsWith('/')) continue
  const vecchia = perIdVecchio.get(vecchiaPerNuova.get(idNuovo))
  if (vecchia?.large) lavori.push({ url: vecchia.large, file: riserve[idNuovo], tipo: 'carta' })
}
// carte rimaste con l'id di pokemontcg.io: nel catalogo tengono la loro immagine, che va copiata come le altre
const riserveVecchie = {}
for (const carta of carteVecchie) {
  if (abbinamento.carte[carta.id] || !carta.large) continue
  riserveVecchie[carta.id] = percorsoCarta(carta.id)
  lavori.push({ url: carta.large, file: riserveVecchie[carta.id], tipo: 'carta' })
}
const simboli = {}
const loghi = {}
for (const set of setVecchi) {
  const nuovo = abbinamento.set[set.id]
  if (!nuovo) continue
  if (set.images?.symbol) {
    simboli[nuovo] = percorsoSet(nuovo, 'simbolo')
    lavori.push({ url: set.images.symbol, file: simboli[nuovo], tipo: 'simbolo' })
  }
  if (!conLogo.has(nuovo) && set.images?.logo) {
    loghi[nuovo] = percorsoSet(nuovo, 'logo')
    lavori.push({ url: set.images.logo, file: loghi[nuovo], tipo: 'logo' })
  }
}

// due id diversi con lo stesso nome di file si sovrascriverebbero
const perFile = new Map()
for (const lavoro of lavori) {
  if (perFile.has(lavoro.file) && perFile.get(lavoro.file) !== lavoro.url) throw new Error(`Nome di file doppio: ${lavoro.file}`)
  perFile.set(lavoro.file, lavoro.url)
}

mkdirSync(join(PUBBLICA, 'immagini', 'carte'), { recursive: true })
mkdirSync(join(PUBBLICA, 'immagini', 'set'), { recursive: true })
const daFare = lavori.filter((l) => !existsSync(join(PUBBLICA, l.file)))
const errori = []
let fatti = 0
const lavora = async () => {
  for (let lavoro = daFare.shift(); lavoro; lavoro = daFare.shift()) {
    try {
      const originale = await scarica(lavoro.url)
      const webp = await sharp(originale)
        .resize({ width: LARGHEZZA[lavoro.tipo], withoutEnlargement: true })
        .webp({ quality: lavoro.tipo === 'carta' ? 75 : 90 })
        .toBuffer()
      writeFileSync(join(PUBBLICA, lavoro.file), webp)
    } catch (errore) {
      errori.push(`${lavoro.url}: ${errore.message}`)
    }
    process.stderr.write(`\rimmagini scaricate: ${++fatti}`)
  }
}
await Promise.all(Array.from({ length: IN_PARALLELO }, lavora))
process.stderr.write('\n')

// nel file solo i percorsi delle immagini davvero presenti: quelle che non si scaricano (404: sparite già dai loro
// server, es. le McDonald's 2014) restano fuori, e la carta mostra il segnaposto
const presente = (file) => existsSync(join(PUBBLICA, file))
const ordinato = (oggetto) => Object.fromEntries(Object.entries(oggetto).sort(([a], [b]) => a.localeCompare(b)))
const soloPresenti = (mappa) => ordinato(Object.fromEntries(Object.entries(mappa).filter(([, file]) => presente(file))))
abbinamento.riserve = soloPresenti(riserve)
abbinamento.riserveVecchie = soloPresenti(riserveVecchie)
abbinamento.simboli = soloPresenti(simboli)
abbinamento.loghi = soloPresenti(loghi)
writeFileSync(ABBINAMENTO, JSON.stringify(abbinamento, null, 1) + '\n', 'utf8')

const peso = [...perFile.keys()].filter(presente).reduce((tot, file) => tot + statSync(join(PUBBLICA, file)).size, 0)
console.log(`riserve: ${Object.keys(abbinamento.riserve).length}, carte con l'id vecchio: ${Object.keys(abbinamento.riserveVecchie).length}`)
console.log(`simboli: ${Object.keys(abbinamento.simboli).length}, loghi: ${Object.keys(abbinamento.loghi).length}`)
console.log(`peso totale: ${(peso / 1024 / 1024).toFixed(1)} MB`)
console.log(`errori (${errori.length}): ${errori.slice(0, 10).join('\n')}`)
