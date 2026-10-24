import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LoaderCircle, LogOut } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAppSelector } from '../app/hooks'
import { selectIsAdmin, selectToken, selectUtente } from '../features/auth/authSlice'
import { useLogout } from '../features/auth/useLogout'
import { useGetStatisticheQuery } from '../features/statistiche/statisticheApi'
import { cn } from '../utils/cn'
import { Avatar } from './Avatar'
import { LinkBottone } from './Button'
import { VOCE_ADMIN, VOCE_COLLEZIONE, VOCE_IMPOSTAZIONI, VOCE_PROFILO, type VoceMenu } from './vociNavigazione'

// le voci del pannello account in fila: stessa forma per link e bottoni
const RIGA = 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition-colors'

// "1.240 carte · 3 binder"
function riassunto(carte: number, binder: number): string {
  return `${carte.toLocaleString('it-IT')} ${carte === 1 ? 'carta' : 'carte'} · ${binder} binder`
}

// contenuto del pannello account: lo stesso nel menu a tendina da desktop e nel pannello da telefono
export function ContenutoAccount() {
  const token = useAppSelector(selectToken)
  const utente = useAppSelector(selectUtente)
  const isAdmin = useAppSelector(selectIsAdmin)
  const { esci, inUscita } = useLogout()
  // sotto il nome quante carte e quanti binder: si chiede solo con il pannello aperto (poi resta in cache)
  const { data: statistiche } = useGetStatisticheQuery(undefined, { skip: !utente })

  if (!utente) {
    // token senza utente: il profilo sta ancora arrivando, meglio non mostrare Accedi
    if (token) return null
    return (
      <div className="flex gap-2">
        <LinkBottone to="/login" variante="chiaro" dimensione="sm" className="flex-1">
          Accedi
        </LinkBottone>
        <LinkBottone to="/register" variante="secondario" dimensione="sm" className="flex-1">
          Registrati
        </LinkBottone>
      </div>
    )
  }

  const voci: VoceMenu[] = [VOCE_PROFILO, VOCE_COLLEZIONE, VOCE_IMPOSTAZIONI, ...(isAdmin ? [VOCE_ADMIN] : [])]

  return (
    <div>
      <NavLink to={VOCE_PROFILO.a} className="mb-2 flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-white/10">
        <Avatar utente={utente} className="size-10 text-lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{utente.username}</p>
          <p className="text-xs text-white/70">
            {statistiche ? riassunto(statistiche.totali.carteDiverse, statistiche.totali.binder) : isAdmin ? 'Amministratore' : 'Collezionista'}
          </p>
        </div>
      </NavLink>

      <ul className="space-y-1">
        {voci.map((voce) => (
          <li key={voce.a}>
            <NavLink
              to={voce.a}
              // /profilo non resta acceso su /profilo/impostazioni
              end
              className={({ isActive }) => cn(RIGA, isActive ? 'bg-white text-blu-900' : 'text-white hover:bg-white/10')}
            >
              {({ isActive }) => (
                <>
                  <voce.icona aria-hidden className={cn('size-5', !isActive && 'text-giallo-400')} />
                  {voce.etichetta}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-2 space-y-1 border-t border-white/15 pt-2">
        <button type="button" onClick={esci} disabled={inUscita} aria-busy={inUscita || undefined} className={cn(RIGA, 'text-white hover:bg-white/10 disabled:opacity-60')}>
          {inUscita ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <LogOut aria-hidden className="size-5" />}
          Esci
        </button>
      </div>
    </div>
  )
}

// da desktop: bottone con iniziale e nome che apre il pannello account a tendina.
// Si chiude cliccando fuori, con Esc (il focus torna sul bottone) o cambiando pagina
export function MenuAccount() {
  const utente = useAppSelector(selectUtente)
  const [aperto, setAperto] = useState(false)
  const { pathname } = useLocation()
  const contenitore = useRef<HTMLDivElement>(null)
  const bottone = useRef<HTMLButtonElement>(null)
  const idPannello = useId()

  useEffect(() => setAperto(false), [pathname])

  useEffect(() => {
    if (!aperto) return
    function fuori(evento: PointerEvent) {
      if (!contenitore.current?.contains(evento.target as Node)) setAperto(false)
    }
    function tasto(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setAperto(false)
      bottone.current?.focus()
    }
    document.addEventListener('pointerdown', fuori)
    document.addEventListener('keydown', tasto)
    return () => {
      document.removeEventListener('pointerdown', fuori)
      document.removeEventListener('keydown', tasto)
    }
  }, [aperto])

  if (!utente) return null

  // acceso anche quando si è su una pagina che sta nel menu (Profilo, Collezione, Admin)
  const suPaginaDelMenu = [VOCE_PROFILO, VOCE_COLLEZIONE, VOCE_ADMIN].some((voce) => pathname.startsWith(voce.a))

  return (
    <div ref={contenitore} className="relative">
      <button
        ref={bottone}
        type="button"
        onClick={() => setAperto((a) => !a)}
        aria-expanded={aperto}
        aria-controls={idPannello}
        aria-label={`Account di ${utente.username}`}
        className={cn(
          'flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-semibold text-white ring-1 transition-colors',
          aperto || suPaginaDelMenu ? 'bg-white/15 ring-white/40' : 'ring-white/20 hover:bg-white/10',
        )}
      >
        <Avatar utente={utente} className="size-8 text-base" />
        {/* fra lg e xl solo l'avatar: col nome la barra uscirebbe dallo schermo a 1024 px */}
        <span className="hidden max-w-[12ch] truncate xl:block">{utente.username}</span>
        <ChevronDown aria-hidden className={cn('size-4 text-white/70 transition-transform duration-200', aperto && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {aperto && (
          <motion.div
            id={idPannello}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-3 w-72 origin-top-right rounded-3xl bg-notte-2 p-3 shadow-2xl shadow-ombra/50 ring-1 ring-white/10"
          >
            <ContenutoAccount />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
