import { BadgeCheck, CalendarDays } from 'lucide-react'
import { useRef, useState } from 'react'
import { varianteEffetto } from '../features/collezione/conteggi'
import { SezioneCollezione } from '../features/collezione/SezioneCollezione'
import type { Oggetto, Variante } from '../types/api'
import { formattaData, formattaPrezzo } from '../utils/formato'
import { HoloCard } from './HoloCard'
import { ImmagineCarta } from './ImmagineCarta'
import { Modale } from './Modale'
import { PulsanteCuore } from './PulsanteCuore'

// ciò che il dettaglio usa della collezione; senza (ospite, altre pagine) la sezione non c'è
export interface CollezioneModale {
  perVariante(id: string): Map<Variante, number>
  modifica(oggetto: Oggetto, variante: Variante, delta: number): void
}

interface Props {
  oggetto: Oggetto | null
  preferito: boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onChiudi: () => void
  collezione?: CollezioneModale
}

export function ModaleCarta({ oggetto, preferito, onTogglePreferito, onChiudi, collezione }: Props) {
  // l'ultimo oggetto resta visibile durante l'animazione di chiusura
  const ultimo = useRef<Oggetto | null>(null)
  if (oggetto) ultimo.current = oggetto
  const mostrato = ultimo.current
  // variante scelta con un clic su una riga; vale solo per la carta per cui è stata scelta,
  // così aprendo un'altra carta si riparte dalla regola di default
  const [scelta, setScelta] = useState<{ id: string; variante: Variante } | null>(null)
  // a ogni apertura (anche della stessa carta) la scelta riparte da zero; alla chiusura no,
  // così durante l'animazione la carta resta com'era
  const [idAperto, setIdAperto] = useState<string | null>(null)
  const idCorrente = oggetto?.id ?? null
  if (idCorrente !== idAperto) {
    setIdAperto(idCorrente)
    if (idCorrente !== null) setScelta(null)
  }
  const perVariante = mostrato && collezione ? collezione.perVariante(mostrato.id) : undefined
  const effetto = mostrato
    ? scelta?.id === mostrato.id
      ? scelta.variante
      : varianteEffetto(mostrato, perVariante)
    : null

  return (
    <Modale aperto={oggetto !== null} onChiudi={onChiudi} larghezza="max-w-4xl">
      {mostrato && (
        <div className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
          <HoloCard className="mx-auto w-full max-w-sm rounded-3xl" variante={effetto}>
            <ImmagineCarta
              src={mostrato.immagineUrl}
              alt={mostrato.nome}
              priorita
              className="aspect-[63/88] w-full rounded-3xl shadow-2xl shadow-ombra/30"
            />
          </HoloCard>

          <div className="space-y-5">
            {mostrato.idEsterno && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-tenue px-3 py-1 text-xs font-semibold text-testo-2">
                <BadgeCheck aria-hidden className="size-4" />
                Carta originale da collezione
              </span>
            )}
            <h2 className="text-3xl font-semibold leading-tight text-testo sm:text-4xl">{mostrato.nome}</h2>
            <p className="inline-block rounded-2xl bg-giallo-400 px-5 py-2 font-titolo text-3xl font-bold text-blu-900 shadow-lg shadow-giallo-400/40">
              {formattaPrezzo(mostrato.prezzo)}
            </p>
            <p className="flex items-center gap-2 text-sm text-testo/70">
              <CalendarDays aria-hidden className="size-4" />
              Nel catalogo dal {formattaData(mostrato.createdAt)}
            </p>
            <div className="flex items-center gap-3 rounded-2xl bg-tenue p-3 pr-5">
              <PulsanteCuore attivo={preferito} onToggle={() => onTogglePreferito(mostrato)} nome={mostrato.nome} />
              <span className="text-sm font-semibold text-testo">
                {preferito ? 'Nei tuoi preferiti' : 'Aggiungi ai preferiti'}
              </span>
            </div>
            {collezione && perVariante && (
              <SezioneCollezione
                oggetto={mostrato}
                perVariante={perVariante}
                onModifica={(variante, delta) => collezione.modifica(mostrato, variante, delta)}
                selezionata={effetto}
                onSeleziona={(variante) => setScelta({ id: mostrato.id, variante })}
              />
            )}
          </div>
        </div>
      )}
    </Modale>
  )
}
