import { useState } from 'react'
import { messaggioErrore } from '../app/errori'
import { ModaleCarta } from '../components/ModaleCarta'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { Skeleton } from '../components/Skeleton'
import { StatoErrore } from '../components/StatiPagina'
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { IntestazioneProfilo } from '../features/profilo/IntestazioneProfilo'
import { useGetProfiloQuery } from '../features/profilo/profiloApi'
import { RiepilogoProfilo } from '../features/profilo/RiepilogoProfilo'
import { SezioneBinderEvidenza } from '../features/profilo/SezioneBinderEvidenza'
import { SezioneSquadra } from '../features/profilo/SezioneSquadra'
import { SezioneVetrina } from '../features/profilo/SezioneVetrina'
import { useCartaSelezionata } from '../hooks/useCartaSelezionata'
import { useTitolo } from '../hooks/useTitolo'

export type Modifica = 'profilo' | 'squadra' | 'vetrina' | 'binder'

// il profilo come lo vedrebbero gli altri, modificabile sul posto: ogni sezione apre la sua modale
export function ProfiloPage() {
  useTitolo('Il mio profilo')
  const { data: profilo, isLoading, isError, error, refetch } = useGetProfiloQuery()
  const [, setModifica] = useState<Modifica | null>(null)
  const preferiti = usePreferiti()
  // le frecce del dettaglio sfogliano le carte della vetrina
  const { apri, modale } = useCartaSelezionata(preferiti, undefined, profilo?.vetrina)

  return (
    <PaginaAnimata className="min-h-[70vh]">
      {isLoading ? (
        <div role="status" aria-label="Caricamento del profilo">
          <Skeleton className="h-64 rounded-none" />
          <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-56 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
          </div>
        </div>
      ) : isError || !profilo ? (
        <div className="px-4 py-16">
          <StatoErrore messaggio={messaggioErrore(error, 'Non è stato possibile caricare il profilo.')} onRiprova={refetch} />
        </div>
      ) : (
        <>
          <IntestazioneProfilo profilo={profilo} onModifica={() => setModifica('profilo')} />
          <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
            <RiepilogoProfilo riepilogo={profilo.riepilogo} />
            <SezioneSquadra squadra={profilo.squadra} onModifica={() => setModifica('squadra')} />
            <SezioneVetrina vetrina={profilo.vetrina} onApri={apri} onModifica={() => setModifica('vetrina')} />
            <SezioneBinderEvidenza binder={profilo.binder} onModifica={() => setModifica('binder')} />
          </div>
        </>
      )}

      <ModaleCarta {...modale} />
    </PaginaAnimata>
  )
}
