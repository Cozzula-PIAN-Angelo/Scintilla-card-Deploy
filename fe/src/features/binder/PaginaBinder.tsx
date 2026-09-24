import type { CSSProperties } from 'react'
import type { Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { griglia } from './aspetto'
import { Tasca } from './Tasca'

interface Props {
  numero: number
  tasche: number
  // carte della pagina per posizione
  carte: Map<number, Oggetto>
  // lato del libro: la rilegatura sta verso il centro
  lato: 'sinistra' | 'destra'
  // durante il giro di pagina le facce sono solo da guardare
  inerte?: boolean
}

// geometria della griglia delle tasche, in cqw (larghezza della pagina): la usano sia la griglia
// sia le cuciture, che così cadono sempre a metà degli spazi tra le tasche
const SPAZIO = 2.2
const MARGINE = 3.2
const MARGINE_BASSO = 1

// foglio di tasche dentro la cornice colorata del binder
export function PaginaBinder({ numero, tasche, carte, lato, inerte = false }: Props) {
  const { colonne, righe } = griglia(tasche)

  return (
    <div
      inert={inerte}
      className={cn(
        '@container trama-telata relative flex h-full w-full flex-col shadow-[inset_0_0_12px_rgb(0_0_0/0.5)]',
        lato === 'sinistra' ? 'rounded-l-[1cqw] rounded-r-[0.3cqw]' : 'rounded-l-[0.3cqw] rounded-r-[1cqw]',
      )}
    >
      {/* ombra della rilegatura */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 w-[7%] from-black/45 to-transparent',
          lato === 'sinistra' ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r',
        )}
      />
      <div
        className="relative grid min-h-0 flex-1"
        style={{
          gap: `${SPAZIO}cqw`,
          padding: `${MARGINE}cqw ${MARGINE}cqw ${MARGINE_BASSO}cqw`,
          gridTemplateColumns: `repeat(${colonne}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${righe}, minmax(0, 1fr))`,
        }}
      >
        <Cuciture colonne={colonne} righe={righe} />
        {Array.from({ length: tasche }, (_, posizione) => (
          <Tasca key={posizione} pagina={numero} posizione={posizione} oggetto={carte.get(posizione) ?? null} />
        ))}
      </div>
      <p className={cn('px-[4cqw] pb-[1.6cqw] text-[2.6cqw] font-semibold text-white/35', lato === 'sinistra' ? 'text-left' : 'text-right')}>
        {numero + 1}
      </p>
    </div>
  )
}

// Tasche a caricamento laterale: si aprono a destra, quelle dell'ultima colonna a sinistra.
// Dal lato dell'apertura entra la carta, quindi lì non c'è cucitura
function apertura(colonna: number, colonne: number): 'sinistra' | 'destra' {
  return colonna === colonne - 1 ? 'sinistra' : 'destra'
}

// --- cuciture ------------------------------------------------------------------------------
// Ogni punto è un filo in rilievo: arrotondato, chiaro al centro e scuro ai lati, con l'ombra
// sotto e i forellini dove entra nella tela. Lunghezze e allineamento variano di poco tra un
// punto e l'altro, come in una cucitura vera; il motivo (5 punti) si ripete lungo la cucitura

// larghezza del filo e passo del motivo, in cqw; il disegno è in unità 10 × 80
const LARGHEZZA_FILO = 0.8
const PASSO = LARGHEZZA_FILO * 8
// larghezza del solco nella tela, centrato sulla cucitura
const SPESSORE = 1.6

const PUNTI = [
  { lunghezza: 11, scarto: 0 },
  { lunghezza: 12.5, scarto: 0.3 },
  { lunghezza: 10.5, scarto: -0.25 },
  { lunghezza: 12, scarto: 0.15 },
  { lunghezza: 11.5, scarto: -0.3 },
]

