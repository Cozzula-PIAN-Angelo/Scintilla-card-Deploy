import { motion } from 'framer-motion'
import { Album, Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { StatoErrore, StatoVuoto } from '../../components/StatiPagina'
import { Skeleton } from '../../components/Skeleton'
import { elementoGriglia, griglia } from '../../theme/motion'
import type { Binder } from '../../types/api'
import { proporzionePagina, scuro } from './aspetto'
import { useGetBinderQuery } from './binderApi'
import { CopertinaBinder } from './CopertinaBinder'
import { useImmagineBinder } from './immagine'

interface Props {
  onApri: (binder: Binder) => void
  onNuovo: () => void
  onImpostazioni: (binder: Binder) => void
}

// i binder dell'utente come album su una mensola; un clic lo estrae e lo apre
export function Mensola({ onApri, onNuovo, onImpostazioni }: Props) {
  const { data, isLoading, isError, error, refetch } = useGetBinderQuery()
  const [estratto, setEstratto] = useState<string | null>(null)

  function estrai(binder: Binder) {
    if (estratto) return
    setEstratto(binder.id)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    )
  }
  if (isError) {
    return <StatoErrore messaggio={messaggioErrore(error, 'Non è stato possibile caricare i tuoi binder.')} onRiprova={refetch} />
  }
  if (!data || data.length === 0) {
    return (
      <StatoVuoto
        icona={<Album aria-hidden className="size-16" />}
        titolo="Ancora nessun binder"
        testo="Crea il tuo primo album: scegli formato, colore e copertina, poi riempilo con le tue carte."
        azione={
          <Button variante="primario" dimensione="lg" onClick={onNuovo}>
            <Plus aria-hidden className="size-5" />
            Crea un binder
          </Button>
        }
      />
    )
  }

  return (
    <motion.ul
      variants={griglia}
      initial="nascosto"
      animate="visibile"
      className="grid grid-cols-2 items-end gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4"
    >
      {data.map((binder) => (
        <motion.li key={binder.id} variants={elementoGriglia} className="flex flex-col">
          <BinderSullaMensola
            binder={binder}
            estratto={estratto === binder.id}
            attenuato={estratto !== null && estratto !== binder.id}
            onClick={() => estrai(binder)}
            onEstratto={() => onApri(binder)}
          />
          <div className="mt-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-titolo text-lg font-semibold text-testo">{binder.nome}</p>
              <p className="text-xs font-medium text-testo/70">
                {binder.carteInserite} / {binder.pagine * binder.tasche} carte · {binder.pagine} pagine
              </p>
            </div>
            <button
              type="button"
              onClick={() => onImpostazioni(binder)}
              aria-label={`Impostazioni di ${binder.nome}`}
              className="grid size-9 shrink-0 place-items-center rounded-full text-testo-2 transition-colors hover:bg-tenue"
            >
              <Settings2 aria-hidden className="size-5" />
            </button>
          </div>
        </motion.li>
      ))}

      <motion.li variants={elementoGriglia} className="flex flex-col">
        <button
          type="button"
          onClick={onNuovo}
          className="grid aspect-[3/4] w-full place-items-center rounded-xl border-2 border-dashed border-linea/20 text-testo-2 transition-colors hover:border-giallo-400 hover:bg-superficie/50 hover:text-testo"
        >
          <span className="flex flex-col items-center gap-2 font-semibold">
            <span className="grid size-14 place-items-center rounded-full bg-superficie shadow-lg shadow-ombra/10">
              <Plus aria-hidden className="size-7" />
            </span>
            Nuovo binder
          </span>
        </button>
        <div className="mt-4 h-11" />
      </motion.li>
    </motion.ul>
  )
}

interface PropsSullaMensola {
  binder: Binder
  estratto: boolean
  attenuato: boolean
  onClick: () => void
  onEstratto: () => void
}

// album in 3D: al passaggio del mouse ruota e mostra il dorso, spesso quanto le sue pagine
function BinderSullaMensola({ binder, estratto, attenuato, onClick, onEstratto }: PropsSullaMensola) {
  const immagine = useImmagineBinder(binder)
  const spessore = 10 + binder.pagine * 0.5

  return (
    <div className="flex aspect-[3/4] items-end justify-center [perspective:1400px]">
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={`Apri ${binder.nome}`}
        initial={false}
        animate={
          estratto
            ? { rotateY: 0, y: -24, scale: 1.08, zIndex: 10 }
            : { rotateY: 0, y: 0, scale: 1, opacity: attenuato ? 0.35 : 1 }
        }
        whileHover={estratto || attenuato ? undefined : { rotateY: 24, y: -6 }}
        whileTap={estratto ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onAnimationComplete={() => estratto && onEstratto()}
        className="relative w-full [transform-style:preserve-3d]"
        style={{ aspectRatio: proporzionePagina(binder.tasche) }}
      >
        {/* dorso, dietro il bordo sinistro */}
        <span
          aria-hidden
          className="absolute inset-y-[1%] left-0 origin-left rounded-l-sm"
          style={{
            width: spessore,
            transform: 'rotateY(90deg)',
            background: `linear-gradient(90deg, ${scuro(binder.colore, 45)}, ${scuro(binder.colore, 25)}, ${scuro(binder.colore, 50)})`,
          }}
        />
        <CopertinaBinder
          nome={binder.nome}
          colore={binder.colore}
          motivo={binder.motivo}
          tasche={binder.tasche}
          cartaCopertina={binder.cartaCopertina}
          immagineUrl={immagine}
          className="shadow-xl shadow-ombra/30"
        />
      </motion.button>
    </div>
  )
}
