import { ArrowDownWideNarrow, ArrowLeft, BetweenHorizontalStart, Book, BookOpen, Layers, Maximize2, Minimize2, Settings2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import type { Binder } from '../../../types/api'
import { cn } from '../../../utils/cn'
import type { Fase } from './costanti'

interface Props {
  binder: Binder
  carteInserite: number
  fase: Fase
  doppia: boolean
  cassettoLaterale: boolean
  espanso: boolean
  faiSpazio: boolean
  onApri: () => void
  onChiudi: (destinazione: 'mensola' | 'resta') => void
  onCarte: () => void
  onAlternaEspanso: () => void
  onImpostazioni: (binder: Binder) => void
  onFaiSpazio: (acceso: boolean) => void
  onOrdina: () => void
}

// barra sopra il binder aperto: ritorno ai binder, nome e conteggio, Apri/Chiudi, carte, Fai spazio,
// Ordina per, schermo intero e impostazioni
export function BarraBinder({
  binder,
  carteInserite,
  fase,
  doppia,
  cassettoLaterale,
  espanso,
  faiSpazio,
  onApri,
  onChiudi,
  onCarte,
  onAlternaEspanso,
  onImpostazioni,
  onFaiSpazio,
  onOrdina,
}: Props) {
  return (
  <div className="flex shrink-0 items-center gap-3">
    <Button
      variante="chiaro"
      dimensione="sm"
      onClick={() => onChiudi('mensola')}
      disabled={fase !== 'aperto' && fase !== 'chiuso'}
      aria-label="Chiudi il binder e torna ai miei binder"
    >
      <ArrowLeft aria-hidden className="size-4" />
      <span className="hidden sm:inline">I miei binder</span>
    </Button>
    <div className="flex min-w-0 flex-1 items-baseline justify-center gap-3">
      <h1 className="truncate text-xl font-bold text-testo sm:text-2xl">{binder.nome}</h1>
      <p className="shrink-0 text-sm text-testo/70">
        {carteInserite} / {binder.pagine * binder.tasche} carte
      </p>
    </div>
    <div className="flex gap-2">
      <Button
        variante="chiaro"
        dimensione="sm"
        onClick={() => (fase === 'chiuso' ? onApri() : onChiudi('resta'))}
        disabled={fase === 'apertura' || fase === 'chiusura'}
        aria-label={fase === 'chiuso' ? 'Apri il binder' : 'Chiudi il binder'}
        title={fase === 'chiuso' ? 'Apri il binder' : 'Chiudi il binder'}
      >
        {fase === 'chiuso' ? <BookOpen aria-hidden className="size-4" /> : <Book aria-hidden className="size-4" />}
        <span className="hidden sm:inline">{fase === 'chiuso' ? 'Apri' : 'Chiudi'}</span>
      </Button>
      <Button
        variante="chiaro"
        dimensione="sm"
        onClick={onCarte}
        aria-pressed={doppia ? cassettoLaterale : undefined}
        aria-label={doppia ? (cassettoLaterale ? 'Nascondi le carte' : 'Mostra le carte') : 'Aggiungi carte'}
      >
        <Layers aria-hidden className="size-4" />
        <span className="hidden sm:inline">Carte</span>
      </Button>
      <Button
        variante="chiaro"
        dimensione="sm"
        onClick={() => onFaiSpazio(!faiSpazio)}
        aria-pressed={faiSpazio}
        title={faiSpazio ? 'Fai spazio acceso: le carte scalano invece di essere sostituite' : 'Fai spazio spento'}
        className={cn(faiSpazio && 'bg-blu-500 text-white hover:bg-blu-500/90')}
      >
        <BetweenHorizontalStart aria-hidden className="size-4" />
        <span className="hidden sm:inline">Fai spazio</span>
        <span className="sr-only sm:hidden">Fai spazio</span>
      </Button>
      <Button
        variante="chiaro"
        dimensione="sm"
        onClick={onOrdina}
        disabled={carteInserite === 0}
        aria-label="Ordina le carte"
        title="Ordina per…"
      >
        <ArrowDownWideNarrow aria-hidden className="size-4" />
        <span className="hidden sm:inline">Ordina</span>
      </Button>
      <Button
        variante="chiaro"
        dimensione="sm"
        onClick={onAlternaEspanso}
        aria-pressed={espanso}
        aria-label={espanso ? 'Esci dallo schermo intero' : 'Schermo intero'}
        title={espanso ? 'Esci dallo schermo intero' : 'Schermo intero'}
      >
        {espanso ? <Minimize2 aria-hidden className="size-4" /> : <Maximize2 aria-hidden className="size-4" />}
      </Button>
      <Button variante="chiaro" dimensione="sm" onClick={() => onImpostazioni(binder)} aria-label="Impostazioni del binder" title="Impostazioni">
        <Settings2 aria-hidden className="size-4" />
      </Button>
    </div>
  </div>
  )
}