function disegnoPunti(verticale: boolean) {
  const vuoto = (80 - PUNTI.reduce((totale, punto) => totale + punto.lunghezza, 0)) / PUNTI.length
  let y = vuoto / 2
  const punti = PUNTI.map(({ lunghezza, scarto }) => {
    const punto =
      `<g transform='translate(${scarto} ${y})'>` +
      `<rect x='3.9' y='0.9' width='3.4' height='${lunghezza}' rx='1.7' fill='#000' opacity='0.6' filter='url(#o)'/>` +
      `<circle cx='5' cy='-0.7' r='0.8' fill='#000' opacity='0.6'/>` +
      `<circle cx='5' cy='${lunghezza + 0.7}' r='0.8' fill='#000' opacity='0.6'/>` +
      `<rect x='3.3' y='0' width='3.4' height='${lunghezza}' rx='1.7' fill='url(#f)'/>` +
      `</g>`
    y += lunghezza + vuoto
    return punto
  }).join('')
  const definizioni =
    "<defs><linearGradient id='f' x1='0' x2='1' y1='0' y2='0'>" +
    "<stop offset='0' stop-color='#1d1f24'/><stop offset='0.4' stop-color='#6f737d'/>" +
    "<stop offset='0.58' stop-color='#9296a0'/><stop offset='1' stop-color='#24262c'/></linearGradient>" +
    "<filter id='o' x='-50%' y='-20%' width='200%' height='140%'><feGaussianBlur stdDeviation='0.6'/></filter></defs>"
  // orizzontale: stesso disegno con x e y scambiati, così luce e ombra restano coerenti
  const svg = verticale
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='80' viewBox='0 0 10 80'>${definizioni}${punti}</svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='10' viewBox='0 0 80 10'>${definizioni}<g transform='matrix(0 1 1 0 0 0)'>${punti}</g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const PUNTI_VERTICALI = disegnoPunti(true)
const PUNTI_ORIZZONTALI = disegnoPunti(false)

function stileCucitura(verticale: boolean): CSSProperties {
  const trasversale = verticale ? 'to right' : 'to bottom'
  return {
    position: 'absolute',
    background: [
      // punti del filo
      `${verticale ? PUNTI_VERTICALI : PUNTI_ORIZZONTALI} center / ${verticale ? `${LARGHEZZA_FILO}cqw ${PASSO}cqw repeat-y` : `${PASSO}cqw ${LARGHEZZA_FILO}cqw repeat-x`}`,
      // la tela si rialza appena ai lati della cucitura...
      `linear-gradient(${trasversale}, transparent 8%, rgb(255 255 255 / 0.04) 18%, transparent 32% 68%, rgb(255 255 255 / 0.04) 82%, transparent 92%)`,
      // ...e affonda al centro, con un solco morbido
      `linear-gradient(${trasversale}, transparent 15%, rgb(0 0 0 / 0.22) 38%, rgb(0 0 0 / 0.32) 50%, rgb(0 0 0 / 0.22) 62%, transparent 85%)`,
    ].join(', '),
    ...(verticale ? { width: `${SPESSORE}cqw` } : { height: `${SPESSORE}cqw` }),
  }
}

// Cuciture che chiudono le tasche: lungo il bordo del blocco e a metà di ogni spazio tra
// colonne e righe. Le colonne si misurano in cqw; le righe dipendono dall'altezza della pagina,
// quindi in calc() con la percentuale dell'altezza della griglia
function Cuciture({ colonne, righe }: { colonne: number; righe: number }) {
  // niente code da virgola mobile nel CSS (1 - 1.1 = -0.10000000000000009)
  const n = (valore: number) => Number(valore.toFixed(3))
  const meta = SPAZIO / 2
  const colonna = (100 - 2 * MARGINE - (colonne - 1) * SPAZIO) / colonne
  const riga = `((100% - ${n(MARGINE + MARGINE_BASSO)}cqw - ${n((righe - 1) * SPAZIO)}cqw) / ${righe})`

  // centri delle cuciture verticali (cqw): una per confine tra colonne, bordi compresi, tranne
  // dove una delle due tasche vicine ha l'apertura
  const verticali = [
    MARGINE - meta,
    ...Array.from({ length: colonne - 1 }, (_, i) => MARGINE + (i + 1) * colonna + i * SPAZIO + meta),
    100 - MARGINE + meta,
  ]
    .map(n)
    .filter((_, confine) => {
      const apertaVersoQui = confine > 0 && apertura(confine - 1, colonne) === 'destra'
      const apertaDaQui = confine < colonne && apertura(confine, colonne) === 'sinistra'
      return !apertaVersoQui && !apertaDaQui
    })
  // centri delle cuciture orizzontali (espressioni CSS)
  const orizzontali = [
    `${n(MARGINE - meta)}cqw`,
    ...Array.from({ length: righe - 1 }, (_, j) => `calc(${MARGINE}cqw + ${j + 1} * ${riga} + ${n(j * SPAZIO + meta)}cqw)`),
    `calc(100% + ${n(meta - MARGINE_BASSO)}cqw)`,
  ]
  const alto = `${n(MARGINE - meta)}cqw`
  const basso = `${n(MARGINE_BASSO - meta)}cqw`

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {verticali.map((x) => (
        <div key={`v${x}`} style={{ ...stileCucitura(true), left: `${n(x - SPESSORE / 2)}cqw`, top: alto, bottom: basso }} />
      ))}
      {orizzontali.map((y) => (
        <div
          key={`o${y}`}
          style={{ ...stileCucitura(false), top: `calc(${y} - ${SPESSORE / 2}cqw)`, left: alto, right: alto }}
        />
      ))}
    </div>
  )
}
