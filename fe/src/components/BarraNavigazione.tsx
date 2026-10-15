import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { molla } from '../theme/motion'
import { cn } from '../utils/cn'
import { VOCI_PRINCIPALI, voceAttiva } from './vociNavigazione'

// scorrendo in giù oltre questa quota la barra si nasconde; ogni movimento sotto la soglia è ignorato
// (tremolii del dito, rimbalzo elastico di iOS)
const QUOTA_NASCONDI = 80
const SOGLIA_MOVIMENTO = 8

// true scorrendo in giù, false appena si risale (o vicino all'inizio della pagina)
function useNascostaScorrendo() {
  const [nascosta, setNascosta] = useState(false)
  const ultima = useRef(0)
  useEffect(() => {
    ultima.current = window.scrollY
    function scorri() {
      const y = window.scrollY
      const delta = y - ultima.current
      if (Math.abs(delta) < SOGLIA_MOVIMENTO) return
      setNascosta(delta > 0 && y > QUOTA_NASCONDI)
      ultima.current = y
    }
    window.addEventListener('scroll', scorri, { passive: true })
    return () => window.removeEventListener('scroll', scorri)
  }, [])
  return nascosta
}

// Da telefono le sezioni stanno in una barra a U che galleggia in basso, a portata di pollice (al posto
// dell'hamburger): vetro sfocato, angoli in basso tondi come quelli dello schermo. Si nasconde scorrendo
// in giù e torna risalendo. Lo spazio che occupa lo riserva --spazio-barra (theme.css)
export function BarraNavigazione() {
  const { pathname } = useLocation()
  const nascosta = useNascostaScorrendo()

  return (
    <motion.nav
      aria-label="Sezioni"
      initial={false}
      // 200%: esce del tutto, anche con la zona del gesto home sotto
      animate={{ y: nascosta ? '200%' : '0%' }}
      transition={molla}
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-t-2xl rounded-b-[2.25rem] bg-notte/55 shadow-2xl shadow-ombra/40 ring-1 ring-white/15 backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <ul className="grid h-16 grid-cols-5 px-1.5">
        {VOCI_PRINCIPALI.map((voce, indice) => (
          <li key={voce.a}>
            <NavLink
              to={voce.a}
              end={voce.a === '/'}
              className="relative flex h-full items-center justify-center text-[0.6875rem] font-semibold text-white/70"
            >
              {({ isActive }) => {
                const attiva = voceAttiva(voce, isActive, pathname)
                return (
                  <>
                    {/* bolla della voce attiva: scivola da una voce all'altra */}
                    {attiva && (
                      <motion.span
                        layoutId="barra-attiva"
                        transition={molla}
                        className={cn(
                          'absolute inset-x-0.5 inset-y-1.5 rounded-2xl bg-white/15 ring-1 ring-white/20',
                          // sulle voci ai lati la bolla segue la U della barra: angoli esterni concentrici a
                          // quelli della barra (raggio della barra meno la distanza dal bordo, ~0.4rem)
                          indice === 0 && 'rounded-tl-[0.625rem] rounded-bl-[1.875rem]',
                          indice === VOCI_PRINCIPALI.length - 1 && 'rounded-tr-[0.625rem] rounded-br-[1.875rem]',
                        )}
                      />
                    )}
                    <motion.span whileTap={{ scale: 0.85 }} className="relative flex flex-col items-center gap-1">
                      <motion.span animate={{ y: attiva ? -1 : 0, scale: attiva ? 1.12 : 1 }} transition={molla}>
                        <voce.icona aria-hidden className={cn('size-6', attiva && 'text-giallo-400')} />
                      </motion.span>
                      <span className={cn(attiva && 'text-white')}>{voce.etichetta}</span>
                    </motion.span>
                  </>
                )
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </motion.nav>
  )
}
