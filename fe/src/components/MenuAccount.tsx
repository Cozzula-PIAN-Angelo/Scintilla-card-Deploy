import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LoaderCircle, LogOut, UserX } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAppSelector } from '../app/hooks'
import { selectIsAdmin, selectToken, selectUtente } from '../features/auth/authSlice'
import { useLogout } from '../features/auth/useLogout'
import { cn } from '../utils/cn'
import { LinkBottone } from './Button'
import { VOCE_ADMIN, VOCE_COLLEZIONE, type VoceMenu } from './vociNavigazione'

// pallino con l'iniziale del nome: l'«avatar» dell'utente nella navbar
function Iniziale({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full bg-giallo-400 font-titolo font-bold uppercase text-blu-900', className)}
    >
      {nome.charAt(0)}
    </span>
  )
}

// le voci del pannello account in fila: stessa forma per link e bottoni
const RIGA = 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition-colors'

// contenuto del pannello account: lo stesso nel menu a tendina da desktop e nel pannello da telefono
export function ContenutoAccount({ onCancellaAccount }: { onCancellaAccount: () => void }) {
  const token = useAppSelector(selectToken)
  const utente = useAppSelector(selectUtente)
  const isAdmin = useAppSelector(selectIsAdmin)
  const { esci, inUscita } = useLogout()

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

  const voci: VoceMenu[] = [VOCE_COLLEZIONE, ...(isAdmin ? [VOCE_ADMIN] : [])]

  return (
    <div>
      <div className="flex items-center gap-3 px-3 pb-3 pt-1">
        <Iniziale nome={utente.username} className="size-10 text-lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{utente.username}</p>
          <p className="text-xs text-white/70">{isAdmin ? 'Amministratore' : 'Collezionista'}</p>
        </div>
      </div>

      <ul className="space-y-1">
        {voci.map((voce) => (
          <li key={voce.a}>
            <NavLink
              to={voce.a}
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
        <button type="button" onClick={onCancellaAccount} className={cn(RIGA, 'py-2.5 text-sm text-white/70 hover:bg-rosso-700/30 hover:text-white')}>
          <UserX aria-hidden className="size-5" />
          Cancella account
        </button>
      </div>
    </div>
  )
}

// da desktop: bottone con iniziale e nome che apre il pannello account a tendina.
// Si chiude cliccando fuori, con Esc (il focus torna sul bottone) o cambiando pagina
export function MenuAccount({ onCancellaAccount }: { onCancellaAccount: () => void }) {
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

  // acceso anche quando si è su una pagina che sta nel menu (Collezione, Admin)
  const suPaginaDelMenu = pathname.startsWith(VOCE_COLLEZIONE.a) || pathname.startsWith(VOCE_ADMIN.a)

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
        <Iniziale nome={utente.username} className="size-8 text-base" />
        <span className="max-w-[12ch] truncate">{utente.username}</span>
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
            <ContenutoAccount
              onCancellaAccount={() => {
                setAperto(false)
                onCancellaAccount()
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
