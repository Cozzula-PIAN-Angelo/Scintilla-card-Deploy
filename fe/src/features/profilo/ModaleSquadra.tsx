import { Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Campo } from '../../components/Campo'
import { Modale } from '../../components/Modale'
import { useDebounce } from '../../hooks/useDebounce'
import { corrisponde, numeroFormattato, POKEDEX, spriteUrl, trovaPokemon } from '../pokedex/pokedex'
import { useToast } from '../toast/useToast'
import { aggiungi, senzaInvioNeiCampi } from './liste'
import { ListaOrdinabile } from './ListaOrdinabile'
import { PiedeModifica } from './PiedeModifica'
import { useSalvaSquadraMutation } from './profiloApi'

const MASSIMO = 6
// risultati mostrati della ricerca: abbastanza per scegliere, pochi per restare leggeri
const RISULTATI = 24

interface Props {
  aperta: boolean
  onChiudi: () => void
  squadra: number[]
}

export function ModaleSquadra({ aperta, onChiudi, squadra }: Props) {
  return (
    <Modale aperto={aperta} onChiudi={onChiudi} titolo="La mia squadra" larghezza="max-w-2xl">
      <ModuloSquadra squadra={squadra} onChiudi={onChiudi} />
    </Modale>
  )
}

function Sprite({ numero, className }: { numero: number; className: string }) {
  return <img src={spriteUrl(numero)} alt="" loading="lazy" className={`${className} [image-rendering:pixelated]`} />
}

function ModuloSquadra({ squadra, onChiudi }: Omit<Props, 'aperta'>) {
  const [numeri, setNumeri] = useState(squadra)
  const [testo, setTesto] = useState('')
  const filtro = useDebounce(testo.trim().toLowerCase(), 150)
  const [errore, setErrore] = useState<string | null>(null)
  const [salva, { isLoading }] = useSalvaSquadraMutation()
  const toast = useToast()
  const piena = numeri.length >= MASSIMO

  const risultati = useMemo(() => POKEDEX.filter((p) => corrisponde(p, filtro)).slice(0, RISULTATI), [filtro])

  async function invia(evento: FormEvent) {
    evento.preventDefault()
    setErrore(null)
    try {
      await salva(numeri).unwrap()
      toast.successo('Squadra aggiornata')
      onChiudi()
    } catch (e) {
      setErrore(messaggioErrore(e, 'Non è stato possibile salvare la squadra'))
    }
  }

  return (
    <form onSubmit={invia} noValidate className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-testo">
          La squadra <span className="font-normal text-testo/60">{numeri.length}/{MASSIMO} · il primo è il tuo compagno</span>
        </p>
        {numeri.length === 0 ? (
          <p className="rounded-2xl bg-tenue/60 p-4 text-sm text-testo/70">Cerca qui sotto i tuoi Pokémon preferiti.</p>
        ) : (
          <ListaOrdinabile
            voci={numeri}
            chiave={String}
            etichetta={(n) => trovaPokemon(n)?.nome ?? numeroFormattato(n)}
            onCambia={setNumeri}
            render={(n, indice) => (
              <div className="flex items-center gap-3">
                <Sprite numero={n} className="size-10" />
                <span className="truncate text-sm font-semibold text-testo">{trovaPokemon(n)?.nome}</span>
                {indice === 0 && (
                  <span className="rounded-full bg-giallo-400 px-2 py-0.5 text-xs font-semibold text-blu-900">Compagno</span>
                )}
              </div>
            )}
          />
        )}
      </div>

      <div onKeyDown={senzaInvioNeiCampi}>
        <Campo
          etichetta={piena ? 'La squadra è al completo: togli un Pokémon per sceglierne altri' : 'Cerca un Pokémon'}
          placeholder="Nome o numero, es. Pikachu o 25"
          icona={<Search className="size-5" />}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          disabled={piena}
        />
        <ul className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {risultati.map((p) => {
            const scelto = numeri.includes(p.numero)
            return (
              <li key={p.numero}>
                <button
                  type="button"
                  disabled={scelto || piena}
                  onClick={() => setNumeri((n) => aggiungi(n, p.numero, MASSIMO))}
                  className="flex w-full flex-col items-center rounded-2xl p-2 text-center transition-colors hover:bg-tenue disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Sprite numero={p.numero} className="size-14" />
                  <span className="w-full truncate text-xs font-semibold text-testo">{p.nome}</span>
                  <span className="text-xs text-testo/60">{scelto ? 'In squadra' : numeroFormattato(p.numero)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <PiedeModifica errore={errore} inSalvataggio={isLoading} onAnnulla={onChiudi} />
    </form>
  )
}
