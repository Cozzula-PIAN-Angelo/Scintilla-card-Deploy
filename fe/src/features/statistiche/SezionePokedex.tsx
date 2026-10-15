import { useState } from 'react'
import { Link } from 'react-router'
import { cn } from '../../utils/cn'
import { numeroFormattato, spriteUrl } from '../pokedex/pokedex'
import { Barra } from './Barra'
import { avanzamentoPokedex, percentuale } from './calcoli'
import { Sezione } from './Sezione'

// una tessera per generazione con lo sprite del primo Pokémon della regione; la scelta apre i mancanti sotto
export function SezionePokedex({ pokemon }: { pokemon: number[] }) {
  const { posseduti, totale, generazioni } = avanzamentoPokedex(pokemon)
  const [scelta, setScelta] = useState<number | null>(null)
  const aperta = generazioni.find((g) => g.generazione.numero === scelta)

  return (
    <Sezione titolo="Pokédex">
      <p className="flex items-baseline gap-2 tabular-nums">
        <span className="font-titolo text-4xl font-bold text-testo">{posseduti}</span>
        <span className="text-testo/70">
          / {totale} Pokémon · {percentuale(posseduti, totale)}%
        </span>
      </p>
      <Barra valore={posseduti} totale={totale} className="mt-2 h-3" />

      <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {generazioni.map(({ generazione, posseduti: g, totale: t }) => {
          const attiva = scelta === generazione.numero
          return (
            <li key={generazione.numero}>
              <button
                type="button"
                aria-expanded={attiva}
                onClick={() => setScelta(attiva ? null : generazione.numero)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-2xl p-2 text-left ring-1 transition-colors',
                  attiva ? 'bg-blu-500/10 ring-blu-500' : 'ring-linea/10 hover:bg-tenue',
                )}
              >
                <img src={spriteUrl(generazione.da)} alt="" width={48} height={48} loading="lazy" className="sprite-pixel size-12 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-testo">{generazione.regione}</span>
                  <span className="block text-xs tabular-nums text-testo/70">
                    {g} / {t}
                  </span>
                  <Barra valore={g} totale={t} className="mt-1" colore={g === t ? 'bg-giallo-400' : undefined} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {aperta && (
        <div className="mt-4 rounded-2xl bg-tenue/60 p-3">
          <h3 className="mb-2 text-sm font-semibold text-testo">
            {aperta.mancanti.length === 0
              ? `${aperta.generazione.regione}: generazione completa!`
              : `Mancano ${aperta.mancanti.length} Pokémon di ${aperta.generazione.regione}`}
          </h3>
          {aperta.mancanti.length > 0 && (
            <ul className="grid max-h-80 grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1 overflow-y-auto">
              {aperta.mancanti.map((p) => (
                <li key={p.numero}>
                  <Link
                    to={`/pokedex/${p.numero}`}
                    title={`${numeroFormattato(p.numero)} ${p.nome}`}
                    className="grid place-items-center rounded-xl p-1 transition-colors hover:bg-superficie"
                  >
                    <img src={spriteUrl(p.numero)} alt={p.nome} width={48} height={48} loading="lazy" className="sprite-pixel size-12 opacity-55 grayscale" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sezione>
  )
}
