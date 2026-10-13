import { animate, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CURVA, DURATA_COPERTINA, type Fase } from './costanti'

// apertura e chiusura dell'album: la copertina ruota sul dorso
export function useAperturaBinder(onChiuso: () => void) {
  const [fase, setFase] = useState<Fase>('chiuso')
  // fase aggiornata per i callback (timer, fine animazione) creati in render precedenti
  const faseCorrente = useRef<Fase>('chiuso')
  faseCorrente.current = fase
  // Rotazione della copertina in gradi: 0 chiusa, -180 aperta e ribaltata a sinistra. Animata con
  // animate() come i fogli: alla fine dell'animazione si passa alla fase successiva
  const angoloCopertina = useMotionValue(0)
  const opacitaCopertina = useTransform(angoloCopertina, [-180, -120, 0], [0, 1, 1])

  useEffect(() => {
    // solo all'arrivo; apri() legge la fase dal ref, quindi va bene anche dal primo render
    const timer = window.setTimeout(() => apri(), 450)
    return () => window.clearTimeout(timer)
  }, [])

  // a copertina richiusa si torna alla mensola, oppure si resta col binder chiuso davanti.
  // azzera riporta sfoglio e carte allo stato iniziale, prima che la copertina si richiuda
  function chiudi(destinazione: 'mensola' | 'resta', azzera: () => void) {
    // già chiuso: si torna direttamente alla mensola
    if (fase === 'chiuso' && destinazione === 'mensola') {
      onChiuso()
      return
    }
    if (fase !== 'aperto') return
    azzera()
    setFase('chiusura')
    angoloCopertina.set(-180)
    void animate(angoloCopertina, 0, { duration: DURATA_COPERTINA, ease: CURVA }).then(() =>
      destinazione === 'mensola' ? onChiuso() : setFase('chiuso'),
    )
  }

  function apri() {
    if (faseCorrente.current !== 'chiuso') return
    faseCorrente.current = 'apertura'
    setFase('apertura')
    void animate(angoloCopertina, -180, { duration: DURATA_COPERTINA, ease: CURVA }).then(() => setFase('aperto'))
  }

  return { fase, angoloCopertina, opacitaCopertina, apri, chiudi }
}

export type Apertura = ReturnType<typeof useAperturaBinder>
