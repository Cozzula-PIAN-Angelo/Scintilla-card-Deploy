import { motion, useIsPresent } from 'framer-motion'
import { Check, Eye, Move, Trash2, X, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react'
import { Button } from '../../../components/Button'
import { ImmagineOPlaceholder } from '../../../components/ImmagineCarta'
import { useSpazioAvviso } from '../../../hooks/useSpazioAvviso'
import { varianteMostrata } from '../../collezione/conteggi'
import { fasciaDellaVariante, testoFascia } from '../../oggetti/fasciaPrezzo'
import { useGetPrezziCartaQuery } from '../../oggetti/oggettiApi'
import type { SlotBinder } from '../../../types/api'
import { cn } from '../../../utils/cn'
import { ID_BARRA_TASCA, useContestoBinder, type Sorgente } from '../contesto'
import { useCollezioneBinder } from '../contestoCollezione'

// la carta toccata resta scoperta nella sua tasca: le azioni stanno qui, dove compare anche l'avviso della carta in mano
export function BarraTasca({ carta, onChiudi }: { carta: SlotBinder; onChiudi: () => void }) {
  const binder = useContestoBinder()
  const collezione = useCollezioneBinder()
  const { oggetto, variante, pagina, posizione } = carta
  // mentre esce la barra resta com'era: dopo Togli il dettaglio si rilegge senza la carta, e la sua collezione
  // (solo le carte nel binder) non la conta più. Ricalcolando, "Ce l'ho" ricomparirebbe per un attimo, e la fascia
  // di prezzo passerebbe dalla Reverse alla normale
  const presente = useIsPresent()
  const ultimo = useRef({ mancante: false, haReverse: false })
  if (presente) {
    ultimo.current = {
      mancante: !!collezione?.mostraMancanti && !collezione.possiede(oggetto.id, variante),
      haReverse: !!collezione?.possiede(oggetto.id, 'REVERSE_HOLO'),
    }
  }
  const { mancante, haReverse } = ultimo.current
  const dettagli = [oggetto.rarita, variante === 'REVERSE_HOLO' && 'Reverse holo', mancante && "Non ce l'hai"].filter(Boolean).join(' · ')
  // fascia di Cardmarket per la stessa variante che mostra il dettaglio aperto dal binder; senza dati niente riga
  const { data: prezzi } = useGetPrezziCartaQuery(oggetto.id, { skip: !oggetto.idEsterno })
  const fascia = prezzi ? fasciaDellaVariante(prezzi, varianteMostrata(variante, haReverse)) : null
  const barra = useRef<HTMLDivElement>(null)
  const prima = useRef<HTMLButtonElement>(null)
  useSpazioAvviso(barra)

  // a ogni carta toccata il focus va su Guarda; chiudendo dalla barra (✕, Esc) torna alla tasca.
  // Layout effect: la sua pulizia gira prima che la barra esca dal DOM, quando il focus è ancora dentro
  useLayoutEffect(() => {
    prima.current?.focus({ preventScroll: true })
    const elemento = barra.current
    return () => {
      if (elemento?.contains(document.activeElement)) {
        document.querySelector<HTMLElement>(`[data-tasca="${pagina}-${posizione}"]`)?.focus({ preventScroll: true })
      }
    }
  }, [pagina, posizione])

  // un tocco altrove la chiude (e quel tocco fa comunque la sua parte). Restano fuori le tasche, che col loro
  // tocco cambiano carta o la chiudono già, e i toast, così un Annulla non fa perdere la carta scelta
  useEffect(() => {
    function tocco(evento: PointerEvent) {
      const bersaglio = evento.target as Element | null
      if (bersaglio?.closest(`#${ID_BARRA_TASCA}, [data-tasca], [aria-live]`)) return
      onChiudi()
    }
    document.addEventListener('pointerdown', tocco, true)
    return () => document.removeEventListener('pointerdown', tocco, true)
  }, [onChiudi])

  return (
    <motion.div
      ref={barra}
      id={ID_BARRA_TASCA}
      role="toolbar"
      aria-label={`Carta: ${oggetto.nome}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={cn(
        'fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[48] mx-auto grid max-w-2xl items-center gap-x-3 gap-y-2 rounded-2xl bg-blu-900 p-2 text-white shadow-2xl shadow-ombra/40 scuro:ring-1 scuro:ring-white/15',
        // telefono: carta e ✕ sopra, azioni sotto a tutta larghezza; da sm tutto su una riga, larga quanto serve
        'grid-cols-[auto_minmax(0,1fr)_auto] sm:w-fit sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]',
      )}
    >
      <ImmagineOPlaceholder
        src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl}
        nome={oggetto.nome}
        alt=""
        className={cn('aspect-[63/88] w-10 shrink-0 rounded-md object-fill', mancante && 'grayscale')}
      />
      <div className="min-w-0 sm:max-w-64">
        <p className="truncate font-semibold">{oggetto.nome}</p>
        {dettagli && <p className="truncate text-xs text-white/70">{dettagli}</p>}
        {fascia && (
          <p className="truncate text-xs font-semibold tabular-nums text-giallo-400">
            {testoFascia(fascia).fascia} <span className="font-normal text-white/70">su Cardmarket</span>
          </p>
        )}
      </div>
      <div className="col-span-full row-start-2 flex items-stretch gap-1 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:gap-0.5">
        <AzioneBarra
          rif={prima}
          icona={Eye}
          etichetta="Guarda"
          onClick={() => binder.guarda({ oggetto, variante, pagina, posizione })}
        />
        <AzioneBarra
          icona={Move}
          etichetta="Sposta"
          suggerimento="Sposta: poi tocca la tasca di arrivo"
          onClick={() => binder.prendi({ tipo: 'tasca', oggetto, pagina, posizione })}
        />
        {mancante && collezione && (
          <AzioneBarra icona={Check} etichetta="Ce l'ho" onClick={() => collezione.ceLho(oggetto, variante)} />
        )}
        <span aria-hidden className="mx-0.5 w-px shrink-0 self-stretch bg-white/15" />
        <AzioneBarra
          icona={Trash2}
          etichetta="Togli"
          suggerimento="Togli dal binder"
          pericolo
          onClick={() => binder.togli({ pagina, posizione })}
        />
      </div>
      <button
        type="button"
        onClick={onChiudi}
        aria-label="Chiudi"
        title="Chiudi"
        className="col-start-3 row-start-1 grid size-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:col-start-4"
      >
        <X aria-hidden className="size-5" />
      </button>
    </motion.div>
  )
}

function AzioneBarra({
  icona: Icona,
  etichetta,
  suggerimento,
  pericolo = false,
  rif,
  onClick,
}: {
  icona: LucideIcon
  etichetta: string
  suggerimento?: string
  pericolo?: boolean
  rif?: Ref<HTMLButtonElement>
  onClick: () => void
}) {
  return (
    <button
      ref={rif}
      type="button"
      onClick={onClick}
      title={suggerimento}
      className={cn(
        'group flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors',
        'sm:flex-none sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm',
        pericolo ? 'hover:bg-rosso-700 active:bg-rosso-700' : 'hover:bg-white/10 active:bg-white/15',
      )}
    >
      <Icona
        aria-hidden
        className={cn('size-5 shrink-0 transition-colors sm:size-4', pericolo ? 'text-rosso-500 group-hover:text-white' : 'text-giallo-400')}
      />
      {etichetta}
    </button>
  )
}

export function AvvisoInMano({ sorgente, onAnnulla }: { sorgente: Sorgente; onAnnulla: () => void }) {
  const avviso = useRef<HTMLDivElement>(null)
  useSpazioAvviso(avviso)
  return (
    <motion.div
      ref={avviso}
      role="status"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed inset-x-4 bottom-6 z-[48] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-blu-900 p-2 pr-3 text-white shadow-2xl shadow-ombra/40 scuro:ring-1 scuro:ring-white/15"
    >
      <ImmagineOPlaceholder
        src={sorgente.oggetto.immagineUrlPiccola ?? sorgente.oggetto.immagineUrl}
        nome={sorgente.oggetto.nome}
        alt=""
        className="aspect-[63/88] w-10 shrink-0 rounded-md object-fill"
      />
      <p className="min-w-0 flex-1 text-sm">
        {sorgente.tipo === 'carta' ? 'Tocca una tasca per inserire ' : 'Tocca la tasca di arrivo per '}
        <strong className="text-giallo-400">{sorgente.oggetto.nome}</strong>
      </p>
      <Button variante="suScuro" dimensione="sm" onClick={onAnnulla}>
        Annulla
      </Button>
    </motion.div>
  )
}

// trascinando una carta fuori da una tasca compare il cestino per toglierla dal binder
export function Cestino() {
  const binder = useContestoBinder()
  const [sopra, setSopra] = useState(false)
  const sorgente = binder.trascinata
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      onDragOver={(e) => {
        e.preventDefault()
        setSopra(true)
      }}
      onDragLeave={() => setSopra(false)}
      onDrop={(e) => {
        e.preventDefault()
        if (sorgente?.tipo === 'tasca') binder.togli({ pagina: sorgente.pagina, posizione: sorgente.posizione })
        binder.fineTrascinamento()
      }}
      className={cn(
        'fixed bottom-6 left-1/2 z-[48] flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-4 font-semibold text-white shadow-2xl transition-[background-color,transform]',
        sopra ? 'scale-110 bg-rosso-500' : 'bg-rosso-700',
      )}
    >
      <Trash2 aria-hidden className="size-5" />
      Rilascia qui per togliere la carta
    </motion.div>
  )
}
