import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useDebounce } from '../../hooks/useDebounce'
import type { Espansione } from '../../types/api'
import { cn } from '../../utils/cn'
import { raggruppaPerSerie } from './raggruppaPerSerie'

interface Props {
  espansioni: Espansione[]
  corrente: Espansione
  // passi di cronologia dalla vetrina alla pagina corrente (vedi EspansionePage)
  passiDallaVetrina: number | null
  className?: string
}

// elenco compatto di tutte le espansioni accanto alle carte: si passa da un set all'altro senza
// tornare alla vetrina. Aperta la serie del set corrente, le altre si aprono con un clic
export function ListaEspansioni({ espansioni, corrente, passiDallaVetrina, className }: Props) {
  const [ricerca, setRicerca] = useState('')
  const filtro = useDebounce(ricerca.trim().toLowerCase(), 200)
  const serieCorrente = corrente.serie || 'Altre'
  const [aperte, setAperte] = useState<Set<string>>(() => new Set([serieCorrente]))
  const contenitore = useRef<HTMLDivElement>(null)
  const voceCorrente = useRef<HTMLAnchorElement>(null)

  const serie = useMemo(() => raggruppaPerSerie(espansioni, filtro), [espansioni, filtro])

  // passando a un set di un'altra serie, anche quella si apre
  useEffect(() => {
    setAperte((prima) => (prima.has(serieCorrente) ? prima : new Set(prima).add(serieCorrente)))
  }, [serieCorrente])

  // la lista (non la pagina) scorre fino al set corrente, solo se non è già in vista:
  // cliccando una voce visibile la lista non deve saltare
  useEffect(() => {
    const lista = contenitore.current
    const voce = voceCorrente.current
    if (!lista || !voce) return
    const fuoriVista = voce.offsetTop < lista.scrollTop || voce.offsetTop + voce.offsetHeight > lista.scrollTop + lista.clientHeight
    if (fuoriVista) lista.scrollTop = voce.offsetTop - lista.clientHeight / 3
  }, [corrente.id])

  const apriChiudi = (nome: string) =>
    setAperte((prima) => {
      const dopo = new Set(prima)
      if (dopo.has(nome)) dopo.delete(nome)
      else dopo.add(nome)
      return dopo
    })

  return (
    <nav aria-label="Altre espansioni" className={cn('flex flex-col overflow-hidden rounded-3xl bg-superficie shadow-lg shadow-ombra/10', className)}>
      <div className="border-b border-linea/10 p-3">
        <label className="relative block">
          <span className="sr-only">Cerca un'espansione</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accento" />
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca un'espansione…"
            className="w-full rounded-full bg-tenue py-2 pl-9 pr-4 text-sm text-testo outline-none placeholder:text-testo/50 focus:ring-2 focus:ring-blu-500"
          />
        </label>
      </div>

      <div ref={contenitore} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {serie.length === 0 && <p className="px-3 py-6 text-center text-sm text-testo/60">Nessuna espansione trovata.</p>}
        {serie.map(({ nome, espansioni: gruppo }) => {
          // cercando si mostra tutto quello che corrisponde, senza dover aprire le serie
          const aperta = filtro !== '' || aperte.has(nome)
          return (
            <section key={nome} className="mb-1">
              <button
                type="button"
                onClick={() => apriChiudi(nome)}
                aria-expanded={aperta}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-testo transition-colors hover:bg-tenue"
              >
                <span className="truncate">{nome}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-testo/50">
                  {gruppo.length}
                  <ChevronDown aria-hidden className={cn('size-4 transition-transform', aperta && 'rotate-180')} />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {aperta && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {gruppo.map((espansione) => {
                      const attuale = espansione.id === corrente.id
                      return (
                        <li key={espansione.id}>
                          <Link
                            ref={attuale ? voceCorrente : undefined}
                            to={`/espansioni/${encodeURIComponent(espansione.id)}`}
                            state={{ passiDallaVetrina: passiDallaVetrina === null ? null : passiDallaVetrina + 1 }}
                            aria-current={attuale ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-2.5 rounded-xl py-1.5 pl-5 pr-3 text-sm transition-colors',
                              attuale ? 'bg-blu-500 font-semibold text-white' : 'text-testo/80 hover:bg-tenue hover:text-testo',
                            )}
                          >
                            <span className="grid size-5 shrink-0 place-items-center">
                              {espansione.simboloUrl && (
                                <img src={espansione.simboloUrl} alt="" loading="lazy" className="max-h-5 max-w-5 object-contain" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{espansione.nome}</span>
                            <span className={cn('shrink-0 text-xs', attuale ? 'text-white/80' : 'text-testo/40')}>
                              {espansione.dataUscita?.slice(0, 4)}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </section>
          )
        })}
      </div>
    </nav>
  )
}
