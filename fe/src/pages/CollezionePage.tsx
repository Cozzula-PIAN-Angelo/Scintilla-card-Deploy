import { ChartPie, Sparkles } from 'lucide-react'
import { messaggioErrore } from '../app/errori'
import { LinkBottone } from '../components/Button'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { Skeleton } from '../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../components/StatiPagina'
import { SezionePokedex } from '../features/statistiche/SezionePokedex'
import { SezioneSet } from '../features/statistiche/SezioneSet'
import { SezioneTotali } from '../features/statistiche/SezioneTotali'
import { SezioneValore } from '../features/statistiche/SezioneValore'
import { useGetStatisticheQuery } from '../features/statistiche/statisticheApi'
import { useTitolo } from '../hooks/useTitolo'

// statistiche complete della collezione; il riepilogo semplice sta nella pagina Binder
export function CollezionePage() {
  useTitolo('La mia collezione')
  const { data, isLoading, isError, error, refetch } = useGetStatisticheQuery()

  return (
    <PaginaAnimata>
      <section className="bg-notte-2 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="flex items-center gap-3 text-4xl font-bold sm:text-5xl">
            <ChartPie aria-hidden className="size-9 text-giallo-400" />
            La mia collezione
          </h1>
          <p className="mt-2 text-white">A che punto sei con set e Pokédex, e quanto vale quello che hai.</p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {isLoading ? (
          <div role="status" aria-label="Caricamento delle statistiche" className="grid gap-6 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-3xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <StatoErrore messaggio={messaggioErrore(error, 'Non è stato possibile caricare le statistiche.')} onRiprova={refetch} />
        ) : data.totali.carteDiverse === 0 ? (
          <StatoVuoto
            icona={<Sparkles aria-hidden className="size-16" />}
            titolo="La collezione è ancora vuota"
            testo="Segna le carte che possiedi dalle pagine dei set o dei Pokémon: qui vedrai a che punto sei."
            azione={
              <LinkBottone to="/pokedex" variante="primario" dimensione="lg">
                Apri il Pokédex
              </LinkBottone>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <SezioneTotali totali={data.totali} />
            <SezioneValore valore={data.valore} />
            <SezioneSet set={data.set} />
            <SezionePokedex pokemon={data.pokemon} />
          </div>
        )}
      </div>
    </PaginaAnimata>
  )
}
