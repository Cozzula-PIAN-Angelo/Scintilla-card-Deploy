import { motion } from 'framer-motion'
import { Button } from '../../components/Button'
import { CarteSfondo } from '../../components/CarteSfondo'
import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import type { Oggetto } from '../../types/api'

interface Props {
  vetrina: Oggetto[]
  // carte sparse dietro, diverse da quelle del ventaglio
  sfondo: Oggetto[]
  onEsplora: () => void
}

// ventaglio di tre carte a destra del titolo: rotazione e ritardo diversi per ognuna
const VENTAGLIO = [
  { rotazione: -14, x: -70, y: 18, ritardo: 0.2 },
  { rotazione: 0, x: 0, y: -6, ritardo: 0.35 },
  { rotazione: 14, x: 70, y: 18, ritardo: 0.5 },
]

export function Hero({ vetrina, sfondo, onEsplora }: Props) {
  return (
    <section className="sfondo-hero relative animate-gradiente overflow-hidden text-white">
      <CarteSfondo carte={sfondo} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="text-balance text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl"
          >
            Ogni tasca vuota è una carta da <span className="text-giallo-400">trovare</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="mt-5 max-w-xl text-lg text-white"
          >
            Crea il binder di un set, di un Pokémon o di un artista: le carte che ti mancano aspettano in grigio al loro posto.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }} className="mt-8">
            <Button variante="secondario" dimensione="lg" onClick={onEsplora}>
              Esplora le carte
            </Button>
          </motion.div>
        </div>

        <div aria-hidden className="relative hidden h-[420px] lg:block">
          {VENTAGLIO.map((posizione, indice) => {
            const oggetto = vetrina[indice]
            return (
              <motion.div
                key={indice}
                initial={{ opacity: 0, y: 80, rotate: 0 }}
                animate={{
                  opacity: 1,
                  y: posizione.y,
                  x: posizione.x,
                  rotate: posizione.rotazione,
                  transition: { type: 'spring', stiffness: 120, damping: 16, delay: posizione.ritardo },
                }}
                className="absolute left-1/2 top-1/2 -ml-[105px] -mt-[147px] w-[210px]"
                style={{ zIndex: indice === 1 ? 2 : 1 }}
              >
                <div className="animate-fluttua" style={{ animationDelay: `${indice * 1.3}s`, animationDuration: '7s' }}>
                  <ImmagineCarta
                    src={oggetto?.immagineUrlPiccola ?? oggetto?.immagineUrl ?? null}
                    alt={oggetto?.nome ?? 'CeloManca'}
                    priorita
                    className={`aspect-[63/88] w-full shadow-2xl shadow-ombra/60 ${FORMA_CARTA}`}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
