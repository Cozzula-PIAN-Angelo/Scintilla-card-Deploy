import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/Button'
import { cn } from '../../../utils/cn'
import { useContestoBinder, type Sorgente } from '../contesto'

export function AvvisoInMano({ sorgente, onAnnulla }: { sorgente: Sorgente; onAnnulla: () => void }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed inset-x-4 bottom-6 z-[48] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-blu-900 p-2 pr-3 text-white shadow-2xl shadow-ombra/40 scuro:ring-1 scuro:ring-white/15"
    >
      <img
        src={sorgente.oggetto.immagineUrlPiccola ?? sorgente.oggetto.immagineUrl ?? ''}
        alt=""
        className="aspect-[63/88] w-10 shrink-0 rounded-md object-cover"
      />
      <p className="min-w-0 flex-1 text-sm">
        {sorgente.tipo === 'carta' ? 'Tocca una tasca per inserire ' : 'Tocca la tasca di arrivo per '}
        <strong className="text-giallo-400">{sorgente.oggetto.nome}</strong>
      </p>
      <Button variante="suScuro" dimensione="sm" onClick={onAnnulla}>
        Annulla
      </Button>
    </motion.div>
  )
}

// trascinando una carta fuori da una tasca compare il cestino per toglierla dal binder
export function Cestino() {
  const binder = useContestoBinder()
  const [sopra, setSopra] = useState(false)
  const sorgente = binder.trascinata
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      onDragOver={(e) => {
        e.preventDefault()
        setSopra(true)
      }}
      onDragLeave={() => setSopra(false)}
      onDrop={(e) => {
        e.preventDefault()
        if (sorgente?.tipo === 'tasca') binder.togli({ pagina: sorgente.pagina, posizione: sorgente.posizione })
        binder.fineTrascinamento()
      }}
      className={cn(
        'fixed bottom-6 left-1/2 z-[48] flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-4 font-semibold text-white shadow-2xl transition-[background-color,transform]',
        sopra ? 'scale-110 bg-rosso-500' : 'bg-rosso-700',
      )}
    >
      <Trash2 aria-hidden className="size-5" />
      Rilascia qui per togliere la carta
    </motion.div>
  )
}
