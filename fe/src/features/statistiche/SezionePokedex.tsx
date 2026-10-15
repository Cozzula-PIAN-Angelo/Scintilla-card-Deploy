import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router'
import { numeroFormattato, spriteUrl } from '../pokedex/pokedex'
import { Barra } from './Barra'
import { avanzamentoPokedex, percentuale } from './calcoli'
import { Sezione } from './Sezione'

export function SezionePokedex({ pokemon }: { pokemon: number[] }) {
  const { posseduti, totale, generazioni } = avanzamentoPokedex(pokemon)

  return (
    <Sezione titolo="Pokédex">
      <p className="text-3xl font-bold text-testo">
        {posseduti} / {totale}
        <span className="ml-2 text-base font-semibold text-testo/70">{percentuale(posseduti, totale)}%</span>
      </p>
      <Barra valore={posseduti} totale={totale} className="mt-2 h-3" />
      <div className="mt-6 grid gap-2">
        {generazioni.map(({ generazione, posseduti: g, totale: t, mancanti }) => (
          <details key={generazione.numero} className="group rounded-2xl ring-1 ring-linea/10">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
              <span className="w-28 shrink-0 text-sm font-semibold text-testo">
                Gen. {generazione.sigla} · {generazione.regione}
              </span>
              <Barra valore={g} totale={t} className="flex-1" />
              <span className="w-20 shrink-0 text-right text-sm text-testo/80">
                {g} / {t}
              </span>
              <ChevronDown aria-hidden className="size-4 shrink-0 text-testo/60 transition-transform group-open:rotate-180" />
            </summary>
            {mancanti.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-testo/70">Generazione completa!</p>
            ) : (
              <ul aria-label="Pokémon mancanti" className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-1 px-3 pb-3">
                {mancanti.map((p) => (
                  <li key={p.numero}>
                    <Link
                      to={`/pokedex/${p.numero}`}
                      title={`${numeroFormattato(p.numero)} ${p.nome}`}
                      className="grid place-items-center rounded-xl p-1 transition-colors hover:bg-tenue"
                    >
                      <img src={spriteUrl(p.numero)} alt={p.nome} width={56} height={56} loading="lazy" className="sprite-pixel size-14 opacity-60 grayscale" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
    </Sezione>
  )
}
