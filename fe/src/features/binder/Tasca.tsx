import { AnimatePresence, motion } from 'framer-motion'
import { Eye, Move, Plus, Trash2 } from 'lucide-react'
import { useState, type DragEvent, type ReactNode } from 'react'
import type { Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { stessaPosizione, TIPO_TRASCINAMENTO, useContestoBinder } from './contesto'

interface Props {
  pagina: number
  posizione: number
  oggetto: Oggetto | null
}

// Tasca trasparente di una pagina. Accetta carte trascinate (dal cassetto o da un'altra tasca)
// oppure, con un tocco, la carta "in mano". Piena, un tocco apre il menu: guarda, sposta, togli
export function Tasca({ pagina, posizione, oggetto }: Props) {
  const binder = useContestoBinder()
  const [sopra, setSopra] = useState(false)
  const qui = { pagina, posizione }
  const menuAperto = oggetto !== null && stessaPosizione(binder.tascaAttiva, qui)
  const inMano = binder.inMano
  // la carta in mano è proprio questa: niente destinazione su se stessa
  const eOrigine = inMano?.tipo === 'tasca' && stessaPosizione(inMano, qui)
  const inAttesa = inMano !== null && !eOrigine

  function tocca() {
    if (inAttesa) {
      binder.rilascia(qui, inMano)
      return
    }
    if (eOrigine) {
      binder.prendi(null)
      return
    }
    binder.attivaTasca(oggetto && !menuAperto ? qui : null)
  }

  function trascinaSopra(evento: DragEvent) {
    const sorgente = binder.trascinata
    if (!sorgente || (sorgente.tipo === 'tasca' && stessaPosizione(sorgente, qui))) return
    evento.preventDefault()
    evento.dataTransfer.dropEffect = sorgente.tipo === 'tasca' ? 'move' : 'copy'
    setSopra(true)
  }

  function lascia(evento: DragEvent) {
    evento.preventDefault()
    setSopra(false)
    if (binder.trascinata) binder.rilascia(qui, binder.trascinata)
    binder.fineTrascinamento()
  }

  function iniziaTrascinamento(evento: DragEvent) {
    if (!oggetto) return
    evento.dataTransfer.setData(TIPO_TRASCINAMENTO, oggetto.id)
    evento.dataTransfer.setData('text/plain', oggetto.nome)
    evento.dataTransfer.effectAllowed = 'copyMove'
    binder.iniziaTrascinamento({ tipo: 'tasca', oggetto, pagina, posizione })
  }

  const etichetta = oggetto
    ? `Tasca ${posizione + 1}: ${oggetto.nome}${inAttesa ? `. Sostituisci con ${inMano.oggetto.nome}` : ''}`
    : `Tasca ${posizione + 1}, vuota${inAttesa ? `. Inserisci ${inMano.oggetto.nome}` : ''}`

  return (
    <div className="relative min-h-0 min-w-0" onDragOver={trascinaSopra} onDragLeave={() => setSopra(false)} onDrop={lascia}>
      <button
        type="button"
        onClick={tocca}
        draggable={oggetto !== null}
        onDragStart={iniziaTrascinamento}
        onDragEnd={binder.fineTrascinamento}
        aria-label={etichetta}
        aria-expanded={oggetto ? menuAperto : undefined}
        className={cn(
          'group relative mx-auto block aspect-[63/88] h-full max-h-full max-w-full overflow-hidden rounded-[6%/4.3%] transition',
          // busta di plastica trasparente sulla tela scura: appena più chiara, bordo sottile e riflesso
          'bg-white/[0.04] ring-1 ring-white/12',
          oggetto ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          inAttesa && 'ring-2 ring-giallo-400/70',
          eOrigine && 'opacity-40',
          sopra && 'scale-[1.04] ring-4 ring-giallo-400',
        )}
      >
        {oggetto ? (
          <img
            src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl ?? ''}
            alt=""
            draggable={false}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className={cn(
              'absolute inset-[7%] grid place-items-center rounded-[5%/3.6%] border-2 border-dashed border-white/15 text-white/25 transition-colors',
              'group-hover:border-giallo-400/60 group-hover:text-giallo-400',
              (inAttesa || sopra) && 'border-giallo-400/70 text-giallo-400',
            )}
          >
            <Plus className="size-[28%]" />
          </span>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgb(255_255_255/0.35),transparent_32%,transparent_70%,rgb(255_255_255/0.12))]"
        />
      </button>

      <AnimatePresence>
        {menuAperto && oggetto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-10 m-auto flex aspect-[63/88] h-full max-w-full flex-col items-center justify-center gap-[6%] rounded-[6%/4.3%] bg-ombra/60 backdrop-blur-[2px]"
          >
            <AzioneTasca etichetta="Guarda la carta" onClick={() => binder.guarda(oggetto)}>
              <Eye className="size-full" />
            </AzioneTasca>
            <AzioneTasca
              etichetta="Sposta: poi tocca la tasca di arrivo"
              onClick={() => binder.prendi({ tipo: 'tasca', oggetto, pagina, posizione })}
            >
              <Move className="size-full" />
            </AzioneTasca>
            <AzioneTasca etichetta="Togli dal binder" pericolo onClick={() => binder.togli(qui)}>
              <Trash2 className="size-full" />
            </AzioneTasca>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AzioneTasca({
  etichetta,
  pericolo = false,
  onClick,
  children,
}: {
  etichetta: string
  pericolo?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etichetta}
      title={etichetta}
      className={cn(
        'grid aspect-square w-[34%] max-w-11 place-items-center rounded-full p-[7%] shadow-lg transition-transform hover:scale-110',
        pericolo ? 'bg-rosso-700 text-white' : 'bg-white text-blu-900',
      )}
    >
      {children}
    </button>
  )
}
