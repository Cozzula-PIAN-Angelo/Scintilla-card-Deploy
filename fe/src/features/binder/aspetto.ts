import type { CSSProperties } from 'react'
import type { MotivoBinder } from '../../types/api'

// colori proposti per la copertina; si può sceglierne anche uno libero
export const COLORI_BINDER = [
  { nome: 'Blu Scintilla', valore: '#2a75bb' },
  { nome: 'Notte', valore: '#1d2359' },
  { nome: 'Rosso', valore: '#c8332b' },
  { nome: 'Smeraldo', valore: '#1f8a5b' },
  { nome: 'Viola', valore: '#6b3fa0' },
  { nome: 'Rosa', valore: '#d24f86' },
  { nome: 'Arancio', valore: '#e0782b' },
  { nome: 'Oro', valore: '#c9971a' },
  { nome: 'Azzurro', valore: '#2f9fc4' },
  { nome: 'Grafite', valore: '#363b47' },
]

export const FORMATI_TASCHE = [
  { tasche: 4, etichetta: '4 tasche', dettaglio: '2 × 2' },
  { tasche: 9, etichetta: '9 tasche', dettaglio: '3 × 3' },
  { tasche: 12, etichetta: '12 tasche', dettaglio: '4 × 3' },
]

export const PAGINE_MIN = 2
export const PAGINE_MAX = 60

export function griglia(tasche: number) {
  if (tasche === 4) return { colonne: 2, righe: 2 }
  if (tasche === 12) return { colonne: 4, righe: 3 }
  return { colonne: 3, righe: 3 }
}

// larghezza / altezza di una pagina: carte 63×88 mm, 6 mm tra le tasche e 10 di margine
export function proporzionePagina(tasche: number) {
  const { colonne, righe } = griglia(tasche)
  return (colonne * 63 + (colonne - 1) * 6 + 20) / (righe * 88 + (righe - 1) * 6 + 20)
}

// disegni in SVG ripetuti, bianchi e semitrasparenti: stanno bene su qualsiasi colore
function tessera(svg: string, lato: number) {
  const uri = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${lato}' height='${lato}'>${svg}</svg>`)}`
  return `url("${uri}")`
}

const STELLA = (x: number, y: number, s: number, colore: string) =>
  `<polygon transform='translate(${x} ${y}) scale(${s})' fill='${colore}' points='0,-10 2.9,-3.1 9.5,-3.1 4.2,1.2 5.9,8.1 0,4 -5.9,8.1 -4.2,1.2 -9.5,-3.1 -2.9,-3.1'/>`

const MOTIVI: Record<MotivoBinder, { nome: string; sfondo?: string; dimensione?: string; classe?: string }> = {
  NESSUNO: { nome: 'Liscio' },
  STELLE: {
    nome: 'Stelle',
    sfondo: tessera(
      STELLA(14, 16, 0.9, 'rgba(255,255,255,0.32)') + STELLA(44, 42, 0.6, 'rgba(255,214,90,0.55)') + STELLA(46, 10, 0.35, 'rgba(255,255,255,0.4)'),
      60,
    ),
    dimensione: '60px 60px',
  },
  FULMINI: {
    nome: 'Fulmini',
    sfondo: tessera(
      "<polygon fill='rgba(255,255,255,0.26)' points='20,4 8,24 17,24 13,38 30,16 20,16 25,4'/>" +
        "<polygon fill='rgba(255,214,90,0.45)' transform='translate(30 28) scale(0.6)' points='20,4 8,24 17,24 13,38 30,16 20,16 25,4'/>",
      56,
    ),
    dimensione: '56px 56px',
  },
  POKEBALL: {
    nome: 'Sfere',
    sfondo: tessera(
      "<g fill='none' stroke='rgba(255,255,255,0.28)' stroke-width='3'><circle cx='20' cy='20' r='13'/><path d='M7 20h8M25 20h8'/><circle cx='20' cy='20' r='4.5'/></g>" +
        "<g fill='none' stroke='rgba(255,255,255,0.18)' stroke-width='2'><circle cx='52' cy='52' r='8'/><path d='M44 52h5M55 52h5'/><circle cx='52' cy='52' r='2.6'/></g>",
      64,
    ),
    dimensione: '64px 64px',
  },
  POIS: {
    nome: 'Pois',
    sfondo:
      'radial-gradient(circle, rgb(255 255 255 / 0.28) 22%, transparent 24%), radial-gradient(circle, rgb(255 255 255 / 0.16) 16%, transparent 18%)',
    dimensione: '26px 26px, 26px 26px',
  },
  // arcobaleno in theme.css (.motivo-olografico), mosso dalla stessa animazione dell'hero
  OLOGRAFICO: { nome: 'Olografico', classe: 'motivo-olografico animate-gradiente' },
}

export const ELENCO_MOTIVI = Object.keys(MOTIVI) as MotivoBinder[]

export function nomeMotivo(motivo: MotivoBinder) {
  return MOTIVI[motivo].nome
}

export function classeMotivo(motivo: MotivoBinder) {
  return MOTIVI[motivo].classe
}

export function stileMotivo(motivo: MotivoBinder): CSSProperties | undefined {
  const { sfondo, dimensione } = MOTIVI[motivo]
  if (!sfondo) return undefined
  // i pois sono sfalsati: il secondo strato parte a metà tessera
  return { backgroundImage: sfondo, backgroundSize: dimensione, backgroundPosition: motivo === 'POIS' ? '0 0, 13px 13px' : undefined }
}

// Angoli della copertina (e della tavola sotto): morbidi come nei binder imbottiti (tipo Vault X),
// un po' meno sul lato del dorso.
// In percentuale del riquadro, così copertina e tavola della stessa misura coincidono:
// la verticale si scala con la proporzione per avere angoli tondi e non ellittici
export const RAGGIO_ESTERNO = 5.5
const RAGGIO_DORSO = 2

export function angoli(lato: 'sinistra' | 'destra', proporzione: number) {
  const esterno = RAGGIO_ESTERNO
  const dorso = RAGGIO_DORSO
  const orizzontali = lato === 'destra' ? [dorso, esterno, esterno, dorso] : [esterno, dorso, dorso, esterno]
  const verticali = orizzontali.map((valore) => valore * proporzione)
  const percentuali = (valori: number[]) => valori.map((valore) => `${valore.toFixed(2)}%`).join(' ')
  return `${percentuali(orizzontali)} / ${percentuali(verticali)}`
}

// colore scurito per dorso, bordi e interno della copertina
export function scuro(colore: string, percentuale = 30) {
  return `color-mix(in srgb, ${colore}, #000 ${percentuale}%)`
}
