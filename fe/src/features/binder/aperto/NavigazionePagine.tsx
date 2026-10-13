import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  pagine: number
  doppia: boolean
  vista: number
  numeroViste: number
  aperto: boolean
  vaiA: (destinazione: number) => void
}

// frecce, etichetta della vista e scelta della pagina sotto il binder
export function NavigazionePagine({ pagine, doppia, vista, numeroViste, aperto, vaiA }: Props) {
  const primaPagina = doppia ? Math.max(0, 2 * vista - 1) : vista
  const etichettaVista = doppia
    ? vista === 0
      ? `Copertina · pagina 1`
      : 2 * vista < pagine
        ? `Pagine ${2 * vista} – ${2 * vista + 1}`
        : `Pagina ${2 * vista}`
    : `Pagina ${vista + 1}`

  return (
    <nav aria-label="Pagine del binder" className="flex shrink-0 items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => vaiA(vista - 1)}
        disabled={!aperto || vista === 0}
        aria-label="Pagina precedente"
        className="grid size-10 place-items-center rounded-full bg-superficie text-testo-2 shadow-md shadow-ombra/10 transition-colors hover:bg-tenue disabled:opacity-40"
      >
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <label className="flex items-center gap-2 text-sm font-semibold text-testo">
        <span className="sr-only">Vai alla pagina</span>
        <span aria-live="polite">{etichettaVista}</span>
        <select
          value={primaPagina}
          disabled={!aperto}
          onChange={(e) => {
            const pagina = Number(e.target.value)
            vaiA(doppia ? Math.floor((pagina + 1) / 2) : pagina)
          }}
          aria-label="Vai alla pagina"
          className="rounded-full bg-superficie px-3 py-1.5 text-sm text-testo shadow-sm ring-1 ring-linea/10 outline-none focus:ring-2 focus:ring-blu-500"
        >
          {Array.from({ length: pagine }, (_, p) => (
            <option key={p} value={p}>
              {p + 1}
            </option>
          ))}
        </select>
        <span className="font-medium text-testo/60">di {pagine}</span>
      </label>
      <button
        type="button"
        onClick={() => vaiA(vista + 1)}
        disabled={!aperto || vista >= numeroViste - 1}
        aria-label="Pagina successiva"
        className="grid size-10 place-items-center rounded-full bg-superficie text-testo-2 shadow-md shadow-ombra/10 transition-colors hover:bg-tenue disabled:opacity-40"
      >
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </nav>
  )
}
