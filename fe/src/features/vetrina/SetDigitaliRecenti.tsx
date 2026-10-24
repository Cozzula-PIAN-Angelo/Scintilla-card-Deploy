import { Skeleton } from '../../components/Skeleton'
import { useGetAnteprimeDigitaliQuery } from '../espansioni/espansioniApi'
import { CLASSI_GRIGLIA, SetConCarteDietro } from './SetRecenti'

// una riga sola: i set di TCG Pocket già scaricati, dal più nuovo, con lo stesso ventaglio dei set recenti
export function SetDigitaliRecenti() {
  const { data, isLoading } = useGetAnteprimeDigitaliQuery()
  if (!isLoading && !data?.length) return null

  return (
    <section aria-labelledby="set-digitali-recenti">
      <h2 id="set-digitali-recenti" className="mb-2 text-3xl font-bold text-testo">
        Set digitali recenti
      </h2>
      <p className="mb-6 text-testo/70">Gli ultimi set di TCG Pocket, il gioco per telefono.</p>
      {isLoading ? (
        <div role="status" aria-label="Caricamento dei set digitali" className={CLASSI_GRIGLIA}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="mt-28 h-40 rounded-3xl sm:mt-36" />
          ))}
        </div>
      ) : (
        <ul className={CLASSI_GRIGLIA}>
          {data?.map((anteprima) => (
            <SetConCarteDietro key={anteprima.espansione.id} anteprima={anteprima} />
          ))}
        </ul>
      )}
    </section>
  )
}
