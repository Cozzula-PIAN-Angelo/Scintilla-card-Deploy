import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Palette, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { SimboloSet } from '../../components/SimboloSet'
import { cn } from '../../utils/cn'
import { normalizza } from '../artisti/artisti'
import { useGetArtistiQuery } from '../artisti/artistiApi'
import { useGetEspansioniQuery } from '../espansioni/espansioniApi'
import { cerca, type Risultato } from './ricerca'

// "/" apre la ricerca da qualunque pagina, se non si sta già scrivendo; Ctrl+K (⌘K sul Mac) sempre.
// Con un'altra finestra aperta (modale, dettaglio carta) niente: la ricerca le finirebbe sopra
export function useScorciatoiaRicerca(apri: () => void) {
  const apriRef = useRef(apri)
  apriRef.current = apri

  useEffect(() => {
    function tasto(evento: globalThis.KeyboardEvent) {
      const comando = (evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k'
      const barra = evento.key === '/' && !evento.ctrlKey && !evento.metaKey && !evento.altKey
      if (!comando && !barra) return
      const bersaglio = evento.target as HTMLElement | null
      const scrivendo = bersaglio?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(bersaglio?.tagName ?? '')
      if ((barra && scrivendo) || document.querySelector('[aria-modal="true"]')) return
      evento.preventDefault()
      apriRef.current()
    }
    document.addEventListener('keydown', tasto)
    return () => document.removeEventListener('keydown', tasto)
  }, [])
}

// bottone nella navbar: da telefono a xl solo la lente, da 2xl un campo finto con la scorciatoia (corto: con
// l'etichetta intera la barra uscirebbe dallo schermo a 1536 px)
export function PulsanteRicerca({ onApri }: { onApri: () => void }) {
  return (
    <button
      type="button"
      onClick={onApri}
      aria-haspopup="dialog"
      aria-keyshortcuts="/ Control+K"
      aria-label="Cerca set, Pokémon e illustratori"
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10',
        '2xl:flex 2xl:h-10 2xl:w-auto 2xl:gap-2.5 2xl:bg-white/8 2xl:pl-3.5 2xl:pr-2 2xl:text-sm 2xl:text-white/80 2xl:ring-1 2xl:ring-white/15 2xl:hover:bg-white/14 2xl:hover:text-white',
      )}
    >
      <Search aria-hidden className="size-5 2xl:size-4" />
      <span className="hidden pr-6 2xl:inline">Cerca</span>
      <kbd className="hidden rounded-md px-1.5 font-sans text-xs font-semibold ring-1 ring-white/30 2xl:inline">/</kbd>
    </button>
  )
}

interface Props {
  aperto: boolean
  onChiudi: () => void
}

// Ricerca unica della navbar: set, Pokémon e artisti in un solo campo. Le frecce scelgono, Invio apre,
// Esc chiude. Set e artisti si chiedono al backend solo all'apertura (poi restano in cache)
export function RicercaGlobale({ aperto, onChiudi }: Props) {
  return createPortal(<AnimatePresence>{aperto && <PannelloRicerca onChiudi={onChiudi} />}</AnimatePresence>, document.body)
}

