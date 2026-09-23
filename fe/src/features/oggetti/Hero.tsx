import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '../../components/Button'
import { FormeFluttuanti } from '../../components/Forme'
import { ImmagineCarta } from '../../components/ImmagineCarta'
import type { Oggetto } from '../../types/api'

interface Props {
  vetrina: Oggetto[]
  onEsplora: () => void
}

// ventaglio di tre carte a destra del titolo: rotazione e ritardo diversi per ognuna
const VENTAGLIO = [
  { rotazione: -14, x: -70, y: 18, ritardo: 0.2 },
  { rotazione: 0, x: 0, y: -6, ritardo: 0.35 },
  { rotazione: 14, x: 70, y: 18, ritardo: 0.5 },
]

export function Hero({ vetrina, onEsplora }: Props) {
  return (
    <section className="sfondo-hero relative animate-gradiente overflow-hidden text-white">
      <FormeFluttuanti />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-blu-900/60 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/30"
          >
            <Sparkles aria-hidden className="size-4 text-giallo-400" />
            Carte da collezione selezionate
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="mt-5 text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl"
          >
            Carte che <span className="text-giallo-400">brillano</span>, collezioni che raccontano.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="mt-5 max-w-xl text-lg text-white"
          >
            Sfoglia la vetrina, fai brillare le carte con il mouse e salva le tue preferite in un clic.
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
                    src={oggetto?.immagineUrl ?? null}
                    alt={oggetto?.nome ?? 'Scintilla'}
                    priorita
                    className="aspect-[63/88] w-full rounded-2xl shadow-2xl shadow-blu-900/60 ring-4 ring-white/80"
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
