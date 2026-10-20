// Regole con cui genera-abbinamento.mjs abbina i set e le carte di pokemontcg.io a quelli di TCGdex.
// Funzioni pure, testate in abbinamento-regole.test.mjs
// Verificato il 2026-10-20: i simboli dei set di TCGdex (assets.tcgdex.net/univ/.../symbol.png) rispondono 400;
// fuori da TCG Pocket nessun id di set ha maiuscole o caratteri fuori da [a-z0-9.-]

// set che data, totale e nome non abbinano: date diverse di un mese (trainer kit), nomi e totali diversi
export const SET_A_MANO = {
  cel25c: 'cel25cc',
  tk1a: 'tk-ex-latia',
  tk1b: 'tk-ex-latio',
  tk2a: 'tk-ex-p',
  tk2b: 'tk-ex-m',
  svp: 'svp',
  sve: 'sve',
}

// numero confrontabile tra le due fonti (pokemontcg.io "6", TCGdex "006"; sigle come "TG01" o "SV001" scritte
// a volte con zeri diversi): maiuscolo e via gli zeri davanti alla parte in cifre. TCGdex codifica alcuni
// localId ("%3F" per la Unown "?")
export function normalizzaNumero(numero) {
  return decodeURIComponent(String(numero)).toUpperCase().replace(/^([A-Z]*)0+(?=\d)/, '$1')
}

// set di pokemontcg.io le cui carte con lettere stanno in un altro set di TCGdex: le Unown A-Z, ! e ? di
// Unseen Forces (ex10) sono nel set exu
export const NUMERI_ALTROVE = { ex10: 'exu' }

// set che numerano le stesse carte in modo diverso (pokemontcg.io "15_A1" e "4", numero della carta originale;
// TCGdex "CC001" e "001"): le carte si abbinano solo per nome, il numero porterebbe su un'altra carta
export const SET_PER_NOME = new Set(['cel25c', 'me55c'])

// vecchie e nuove: carte {id, name} di due set abbinati; usate: id nuovi già presi. Solo i nomi che compaiono una
// volta sola tra le vecchie e una sola tra le nuove libere: un doppione resterebbe un'ipotesi
export function abbinaPerNome(vecchie, nuove, usate) {
  const conta = (carte) => carte.reduce((m, c) => m.set(nomeConfrontabile(c.name), (m.get(nomeConfrontabile(c.name)) ?? 0) + 1), new Map())
  const libere = nuove.filter((c) => !usate.has(c.id))
  const nomiVecchi = conta(vecchie)
  const nomiNuovi = conta(libere)
  const abbinate = new Map()
  for (const vecchia of vecchie) {
    const nome = nomeConfrontabile(vecchia.name)
    if (nomiVecchi.get(nome) !== 1 || nomiNuovi.get(nome) !== 1) continue
    abbinate.set(vecchia.id, libere.find((c) => nomeConfrontabile(c.name) === nome).id)
  }
  return abbinate
}

// le due fonti scrivono in modo diverso lo stesso nome: "Mewtwo-EX" / "Mewtwo EX", "★" / "☆", "Gardevoir ex δ"
function nomeConfrontabile(nome) {
  return String(nome ?? '').toLowerCase().replaceAll('★', '☆').replaceAll('δ', '').replaceAll('-', ' ')
    .replace(/\s+/g, ' ').trim()
}

const nome = (s) => s.name.trim().toLowerCase()

// vecchi: set di pokemontcg.io (releaseDate "2023/09/22", total); nuovi: set di TCGdex (releaseDate "2023-09-22",
// cardCount.total). Stesso giorno e stesso totale; a parità, stesso nome; altrimenti stesso nome in tutto l'elenco;
// per ultimi i set a mano
export function abbinaSet(vecchi, nuovi) {
  const abbinati = new Map()
  const mancanti = []
  const idNuovi = new Set(nuovi.map((s) => s.id))
  for (const vecchio of vecchi) {
    const data = vecchio.releaseDate.replaceAll('/', '-')
    let candidati = nuovi.filter((s) => s.releaseDate === data && s.cardCount?.total === vecchio.total)
    if (candidati.length > 1) candidati = candidati.filter((s) => nome(s) === nome(vecchio))
    if (candidati.length !== 1) candidati = nuovi.filter((s) => nome(s) === nome(vecchio))
    if (candidati.length === 1) abbinati.set(vecchio.id, candidati[0].id)
    else if (idNuovi.has(SET_A_MANO[vecchio.id])) abbinati.set(vecchio.id, SET_A_MANO[vecchio.id])
    else mancanti.push(vecchio.id)
  }
  return { abbinati, mancanti }
}
