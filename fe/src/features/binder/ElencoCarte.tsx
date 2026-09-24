import { ChevronLeft, ChevronRight, Heart, Search } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Skeleton } from '../../components/Skeleton'
import { useDebounce } from '../../hooks/useDebounce'
import type { Oggetto, Pagina } from '../../types/api'
import { cn } from '../../utils/cn'
import { useGetPreferitiQuery } from '../preferiti/preferitiApi'
import { useCercaCarteQuery } from './binderApi'
import { TIPO_TRASCINAMENTO } from './contesto'

type Scheda = 'preferiti' | 'catalogo'

interface Props {
  onScegli: (oggetto: Oggetto) => void
  // id della carta evidenziata (in mano, o già scelta come copertina)
  selezionata?: string | null
  // nel cassetto del binder le carte si possono anche trascinare
  onTrascina?: (oggetto: Oggetto) => void
  onFineTrascinamento?: () => void
  colonne?: string
}

const PER_PAGINA = 24

// carte da cui pescare: i preferiti (scorciatoia) oppure tutto il catalogo, cercando per nome
export function ElencoCarte({ onScegli, selezionata, onTrascina, onFineTrascinamento, colonne = 'grid-cols-3' }: Props) {
  const [scheda, setScheda] = useState<Scheda>('preferiti')
  const [testo, setTesto] = useState('')
  const [paginaPreferiti, setPaginaPreferiti] = useState(0)
  const [paginaCatalogo, setPaginaCatalogo] = useState(0)
  const ricerca = useDebounce(testo.trim(), 300)

  const preferiti = useGetPreferitiQuery(
    { page: paginaPreferiti, size: PER_PAGINA, sort: 'createdAt,desc' },
    { skip: scheda !== 'preferiti' },
  )
  const catalogo = useCercaCarteQuery({ q: ricerca, page: paginaCatalogo }, { skip: scheda !== 'catalogo' })

  const attiva = scheda === 'preferiti' ? preferiti : catalogo
  const pagina: Pagina<Oggetto> | undefined =
    scheda === 'preferiti' && preferiti.data
      ? { ...preferiti.data, content: preferiti.data.content.map((p) => p.oggetto) }
      : scheda === 'catalogo'
        ? catalogo.data
        : undefined
  const numeroPagina = scheda === 'preferiti' ? paginaPreferiti : paginaCatalogo
  const cambiaPagina = scheda === 'preferiti' ? setPaginaPreferiti : setPaginaCatalogo

  function iniziaTrascinamento(evento: DragEvent, oggetto: Oggetto) {
    evento.dataTransfer.setData(TIPO_TRASCINAMENTO, oggetto.id)
    evento.dataTransfer.setData('text/plain', oggetto.nome)
    evento.dataTransfer.effectAllowed = 'copy'
    onTrascina?.(oggetto)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div role="tablist" aria-label="Da dove prendere le carte" className="grid grid-cols-2 gap-1 rounded-full bg-tenue p-1">
        {(['preferiti', 'catalogo'] as const).map((valore) => (
          <button
            key={valore}
            type="button"
            role="tab"
            aria-selected={scheda === valore}
            onClick={() => setScheda(valore)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition-colors',
              scheda === valore ? 'bg-superficie text-testo shadow-sm' : 'text-testo-2 hover:text-testo',
            )}
          >
            {valore === 'preferiti' ? <Heart aria-hidden className="size-4" /> : <Search aria-hidden className="size-4" />}
            {valore === 'preferiti' ? 'Preferiti' : 'Catalogo'}
          </button>
        ))}
      </div>

      {scheda === 'catalogo' && (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accento" />
          <input
            type="search"
            value={testo}
            onChange={(evento) => {
              setTesto(evento.target.value)
              setPaginaCatalogo(0)
            }}
            placeholder="Cerca una carta per nome…"
            aria-label="Cerca una carta per nome"
            className="w-full rounded-full bg-tenue py-2 pl-9 pr-4 text-sm text-testo outline-none placeholder:text-testo/50 focus:ring-2 focus:ring-blu-500"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {attiva.isLoading ? (
          <div className={cn('grid gap-2', colonne)}>
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="aspect-[63/88] rounded-lg" />
            ))}
          </div>
        ) : attiva.isError ? (
          <p role="alert" className="py-6 text-center text-sm text-errore">
            {messaggioErrore(attiva.error, 'Non è stato possibile caricare le carte.')}
          </p>
        ) : pagina && pagina.content.length > 0 ? (
          <ul className={cn('grid gap-2 transition-opacity', colonne, attiva.isFetching && 'opacity-60')}>
            {pagina.content.map((oggetto) => (
              <li key={oggetto.id}>
                <button
                  type="button"
                  onClick={() => onScegli(oggetto)}
                  draggable={onTrascina !== undefined}
                  onDragStart={(evento) => iniziaTrascinamento(evento, oggetto)}
                  onDragEnd={onFineTrascinamento}
                  aria-pressed={selezionata === oggetto.id}
                  title={oggetto.nome}
                  className={cn(
                    'block w-full overflow-hidden rounded-lg ring-1 ring-linea/10 transition hover:-translate-y-0.5 hover:shadow-lg',
                    onTrascina && 'cursor-grab active:cursor-grabbing',
                    selezionata === oggetto.id && 'ring-4 ring-giallo-400',
                  )}
                >
                  <img
                    src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl ?? ''}
                    alt={oggetto.nome}
                    loading="lazy"
                    draggable={false}
                    className="aspect-[63/88] w-full bg-tenue object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-6 text-center text-sm text-testo/70">
            {scheda === 'preferiti'
              ? 'Non hai ancora carte tra i preferiti: cercale nel catalogo.'
              : 'Nessuna carta trovata. Qui compaiono le carte già nel catalogo: se ne manca una, apri prima la sua espansione.'}
          </p>
        )}
      </div>

      {pagina && pagina.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => cambiaPagina(numeroPagina - 1)}
            disabled={numeroPagina === 0}
            aria-label="Carte precedenti"
            className="grid size-9 place-items-center rounded-full text-testo-2 hover:bg-tenue disabled:opacity-40"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <span className="font-medium text-testo/70">
            {numeroPagina + 1} / {pagina.totalPages}
          </span>
          <button
            type="button"
            onClick={() => cambiaPagina(numeroPagina + 1)}
            disabled={numeroPagina + 1 >= pagina.totalPages}
            aria-label="Carte successive"
            className="grid size-9 place-items-center rounded-full text-testo-2 hover:bg-tenue disabled:opacity-40"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      )}
    </div>
  )
}