function PannelloRicerca({ onChiudi }: { onChiudi: () => void }) {
  const [testo, setTesto] = useState('')
  const [scelta, setScelta] = useState(0)
  const { data: espansioni = [] } = useGetEspansioniQuery()
  const { data: artisti = [] } = useGetArtistiQuery()
  const navigate = useNavigate()
  const idLista = useId()
  const campo = useRef<HTMLInputElement>(null)
  const chiudi = useRef<HTMLButtonElement>(null)
  const chiudiRef = useRef(onChiudi)
  chiudiRef.current = onChiudi

  const gruppi = useMemo(() => cerca(testo, espansioni, artisti), [testo, espansioni, artisti])
  const righe = useMemo(() => gruppi.flatMap((gruppo) => gruppo.risultati), [gruppi])
  // indice della prima riga di ogni gruppo nella lista piatta (quella delle frecce)
  const inizi = gruppi.map((_, i) => gruppi.slice(0, i).reduce((somma, gruppo) => somma + gruppo.risultati.length, 0))
  const filtro = normalizza(testo.trim())

  // come Modale: pagina ferma sotto, focus al campo e, alla chiusura, di nuovo al bottone che l'ha aperta
  useEffect(() => {
    const elementoPrecedente = document.activeElement as HTMLElement | null
    const overflowPrecedente = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    campo.current?.focus({ preventScroll: true })
    const tasto = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') chiudiRef.current()
    }
    document.addEventListener('keydown', tasto)
    return () => {
      document.removeEventListener('keydown', tasto)
      document.body.style.overflow = overflowPrecedente
      elementoPrecedente?.focus({ preventScroll: true })
    }
  }, [])

  // la riga scelta resta in vista quando le frecce la portano fuori dalla lista
  useEffect(() => {
    document.getElementById(`${idLista}-${scelta}`)?.scrollIntoView({ block: 'nearest' })
  }, [scelta, idLista])

  function scrivi(valore: string) {
    setTesto(valore)
    setScelta(0)
  }

  function apri(risultato: Risultato | undefined) {
    if (!risultato) return
    onChiudi()
    navigate(risultato.a)
  }

  function tastiCampo(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (!righe.length) return
      const passo = evento.key === 'ArrowDown' ? 1 : -1
      setScelta((s) => (s + passo + righe.length) % righe.length)
    } else if (evento.key === 'Enter') {
      evento.preventDefault()
      apri(righe[scelta])
    }
  }

  // il focus resta nel pannello: Tab passa dal campo alla X e ritorno
  function tastiPannello(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'Tab') return
    evento.preventDefault()
    ;(document.activeElement === campo.current ? chiudi : campo).current?.focus()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6 sm:pt-[12vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      <div aria-hidden className="fixed inset-0 bg-ombra/70 backdrop-blur-sm" onClick={onChiudi} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Cerca set, Pokémon e illustratori"
        onKeyDown={tastiPannello}
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
        exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
        className="relative flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-superficie shadow-2xl shadow-ombra/40"
      >
        <div className="flex items-center gap-3 border-b border-linea/10 py-2 pl-5 pr-2">
          <Search aria-hidden className="size-5 shrink-0 text-testo-2" />
          <input
            ref={campo}
            type="text"
            value={testo}
            onChange={(evento) => scrivi(evento.target.value)}
            onKeyDown={tastiCampo}
            placeholder="Cerca un set, un Pokémon o un illustratore"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            role="combobox"
            aria-expanded={righe.length > 0}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={righe.length ? `${idLista}-${scelta}` : undefined}
            className="min-w-0 flex-1 bg-transparent py-2 text-lg text-testo outline-none placeholder:text-testo-2"
          />
          <button
            ref={chiudi}
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi la ricerca"
            className="grid size-10 shrink-0 place-items-center rounded-full text-testo-2 transition-colors hover:bg-tenue"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div id={idLista} role="listbox" aria-label="Risultati" className="min-h-0 overflow-y-auto overscroll-contain p-2">
          {gruppi.map((gruppo, g) => (
            <div key={gruppo.titolo} role="group" aria-labelledby={`${idLista}-g${g}`}>
              <p id={`${idLista}-g${g}`} className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-testo-2">
                {gruppo.titolo}
              </p>
              {gruppo.risultati.map((risultato, r) => {
                const indice = inizi[g] + r
                const attiva = indice === scelta
                return (
                  <div
                    key={risultato.a}
                    id={`${idLista}-${indice}`}
                    role="option"
                    aria-selected={attiva}
                    onPointerMove={() => setScelta(indice)}
                    onClick={() => apri(risultato)}
                    className={cn('flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2', attiva && 'bg-tenue ring-1 ring-linea/10')}
                  >
                    <Miniatura risultato={risultato} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-testo">
                        <Evidenziato testo={risultato.nome} filtro={filtro} />
                      </span>
                      <span className="block truncate text-sm text-testo-2">{risultato.dettaglio}</span>
                    </span>
                    {attiva && <CornerDownLeft aria-hidden className="hidden size-4 shrink-0 text-testo-2 sm:block" />}
                  </div>
                )
              })}
            </div>
          ))}

          {!righe.length && (
            <p className="px-4 py-8 text-center text-testo-2">
              {filtro ? (
                <>
                  Nessun risultato per «{testo.trim()}».
                  <br />I nomi dei set sono in inglese, come su TCGdex.
                </>
              ) : (
                'Scrivi il nome di un set, di un Pokémon o di un illustratore.'
              )}
            </p>
          )}
        </div>

        <div className="hidden gap-5 border-t border-linea/10 px-5 py-2.5 text-xs text-testo-2 sm:flex">
          <span>
            <Tasto>↑</Tasto> <Tasto>↓</Tasto> per scegliere
          </span>
          <span>
            <Tasto>Invio</Tasto> per aprire
          </span>
          <span>
            <Tasto>Esc</Tasto> per chiudere
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Tasto({ children }: { children: string }) {
  return <kbd className="rounded-md px-1.5 py-px font-sans font-semibold ring-1 ring-linea/25">{children}</kbd>
}

// la parte del nome che corrisponde al testo, evidenziata in giallo. Solo se il confronto senza accenti non
// cambia la lunghezza del nome (quasi sempre), sennò le posizioni non tornerebbero
function Evidenziato({ testo, filtro }: { testo: string; filtro: string }) {
  const pulito = normalizza(testo)
  const inizio = filtro ? pulito.indexOf(filtro) : -1
  if (inizio < 0 || pulito.length !== testo.length) return <>{testo}</>
  const fine = inizio + filtro.length
  return (
    <>
      {testo.slice(0, inizio)}
      <mark className="rounded-sm bg-giallo-400/45 text-inherit">{testo.slice(inizio, fine)}</mark>
      {testo.slice(fine)}
    </>
  )
}

// simbolo del set, sprite del Pokémon o ritaglio dell'illustrazione dell'artista (come AvatarArtista)
function Miniatura({ risultato }: { risultato: Risultato }) {
  const { tipo, immagine } = risultato
  if (tipo === 'artista') {
    return (
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-tenue ring-1 ring-linea/10">
        {immagine ? (
          <img src={immagine} alt="" loading="lazy" decoding="async" className="size-full origin-[50%_28%] scale-[2] object-cover object-[50%_28%]" />
        ) : (
          <Palette aria-hidden className="size-5 text-testo-2" />
        )}
      </span>
    )
  }
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tenue">
      {tipo === 'set' ? (
        <SimboloSet src={immagine} className="max-h-6 max-w-6" />
      ) : (
        <img src={immagine ?? undefined} alt="" loading="lazy" decoding="async" width={96} height={96} className="size-10 [image-rendering:pixelated]" />
      )}
    </span>
  )
}
