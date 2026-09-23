import { AnimatePresence, motion } from 'framer-motion'
import { Heart, LayoutGrid, LogOut, Menu, ShieldCheck, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAppSelector } from '../app/hooks'
import { selectIsAdmin, selectToken, selectUtente } from '../features/auth/authSlice'
import { useLogout } from '../features/auth/useLogout'
import { useScrollato } from '../hooks/useScrollato'
import { molla } from '../theme/motion'
import { cn } from '../utils/cn'
import { Button, LinkBottone } from './Button'
import { Logo } from './Logo'

interface VoceMenu {
  a: string
  etichetta: string
  icona: LucideIcon
}

export function Navbar() {
  const scrollato = useScrollato(24)
  const token = useAppSelector(selectToken)
  const utente = useAppSelector(selectUtente)
  const isAdmin = useAppSelector(selectIsAdmin)
  const { esci, inUscita } = useLogout()
  const [menuAperto, setMenuAperto] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setMenuAperto(false), [pathname])

  const voci: VoceMenu[] = [
    { a: '/', etichetta: 'Catalogo', icona: LayoutGrid },
    { a: '/preferiti', etichetta: 'Preferiti', icona: Heart },
    ...(isAdmin ? [{ a: '/admin', etichetta: 'Admin', icona: ShieldCheck }] : []),
  ]

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[padding,background-color,box-shadow] duration-300',
        scrollato ? 'bg-blu-900/95 py-2 shadow-xl shadow-blu-900/30 backdrop-blur-md' : 'bg-blu-900 py-4',
      )}
    >
      <nav aria-label="Principale" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo compatto={scrollato} />

        <ul className="hidden items-center gap-1 md:flex">
          {voci.map((voce) => (
            <li key={voce.a}>
              <NavLink
                to={voce.a}
                end={voce.a === '/'}
                className="relative block rounded-full px-4 py-2 text-sm font-semibold text-white"
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="voce-attiva" transition={molla} className="absolute inset-0 rounded-full bg-white/15 ring-1 ring-white/25" />
                    )}
                    <span className="relative flex items-center gap-2">
                      <voce.icona aria-hidden className={cn('size-4', isActive && 'text-giallo-400')} />
                      {voce.etichetta}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {utente ? (
            <>
              <span className="text-sm text-white">
                Ciao, <strong className="font-semibold text-giallo-400">{utente.username}</strong>
              </span>
              <Button variante="chiaro" dimensione="sm" onClick={esci} caricamento={inUscita}>
                <LogOut aria-hidden className="size-4" />
                Esci
              </Button>
            </>
          ) : (
            !token && (
              <>
                <LinkBottone to="/login" variante="suScuro" dimensione="sm">
                  Accedi
                </LinkBottone>
                <LinkBottone to="/register" variante="secondario" dimensione="sm">
                  Registrati
                </LinkBottone>
              </>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuAperto((aperto) => !aperto)}
          aria-expanded={menuAperto}
          aria-controls="menu-mobile"
          aria-label={menuAperto ? 'Chiudi il menu' : 'Apri il menu'}
          className="grid size-11 place-items-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={menuAperto ? 'chiudi' : 'apri'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {menuAperto ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </nav>

      <AnimatePresence>
        {menuAperto && (
          <motion.div
            id="menu-mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden md:hidden"
          >
            <div className="mx-4 mt-3 space-y-1 rounded-3xl bg-blu-700 p-3 shadow-xl">
              {voci.map((voce, indice) => (
                <motion.div key={voce.a} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1, transition: { delay: indice * 0.05 } }}>
                  <NavLink
                    to={voce.a}
                    end={voce.a === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold',
                        isActive ? 'bg-white text-blu-900' : 'text-white hover:bg-white/10',
                      )
                    }
                  >
                    <voce.icona aria-hidden className="size-5" />
                    {voce.etichetta}
                  </NavLink>
                </motion.div>
              ))}
              <div className="mt-2 border-t border-white/20 pt-3">
                {utente ? (
                  <div className="flex items-center justify-between gap-3 px-2">
                    <span className="text-sm text-white">
                      Ciao, <strong className="text-giallo-400">{utente.username}</strong>
                    </span>
                    <Button variante="chiaro" dimensione="sm" onClick={esci} caricamento={inUscita}>
                      <LogOut aria-hidden className="size-4" />
                      Esci
                    </Button>
                  </div>
                ) : (
                  !token && (
                    <div className="flex gap-2 px-2">
                      <LinkBottone to="/login" variante="chiaro" dimensione="sm" className="flex-1">
                        Accedi
                      </LinkBottone>
                      <LinkBottone to="/register" variante="secondario" dimensione="sm" className="flex-1">
                        Registrati
                      </LinkBottone>
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
