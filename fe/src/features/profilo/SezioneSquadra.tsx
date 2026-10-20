import { Link } from 'react-router'
import { numeroFormattato, spriteUrl, trovaPokemon } from '../pokedex/pokedex'
import { CasellaVuota, SezioneProfilo } from './SezioneProfilo'

const POSTI = 6

// la squadra: sei posti, il primo è il compagno. Un Pokémon porta alla sua pagina del Pokédex
export function SezioneSquadra({ squadra, onModifica }: { squadra: number[]; onModifica: () => void }) {
  return (
    <SezioneProfilo titolo="La mia squadra" sottotitolo="Fino a sei Pokémon: il primo è il tuo compagno" onModifica={onModifica}>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: POSTI }, (_, posto) => {
          const pokemon = squadra[posto] !== undefined ? trovaPokemon(squadra[posto]) : undefined
          return (
            <li key={posto} className="aspect-[4/5]">
              {pokemon ? (
                <Link
                  to={`/pokedex/${pokemon.numero}`}
                  className="flex h-full flex-col items-center justify-center rounded-2xl bg-tenue/60 p-2 text-center transition-colors hover:bg-tenue"
                >
                  <img src={spriteUrl(pokemon.numero)} alt="" loading="lazy" className="size-16 [image-rendering:pixelated] sm:size-20" />
                  <span className="w-full truncate text-sm font-semibold text-testo">{pokemon.nome}</span>
                  <span className="text-xs text-testo/60">{posto === 0 ? 'Compagno' : numeroFormattato(pokemon.numero)}</span>
                </Link>
              ) : (
                <CasellaVuota etichetta="Aggiungi un Pokémon alla squadra" onClick={onModifica} className="h-full w-full" />
              )}
            </li>
          )
        })}
      </ul>
    </SezioneProfilo>
  )
}
