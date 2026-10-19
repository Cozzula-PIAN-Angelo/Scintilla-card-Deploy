import { ChartPie, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { messaggioErrore } from '../app/errori'
import { LinkBottone } from '../components/Button'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { Skeleton } from '../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../components/StatiPagina'
import { ETICHETTE, VARIANTI } from '../features/collezione/varianti'
import { SezionePokedex } from '../features/statistiche/SezionePokedex'
import { SezioneSet } from '../features/statistiche/SezioneSet'
import { SezioneValore } from '../features/statistiche/SezioneValore'
import { useGetStatisticheQuery } from '../features/statistiche/statisticheApi'
import { useTitolo } from '../hooks/useTitolo'
import type { Statistiche } from '../types/api'

// statistiche complete della collezione; il riepilogo semplice sta nella pagina Binder.
// I totali sono la frase della testata; sotto, set e Pokédex a sinistra e il valore in una colonna fissa
export function CollezionePage() {
  useTitolo('La mia collezione')
  // si rilegge a ogni apertura: aprire un set per la prima volta lo importa (e ne rende noto il master)
  // senza toccare la cache delle statistiche
  const { data, isLoading, isError, error, refetch } = useGetStatisticheQuery(undefined, { refetchOnMountOrArgChange: true })

  return (
    <PaginaAnimata>
      <section className="bg-notte-2 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="flex items-center gap-3 text-4xl font-bold sm:text-5xl">
            <ChartPie aria-hidden className="size-9 text-giallo-400" />
            La mia collezione
          </h1>
          {data && data.totali.carteDiverse > 0 ? (
            <Riassunto totali={data.totali} />
          ) : (
            <p className="mt-2 text-white">A che punto sei con set e Pokédex, e quanto vale quello che hai.</p>
          )}
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {isLoading ? (
          <div role="status" aria-label="Caricamento delle statistiche" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <Skeleton className="h-[32rem] rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
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
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="grid gap-6">
              <SezioneSet set={data.set} />
              <SezionePokedex pokemon={data.pokemon} />
            </div>
            {/* da desktop il valore resta in vista mentre si scorrono set e Pokédex */}
            <aside className="lg:sticky lg:top-24">
              <SezioneValore valore={data.valore} />
            </aside>
          </div>
        )}
      </div>
    </PaginaAnimata>
  )
}

// i totali come una frase, con i numeri in evidenza; varianti e binder in chip sotto
function Riassunto({ totali }: { totali: Statistiche['totali'] }) {
  const n = (valore: number): ReactNode => <strong className="font-bold text-giallo-400 tabular-nums">{valore.toLocaleString('it-IT')}</strong>
  return (
    <>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white sm:text-xl">
        {n(totali.copie)} {totali.copie === 1 ? 'copia' : 'copie'} di {n(totali.carteDiverse)}{' '}
        {totali.carteDiverse === 1 ? 'carta diversa' : 'carte diverse'}, da {n(totali.setIniziati)} set: {n(totali.setCompletati)}{' '}
        {totali.setCompletati === 1 ? 'completato' : 'completati'}.
      </p>
      <ul className="mt-5 flex flex-wrap gap-2 text-sm">
        {VARIANTI.filter((v) => (totali.copiePerVariante[v] ?? 0) > 0).map((v) => (
          <li key={v} className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">
            {ETICHETTE[v]} <span className="font-semibold tabular-nums">{totali.copiePerVariante[v]}</span>
          </li>
        ))}
        <li className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">
          Binder <span className="font-semibold tabular-nums">{totali.binder}</span> · carte nei binder{' '}
          <span className="font-semibold tabular-nums">{totali.carteNeiBinder}</span>
        </li>
      </ul>
    </>
  )
}
