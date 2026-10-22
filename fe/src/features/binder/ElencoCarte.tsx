import { Check, ChevronLeft, ChevronRight, Heart, Library, Search } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { messaggioErrore } from '../../app/errori'
import { ImmagineOPlaceholder } from '../../components/ImmagineCarta'
import { Skeleton } from '../../components/Skeleton'
import { useDebounce } from '../../hooks/useDebounce'
import type { Oggetto, Pagina } from '../../types/api'
import { cn } from '../../utils/cn'
import { useGetCartePosseduteQuery } from '../collezione/collezioneApi'
import { useGetPreferitiQuery } from '../preferiti/preferitiApi'
import { useCercaCatalogoQuery } from './binderApi'
import { TIPO_TRASCINAMENTO } from './contesto'

type Scheda = 'preferiti' | 'possedute' | 'catalogo'

const SCHEDE: { valore: Scheda; etichetta: string; icona: typeof Heart }[] = [
  { valore: 'preferiti', etichetta: 'Preferiti', icona: Heart },
  { valore: 'possedute', etichetta: 'Mie carte', icona: Library },
  { valore: 'catalogo', etichetta: 'Catalogo', icona: Search },
]

interface Props {
  onScegli: (oggetto: Oggetto) => void
  // id della carta evidenziata (in mano, o già scelta come copertina)
  selezionata?: string | null
  // nel cassetto del binder le carte si possono anche trascinare
  onTrascina?: (oggetto: Oggetto) => void
  onFineTrascinamento?: () => void
  // copie già nel binder aperto (id -> quante): le carte restano sceglibili, con un segno
  nelBinder?: ReadonlyMap<string, number>
  // carta appena messa nel binder con un tocco: il suo segno fa un piccolo "pop"
  appenaAggiunta?: string
  colonne?: string
}

const PER_PAGINA = 24

