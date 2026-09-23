import { BadgeCheck, CalendarDays } from 'lucide-react'
import { useRef } from 'react'
import type { Oggetto } from '../types/api'
import { formattaData, formattaPrezzo } from '../utils/formato'
import { HoloCard } from './HoloCard'
import { ImmagineCarta } from './ImmagineCarta'
import { Modale } from './Modale'
import { PulsanteCuore } from './PulsanteCuore'

interface Props {
  oggetto: Oggetto | null
  preferito: boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onChiudi: () => void
}

export function ModaleCarta({ oggetto, preferito, onTogglePreferito, onChiudi }: Props) {
  // l'ultimo oggetto resta visibile durante l'animazione di chiusura
  const ultimo = useRef<Oggetto | null>(null)
  if (oggetto) ultimo.current = oggetto
  const mostrato = ultimo.current

  return (
    <Modale aperto={oggetto !== null} onChiudi={onChiudi} larghezza="max-w-4xl">
      {mostrato && (
        <div className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
          <HoloCard className="mx-auto w-full max-w-sm rounded-3xl">
            <ImmagineCarta
              src={mostrato.immagineUrl}
              alt={mostrato.nome}
              priorita
              className="aspect-[63/88] w-full rounded-3xl shadow-2xl shadow-blu-900/30"
            />
          </HoloCard>

          <div className="space-y-5">
            {mostrato.idEsterno && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blu-50 px-3 py-1 text-xs font-semibold text-blu-700">
                <BadgeCheck aria-hidden className="size-4" />
                Carta originale da collezione
              </span>
            )}
            <h2 className="text-3xl font-semibold leading-tight text-blu-900 sm:text-4xl">{mostrato.nome}</h2>
            <p className="inline-block rounded-2xl bg-giallo-400 px-5 py-2 font-titolo text-3xl font-bold text-blu-900 shadow-lg shadow-giallo-400/40">
              {formattaPrezzo(mostrato.prezzo)}
            </p>
            <p className="flex items-center gap-2 text-sm text-blu-900/70">
              <CalendarDays aria-hidden className="size-4" />
              Nel catalogo dal {formattaData(mostrato.createdAt)}
            </p>
            <div className="flex items-center gap-3 rounded-2xl bg-blu-50 p-3 pr-5">
              <PulsanteCuore attivo={preferito} onToggle={() => onTogglePreferito(mostrato)} nome={mostrato.nome} />
              <span className="text-sm font-semibold text-blu-900">
                {preferito ? 'Nei tuoi preferiti' : 'Aggiungi ai preferiti'}
              </span>
            </div>
          </div>
        </div>
      )}
    </Modale>
  )
}
