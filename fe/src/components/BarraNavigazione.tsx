import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router'
import { molla } from '../theme/motion'
import { cn } from '../utils/cn'
import { VOCI_PRINCIPALI, voceAttiva } from './vociNavigazione'

// da telefono le sezioni stanno in una barra fissa in basso, a portata di pollice (al posto
// dell'hamburger). Alta 4rem più la zona del gesto home: lo spazio lo riserva --spazio-barra (theme.css)
export function BarraNavigazione() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-notte/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.25)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {VOCI_PRINCIPALI.map((voce) => (
          <li key={voce.a}>
            <NavLink
              to={voce.a}
              end={voce.a === '/'}
              className="relative flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold text-white/70"
            >
              {({ isActive }) => {
                const attiva = voceAttiva(voce, isActive, pathname)
                return (
                  <>
                    {attiva && (
                      <motion.span layoutId="barra-attiva" transition={molla} className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-giallo-400" />
                    )}
                    <voce.icona aria-hidden className={cn('size-6', attiva && 'text-giallo-400')} />
                    <span className={cn(attiva && 'text-white')}>{voce.etichetta}</span>
                  </>
                )
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