// carte da cui pescare: i preferiti (scorciatoia), quelle della collezione oppure tutto il catalogo; nelle ultime due
// si cerca per nome, con lo stesso testo
export function ElencoCarte({
  onScegli,
  selezionata,
  onTrascina,
  onFineTrascinamento,
  nelBinder,
  appenaAggiunta,
  colonne = 'grid-cols-3',
}: Props) {
  const [scheda, setScheda] = useState<Scheda>('preferiti')
  const [testo, setTesto] = useState('')
  const [paginaPreferiti, setPaginaPreferiti] = useState(0)
  const [paginaPossedute, setPaginaPossedute] = useState(0)
  const [paginaCatalogo, setPaginaCatalogo] = useState(0)
  const ricerca = useDebounce(testo.trim(), 300)

  const preferiti = useGetPreferitiQuery(
    { page: paginaPreferiti, size: PER_PAGINA, sort: 'createdAt,desc' },
    { skip: scheda !== 'preferiti' },
  )
  const possedute = useGetCartePosseduteQuery({ q: ricerca, page: paginaPossedute }, { skip: scheda !== 'possedute' })
  const catalogo = useCercaCatalogoQuery({ q: ricerca, page: paginaCatalogo }, { skip: scheda !== 'catalogo' })

  const attiva = scheda === 'preferiti' ? preferiti : scheda === 'possedute' ? possedute : catalogo
  const pagina: Pagina<Oggetto> | undefined =
    scheda === 'preferiti'
      ? preferiti.data && { ...preferiti.data, content: preferiti.data.content.map((p) => p.oggetto) }
      : scheda === 'possedute'
        ? possedute.data
        : catalogo.data
  const numeroPagina = { preferiti: paginaPreferiti, possedute: paginaPossedute, catalogo: paginaCatalogo }[scheda]
  const cambiaPagina = { preferiti: setPaginaPreferiti, possedute: setPaginaPossedute, catalogo: setPaginaCatalogo }[scheda]

  function iniziaTrascinamento(evento: DragEvent, oggetto: Oggetto) {
    evento.dataTransfer.setData(TIPO_TRASCINAMENTO, oggetto.id)
    evento.dataTransfer.setData('text/plain', oggetto.nome)
    evento.dataTransfer.effectAllowed = 'copy'
    onTrascina?.(oggetto)
  }

  return (
    // @container: nel cassetto laterale (16rem) le tre schede stanno solo senza icone
    <div className="@container flex h-full min-h-0 flex-col gap-3">
      <div role="tablist" aria-label="Da dove prendere le carte" className="grid grid-cols-3 gap-1 rounded-full bg-tenue p-1">
        {SCHEDE.map(({ valore, etichetta, icona: Icona }) => (
          <button
            key={valore}
            type="button"
            role="tab"
            aria-selected={scheda === valore}
            onClick={() => setScheda(valore)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold whitespace-nowrap transition-colors',
              scheda === valore ? 'bg-superficie text-testo shadow-sm' : 'text-testo-2 hover:text-testo',
            )}
          >
            <Icona aria-hidden className="hidden size-4 shrink-0 @[19rem]:block" />
            {etichetta}
          </button>
        ))}
      </div>

      {scheda !== 'preferiti' && (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accento" />
          <input
            type="search"
            value={testo}
            onChange={(evento) => {
              setTesto(evento.target.value)
              setPaginaPossedute(0)
              setPaginaCatalogo(0)
            }}
            placeholder={scheda === 'possedute' ? 'Cerca tra le tue carte…' : 'Cerca una carta per nome…'}
            aria-label={scheda === 'possedute' ? 'Cerca tra le tue carte per nome' : 'Cerca una carta per nome'}
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
            {pagina.content.map((oggetto) => {
              const copie = nelBinder?.get(oggetto.id) ?? 0
              const nota = copie === 0 ? '' : copie === 1 ? 'già nel binder' : `già nel binder (${copie})`
              return (
                <li key={oggetto.id}>
                  <button
                    type="button"
                    onClick={() => onScegli(oggetto)}
                    draggable={onTrascina !== undefined}
                    onDragStart={(evento) => iniziaTrascinamento(evento, oggetto)}
                    onDragEnd={onFineTrascinamento}
                    aria-pressed={selezionata === oggetto.id}
                    title={nota ? `${oggetto.nome} · ${nota}` : oggetto.nome}
                    className={cn(
                      'relative block w-full overflow-hidden rounded-lg ring-1 ring-linea/10 transition hover:-translate-y-0.5 hover:shadow-lg',
                      onTrascina && 'cursor-grab active:cursor-grabbing',
                      selezionata === oggetto.id && 'ring-4 ring-giallo-400',
                    )}
                  >
                    <ImmagineOPlaceholder
                      src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl}
                      nome={oggetto.nome}
                      alt={oggetto.nome}
                      loading="lazy"
                      draggable={false}
                      className="aspect-[63/88] w-full bg-tenue object-fill"
                    />
                    {copie > 0 && (
                      <span
                        // key sul numero: a ogni copia in più il segno si rimonta e rifà il pop
                        key={copie}
                        aria-hidden
                        className={cn(
                          'absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blu-900/90 px-1 text-[11px] font-bold text-white shadow ring-1 ring-white/40',
                          appenaAggiunta === oggetto.id && 'segno-pop',
                        )}
                      >
                        {copie === 1 ? <Check className="size-3" strokeWidth={3} /> : `×${copie}`}
                      </span>
                    )}
                    {nota && <span className="sr-only">, {nota}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-2 py-6 text-center text-sm text-testo/70">
            {scheda === 'preferiti'
              ? 'Non hai ancora carte tra i preferiti: cercale nel catalogo.'
              : scheda === 'possedute'
                ? ricerca
                  ? 'Nessuna delle tue carte ha questo nome.'
                  : 'Non hai ancora carte nella collezione: segnale dalle pagine dei set e dei Pokémon, o con "Ce l\'ho" nel binder.'
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
