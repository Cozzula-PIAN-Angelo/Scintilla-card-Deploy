import { AnimatePresence, motion } from 'framer-motion'
import { CircleUserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useAppSelector } from '../app/hooks'
import { selectToken, selectUtente } from '../features/auth/authSlice'
import { ModaleCancellaAccount } from '../features/auth/ModaleCancellaAccount'
import { useScrollato } from '../hooks/useScrollato'
import { molla } from '../theme/motion'
import { useTema } from '../theme/tema'
import { cn } from '../utils/cn'
import { LinkBottone } from './Button'
import { Logo } from './Logo'
import { ContenutoAccount, MenuAccount } from './MenuAccount'
import { PulsanteTema } from './PulsanteTema'
import { VOCI_PRINCIPALI, voceAttiva, type VoceMenu } from './vociNavigazione'

export function Navbar() {
  const scrollato = useScrollato(24)
  const token = useAppSelector(selectToken)
  const utente = useAppSelector(selectUtente)
  const { tema, alterna } = useTema()
  const [menuAperto, setMenuAperto] = useState(false)
  const [cancellazioneAperta, setCancellazioneAperta] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setMenuAperto(false), [pathname])

  const attiva = (voce: VoceMenu, isActive: boolean) => voceAttiva(voce, isActive, pathname)

  // da desktop le sezioni stanno qui; sotto lg (telefono e tablet) nella barra in basso (BarraNavigazione).
  // Collezione e Admin stanno nel pannello account (MenuAccount), uguale ovunque

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[padding,background-color,box-shadow] duration-300',
        scrollato ? 'bg-notte/95 py-2 shadow-xl shadow-ombra/30 backdrop-blur-md' : 'bg-notte py-4',
      )}
    >
      <nav aria-label="Principale" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo compatto={scrollato} />

        <ul className="hidden items-center gap-1 lg:flex">
          {VOCI_PRINCIPALI.map((voce) => (
            <li key={voce.a}>
              <NavLink
                to={voce.a}
                end={voce.a === '/'}
                className="relative block rounded-full px-4 py-2 text-sm font-semibold text-white"
              >
                {({ isActive }) => (
                  <>
                    {attiva(voce, isActive) && (
                      <motion.span layoutId="voce-attiva" transition={molla} className="absolute inset-0 rounded-full bg-white/15 ring-1 ring-white/25" />
                    )}
                    <span className="relative flex items-center gap-2">
                      <voce.icona aria-hidden className={cn('size-4', attiva(voce, isActive) && 'text-giallo-400')} />
                      {voce.etichetta}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 lg:gap-2">
          <PulsanteTema tema={tema} onAlterna={alterna} />

          <div className="hidden lg:block">
            {utente ? (
              <MenuAccount onCancellaAccount={() => setCancellazioneAperta(true)} />
            ) : (
              !token && (
                <div className="flex items-center gap-2">
                  <LinkBottone to="/login" variante="suScuro" dimensione="sm">
                    Accedi
                  </LinkBottone>
                  <LinkBottone to="/register" variante="secondario" dimensione="sm">
                    Registrati
                  </LinkBottone>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuAperto((aperto) => !aperto)}
            aria-expanded={menuAperto}
            aria-controls="menu-mobile"
            aria-label={menuAperto ? "Chiudi il menu dell'account" : "Apri il menu dell'account"}
            className="grid size-11 place-items-center rounded-full text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuAperto ? 'chiudi' : 'apri'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {menuAperto ? <X aria-hidden className="size-6" /> : <CircleUserRound aria-hidden className="size-6" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuAperto && (
          <motion.div
            id="menu-mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="mx-4 mt-3 rounded-3xl bg-notte-2 p-3 shadow-xl sm:ml-auto sm:mr-6 sm:max-w-sm">
              <ContenutoAccount onCancellaAccount={() => setCancellazioneAperta(true)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModaleCancellaAccount aperta={cancellazioneAperta} onChiudi={() => setCancellazioneAperta(false)} />
    </header>
  )
}
