import { Pencil, Settings } from 'lucide-react'
import { Avatar } from '../../components/Avatar'
import { Button, LinkBottone } from '../../components/Button'
import type { Profilo } from '../../types/api'
import { scuro } from '../binder/aspetto'
import { numeroFormattato, spriteUrl, trovaPokemon } from '../pokedex/pokedex'
import { inizioFascia } from './colore'

// senza colore scelto: il blu delle fasce d'intestazione delle altre pagine (blu-700)
const COLORE_PREDEFINITO = '#1b4f8a'

function mese(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date(iso))
}

// fascia in alto: avatar, nome, bio e il compagno (il primo della squadra)
export function IntestazioneProfilo({ profilo, onModifica }: { profilo: Profilo; onModifica: () => void }) {
  const colore = profilo.colore ?? COLORE_PREDEFINITO
  const compagno = profilo.squadra.length > 0 ? trovaPokemon(profilo.squadra[0]) : undefined

  return (
    <section
      // il colore scelto sfuma verso uno più scuro; se è chiaro parte già scurito, per il testo bianco (vedi inizioFascia)
      style={{ backgroundImage: `linear-gradient(135deg, ${inizioFascia(colore)}, ${scuro(colore, 55)})` }}
      className="text-white"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
        <Avatar utente={profilo} className="size-24 text-4xl shadow-xl sm:size-28" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-4xl font-bold sm:text-5xl">{profilo.username}</h1>
          {profilo.iscrittoIl && <p className="mt-1 text-sm text-white/80">Collezionista da {mese(profilo.iscrittoIl)}</p>}
          {profilo.bio ? (
            <p className="mt-3 max-w-prose whitespace-pre-line text-white/95">{profilo.bio}</p>
          ) : (
            <p className="mt-3 text-white/70">Scrivi due righe su di te e sulla tua collezione.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variante="secondario" dimensione="sm" onClick={onModifica}>
              <Pencil aria-hidden className="size-4" />
              Modifica profilo
            </Button>
            <LinkBottone to="/profilo/impostazioni" variante="suScuro" dimensione="sm">
              <Settings aria-hidden className="size-4" />
              Impostazioni
            </LinkBottone>
          </div>
        </div>
        {compagno && (
          <figure className="flex shrink-0 flex-col items-center self-center rounded-3xl bg-white/10 px-5 py-3 ring-1 ring-white/20">
            <img
              src={spriteUrl(compagno.numero)}
              alt=""
              className="size-28 [image-rendering:pixelated] drop-shadow-lg"
            />
            <figcaption className="text-center">
              <span className="block text-xs font-semibold uppercase tracking-wide text-giallo-400">Compagno</span>
              <span className="font-semibold">{compagno.nome}</span>{' '}
              <span className="text-sm text-white/70">{numeroFormattato(compagno.numero)}</span>
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  )
}
