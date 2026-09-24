import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { ImmagineCarta } from '../../components/ImmagineCarta'
import type { CartaEsterna } from '../../types/api'
import { elementoGriglia } from '../../theme/motion'
import { cn } from '../../utils/cn'
import { formattaPrezzo } from '../../utils/formato'
import { FormImporta } from './FormImporta'
import { classiRarita } from './rarita'

export function CartaRisultato({ carta }: { carta: CartaEsterna }) {
  const [formAperto, setFormAperto] = useState(false)

  return (
    <motion.li variants={elementoGriglia} className="relative list-none overflow-hidden rounded-3xl bg-superficie p-3 shadow-lg shadow-ombra/10 ring-1 ring-linea/5">
      <div className="relative">
        <ImmagineCarta src={carta.immagineUrlPiccola ?? carta.immagineUrl} alt={carta.nome} className="aspect-[63/88] w-full rounded-2xl" />
        <AnimatePresence>
          {carta.giaImportata && (
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -6 }}
              className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-giallo-400 px-3 py-1 text-xs font-bold text-blu-900 shadow-lg"
            >
              <CircleCheck aria-hidden className="size-3.5" />
              Nel catalogo
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 space-y-2 px-1">
        <h3 className="line-clamp-1 text-lg font-semibold text-testo">{carta.nome}</h3>
        <p className="line-clamp-1 text-sm text-testo/70">
          {carta.espansione ?? 'Espansione sconosciuta'}
          {carta.numero && <> · n° {carta.numero}</>}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', classiRarita(carta.rarita))}>
            {carta.rarita ?? 'Rarità n.d.'}
          </span>
          {carta.prezzoSuggerito != null ? (
            <span className="rounded-full bg-giallo-400 px-3 py-1 text-sm font-bold text-blu-900">
              {formattaPrezzo(carta.prezzoSuggerito)}
            </span>
          ) : (
            <span className="text-xs font-medium text-testo/70">Prezzo non disponibile</span>
          )}
        </div>
        <Button
          variante={carta.giaImportata ? 'chiaro' : 'primario'}
          dimensione="sm"
          className="mt-1 w-full"
          disabled={carta.giaImportata}
          onClick={() => setFormAperto(true)}
        >
          {carta.giaImportata ? (
            <>
              <CircleCheck aria-hidden className="size-4" />
              Già importata
            </>
          ) : (
            <>
              <Download aria-hidden className="size-4" />
              Importa
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {formAperto && !carta.giaImportata && <FormImporta carta={carta} onChiudi={() => setFormAperto(false)} />}
      </AnimatePresence>
    </motion.li>
  )
}
