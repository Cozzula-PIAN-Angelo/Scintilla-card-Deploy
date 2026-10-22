import { Plus } from 'lucide-react'
import { useState, type DragEvent, type PointerEvent } from 'react'
import { ImmagineOPlaceholder } from '../../components/ImmagineCarta'
import type { Oggetto, Variante } from '../../types/api'
import { cn } from '../../utils/cn'
import { ID_BARRA_TASCA, stessaPosizione, TIPO_TRASCINAMENTO, useContestoBinder } from './contesto'
import { effettoCarta, varianteMostrata } from '../collezione/conteggi'
import { useCollezioneBinder } from './contestoCollezione'

interface Props {
  pagina: number
  posizione: number
  oggetto: Oggetto | null
  // REVERSE_HOLO nel binder del master set: segno «R» e grigio solo senza una copia reverse
  variante: Variante | null
}

// Tasca trasparente di una pagina. Accetta carte trascinate (dal cassetto o da un'altra tasca)
// oppure, con un tocco, la carta "in mano". Piena, un tocco la alza e apre la barra in basso (BarraTasca):
// guarda, sposta, ce l'ho, togli. Il menu non sta sulla carta, così resta scoperta
export function Tasca({ pagina, posizione, oggetto, variante }: Props) {
  const binder = useContestoBinder()
  const collezione = useCollezioneBinder()
  const [sopra, setSopra] = useState(false)
  const qui = { pagina, posizione }
  const menuAperto = oggetto !== null && stessaPosizione(binder.tascaAttiva, qui)
  // appena riempita con un tocco dal cassetto
  const evidenziata = stessaPosizione(binder.evidenziata, qui)
  const inMano = binder.inMano
  // la carta in mano è proprio questa: niente destinazione su se stessa
  const eOrigine = inMano?.tipo === 'tasca' && stessaPosizione(inMano, qui)
  const inAttesa = inMano !== null && !eOrigine
  // carta non posseduta: in grigio se il binder lo prevede ('Ce l'ho' la porta a colori)
  const mancante = oggetto !== null && !!collezione?.mostraMancanti && !collezione.possiede(oggetto.id, variante)
  // riflesso come nelle griglie (arcobaleno sulle rare, specchio sulle reverse); niente sulle mancanti in grigio
  const effetto =
    oggetto && !mancante
      ? effettoCarta(oggetto, undefined, varianteMostrata(variante, !!collezione?.possiede(oggetto.id, 'REVERSE_HOLO')))
      : null

  function tocca() {
    if (inAttesa) {
      binder.rilascia(qui, inMano)
      return
    }
    if (eOrigine) {
      binder.prendi(null)
      return
    }
    binder.attivaTasca(oggetto && !menuAperto ? qui : null)
  }

  function trascinaSopra(evento: DragEvent) {
    const sorgente = binder.trascinata
    if (!sorgente || (sorgente.tipo === 'tasca' && stessaPosizione(sorgente, qui))) return
    evento.preventDefault()
    evento.dataTransfer.dropEffect = sorgente.tipo === 'tasca' ? 'move' : 'copy'
    setSopra(true)
  }

  function lascia(evento: DragEvent) {
    evento.preventDefault()
    setSopra(false)
    if (binder.trascinata) binder.rilascia(qui, binder.trascinata)
    binder.fineTrascinamento()
  }

  function iniziaTrascinamento(evento: DragEvent) {
    if (!oggetto) return
    evento.dataTransfer.setData(TIPO_TRASCINAMENTO, oggetto.id)
    evento.dataTransfer.setData('text/plain', oggetto.nome)
    evento.dataTransfer.effectAllowed = 'copyMove'
    binder.iniziaTrascinamento({ tipo: 'tasca', oggetto, pagina, posizione })
  }

  // il riflesso segue il puntatore: solo variabili CSS sull'elemento, niente render
  function muoviRiflesso(evento: PointerEvent<HTMLButtonElement>) {
    const riquadro = evento.currentTarget.getBoundingClientRect()
    evento.currentTarget.style.setProperty('--mx', `${((evento.clientX - riquadro.left) / riquadro.width) * 100}%`)
    evento.currentTarget.style.setProperty('--my', `${((evento.clientY - riquadro.top) / riquadro.height) * 100}%`)
  }

  const etichetta = oggetto
    ? `Tasca ${posizione + 1}: ${oggetto.nome}${variante === 'REVERSE_HOLO' ? ' (Reverse holo)' : ''}${inAttesa ? `. Sostituisci con ${inMano.oggetto.nome}` : ''}`
    : `Tasca ${posizione + 1}, vuota${inAttesa ? `. Inserisci ${inMano.oggetto.nome}` : ''}`

  return (
    <div
      className={cn('relative min-h-0 min-w-0', menuAperto && 'z-10')}
      onDragOver={trascinaSopra}
      onDragLeave={() => setSopra(false)}
      onDrop={lascia}
    >
      <button
        type="button"
        onClick={tocca}
        draggable={oggetto !== null}
        onDragStart={iniziaTrascinamento}
        onDragEnd={binder.fineTrascinamento}
        onPointerMove={effetto ? muoviRiflesso : undefined}
        aria-label={etichetta}
        aria-expanded={oggetto ? menuAperto : undefined}
        aria-controls={menuAperto ? ID_BARRA_TASCA : undefined}
        data-tasca={`${pagina}-${posizione}`}
        className={cn(
          'tasca-holo group relative mx-auto block aspect-[63/88] h-full max-h-full max-w-full overflow-hidden rounded-[3%/2.1%] transition duration-200 ease-out',
          // busta di plastica trasparente sulla tela scura: appena più chiara, bordo sottile e riflesso
          'bg-white/[0.04]',
          // carta toccata: si alza dalla tasca, col bordo giallo delle destinazioni
          menuAperto
            ? 'scale-[1.06] shadow-[0_14px_28px_-8px_rgb(0_0_0/0.7)] ring-2 ring-giallo-400 motion-reduce:scale-100'
            : 'ring-1 ring-white/12',
          oggetto ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          inAttesa && 'ring-2 ring-giallo-400/70',
          eOrigine && 'opacity-40',
          evidenziata && 'tasca-evidenziata',
          sopra && 'scale-[1.04] ring-4 ring-giallo-400',
        )}
      >
        {oggetto ? (
          <ImmagineOPlaceholder
            src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl}
            nome={oggetto.nome}
            alt=""
            draggable={false}
            loading="lazy"
            className={cn('h-full w-full object-fill transition', mancante && 'grayscale')}
          />
        ) : null}
        {effetto && (
          <span aria-hidden className={cn('pointer-events-none absolute inset-0', effetto === 'specchio' ? 'holo-reverse' : 'holo-riflesso')} />
        )}
        {oggetto ? null : (
          <span
            aria-hidden
            className={cn(
              'absolute inset-[7%] grid place-items-center rounded-[5%/3.6%] border-2 border-dashed border-white/15 text-white/25 transition-colors',
              'group-hover:border-giallo-400/60 group-hover:text-giallo-400',
              (inAttesa || sopra) && 'border-giallo-400/70 text-giallo-400',
            )}
          >
            <Plus className="size-[28%]" />
          </span>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgb(255_255_255/0.35),transparent_32%,transparent_70%,rgb(255_255_255/0.12))]"
        />
        {oggetto && variante === 'REVERSE_HOLO' && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-[6%] bottom-[5%] grid size-[22%] max-h-6 max-w-6 place-items-center rounded-full bg-blu-500 text-[10px] font-bold text-white shadow ring-1 ring-white/60"
          >
            R
          </span>
        )}
      </button>
    </div>
  )
}
