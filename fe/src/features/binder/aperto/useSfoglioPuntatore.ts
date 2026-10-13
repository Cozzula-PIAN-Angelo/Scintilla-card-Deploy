import { animate } from 'framer-motion'
import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import type { Lato } from './costanti'
import type { Sfoglio } from './useSfoglio'

interface Opzioni {
  // si sfoglia solo a binder aperto
  attivo: boolean
  doppia: boolean
  larghezzaLibro: number
  sfoglio: Sfoglio
  // chiamata quando il gesto diventa uno sfoglio
  onPresa: () => void
}

// --- sfoglio col puntatore: si afferra la pagina e il foglio segue il mouse (o il dito) ---
// Sulle carte il gesto resta quello di spostarle (trascinamento nativo): la pagina si prende
// dai margini, dagli spazi tra le tasche, dalle tasche vuote o dalla maniglia sul bordo esterno
export function useSfoglioPuntatore({ attivo, doppia, larghezzaLibro, sfoglio, onPresa }: Opzioni) {
  const { giro, vista, numeroViste, estremi, angolo } = sfoglio
  const presa = useRef<{
    id: number
    x: number
    y: number
    lato: Lato
    // attivato superata una piccola soglia: prima può ancora essere un semplice clic
    attiva: boolean
    avanti: boolean
    progresso: number
    ultimaX: number
    ultimoTempo: number
    velocita: number
  } | null>(null)
  const [pagineInMano, setPagineInMano] = useState(false)
  // dopo un trascinamento il clic finale non deve arrivare alle tasche
  const ignoraClic = useRef(false)

  function afferra(evento: PointerEvent<HTMLDivElement>) {
    if (!attivo || giro || evento.button !== 0) return
    const bersaglio = evento.target as HTMLElement
    if (!bersaglio.closest('[data-maniglia]') && bersaglio.closest('[draggable="true"], input, select')) return
    const riquadro = evento.currentTarget.getBoundingClientRect()
    presa.current = {
      id: evento.pointerId,
      x: evento.clientX,
      y: evento.clientY,
      lato: !doppia || evento.clientX > riquadro.left + riquadro.width / 2 ? 'destra' : 'sinistra',
      attiva: false,
      avanti: true,
      progresso: 0,
      ultimaX: evento.clientX,
      ultimoTempo: evento.timeStamp,
      velocita: 0,
    }
  }

  function trascinaPagina(evento: PointerEvent<HTMLDivElement>) {
    const p = presa.current
    if (!p || p.id !== evento.pointerId) return
    const dx = evento.clientX - p.x
    const dy = evento.clientY - p.y

    if (!p.attiva) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return
      const avanti = dx < 0
      // a doppia pagina si gira in avanti la pagina destra e indietro la sinistra
      const consentito = avanti
        ? vista < numeroViste - 1 && (!doppia || p.lato === 'destra')
        : vista > 0 && (!doppia || p.lato === 'sinistra')
      if (!consentito) {
        presa.current = null
        return
      }
      p.attiva = true
      p.avanti = avanti
      evento.currentTarget.setPointerCapture(evento.pointerId)
      onPresa()
      setPagineInMano(true)
      sfoglio.iniziaGiro(avanti)
    }

    // per girare tutto il foglio si attraversa quasi tutto il binder
    const corsa = larghezzaLibro * (doppia ? 0.75 : 0.8)
    p.progresso = Math.min(1, Math.max(0, (p.avanti ? -dx : dx) / corsa))
    const [inizio, fine] = estremi(p.avanti)
    angolo.set(inizio + (fine - inizio) * p.progresso)

    const intervallo = evento.timeStamp - p.ultimoTempo
    if (intervallo > 0) p.velocita = (evento.clientX - p.ultimaX) / intervallo
    p.ultimaX = evento.clientX
    p.ultimoTempo = evento.timeStamp
  }

  function lasciaPagina(evento: PointerEvent<HTMLDivElement>) {
    const p = presa.current
    if (!p || p.id !== evento.pointerId) return
    presa.current = null
    if (!p.attiva) return
    // il clic che segue il rilascio (se arriva) si scarta; poi si torna alla normalità
    ignoraClic.current = true
    window.setTimeout(() => (ignoraClic.current = false), 0)
    setPagineInMano(false)

    // si completa oltre un terzo di giro, o con un colpo deciso nella direzione giusta
    const spinta = p.avanti ? -p.velocita : p.velocita
    const completa = evento.type !== 'pointercancel' && (p.progresso > 0.35 || spinta > 0.6)
    const [inizio, fine] = estremi(p.avanti)
    const destinazione = vista + (p.avanti ? 1 : -1)
    const resto = completa ? 1 - p.progresso : p.progresso
    void animate(angolo, completa ? fine : inizio, { duration: 0.2 + 0.4 * resto, ease: 'easeOut' }).then(() =>
      completa ? sfoglio.completaGiro(destinazione) : sfoglio.annullaGiro(),
    )
  }

  function scartaClic(evento: MouseEvent<HTMLDivElement>) {
    if (!ignoraClic.current) return
    ignoraClic.current = false
    evento.stopPropagation()
    evento.preventDefault()
  }

  return {
    pagineInMano,
    gestori: {
      onPointerDown: afferra,
      onPointerMove: trascinaPagina,
      onPointerUp: lasciaPagina,
      onPointerCancel: lasciaPagina,
      onClickCapture: scartaClic,
    },
  }
}

export type SfoglioPuntatore = ReturnType<typeof useSfoglioPuntatore>
