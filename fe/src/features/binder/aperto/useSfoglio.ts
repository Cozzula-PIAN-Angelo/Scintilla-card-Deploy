import { animate, useMotionValue } from 'framer-motion'
import { useCallback, useState } from 'react'
import { CURVA, DURATA_PAGINA } from './costanti'

interface Opzioni {
  doppia: boolean
  pagine: number
  // si sfoglia solo a binder aperto
  attivo: boolean
  // chiamata a ogni giro di pagina (frecce, tastiera, scelta della pagina)
  onGiro: () => void
}

// sfoglio: pagina visibile, foglio che gira e sua rotazione
export function useSfoglio({ doppia, pagine, attivo, onGiro }: Opzioni) {
  // "vista": a doppia pagina è il numero della coppia di facciate, a pagina singola la pagina.
  // Cambiando modalità (finestra ridimensionata) si converte restando sulla stessa pagina
  const [vistaSalvata, setVistaSalvata] = useState({ doppia, vista: 0 })
  if (vistaSalvata.doppia !== doppia) {
    const { vista } = vistaSalvata
    setVistaSalvata({ doppia, vista: doppia ? Math.floor((vista + 1) / 2) : Math.max(0, 2 * vista - 1) })
  }
  const numeroViste = doppia ? Math.floor(pagine / 2) + 1 : pagine
  // pagine ridotte dalle impostazioni mentre il binder è aperto
  const vista = Math.min(vistaSalvata.vista, numeroViste - 1)
  const [giro, setGiro] = useState<{ da: number; a: number } | null>(null)
  const avanti = giro ? giro.a > giro.da : true

  // Rotazione del foglio che gira, in gradi. Lo stesso valore lo muove l'animazione (frecce,
  // tastiera) oppure il puntatore quando si trascina la pagina
  const angolo = useMotionValue(0)

  // angolo di partenza e di arrivo: a doppia pagina il foglio va da una metà all'altra,
  // a pagina singola esce (o rientra) da sinistra
  const estremi = useCallback(
    (avanti: boolean): [number, number] => (doppia ? [0, avanti ? -180 : 180] : avanti ? [0, -180] : [-180, 0]),
    [doppia],
  )

  const completaGiro = useCallback(
    (destinazione: number) => {
      setVistaSalvata({ doppia, vista: destinazione })
      setGiro(null)
    },
    [doppia],
  )

  const vaiA = useCallback(
    (destinazione: number) => {
      if (!attivo || giro || destinazione === vista || destinazione < 0 || destinazione >= numeroViste) return
      onGiro()
      const [inizio, fine] = estremi(destinazione > vista)
      angolo.set(inizio)
      setGiro({ da: vista, a: destinazione })
      void animate(angolo, fine, { duration: DURATA_PAGINA, ease: CURVA }).then(() => completaGiro(destinazione))
    },
    [attivo, giro, vista, numeroViste, estremi, angolo, completaGiro, onGiro],
  )

  // giro alla pagina vicina guidato da fuori (il puntatore): l'angolo di partenza va impostato
  // prima di creare il foglio, altrimenti per un frame il foglio è fuori posto
  function iniziaGiro(avanti: boolean) {
    angolo.set(estremi(avanti)[0])
    setGiro({ da: vista, a: vista + (avanti ? 1 : -1) })
  }

  const annullaGiro = useCallback(() => setGiro(null), [])

  // alla chiusura del binder: si riparte dalla prima pagina
  const azzera = useCallback(() => {
    setGiro(null)
    setVistaSalvata({ doppia, vista: 0 })
  }, [doppia])

  return { vista, numeroViste, giro, avanti, angolo, estremi, vaiA, iniziaGiro, completaGiro, annullaGiro, azzera }
}

export type Sfoglio = ReturnType<typeof useSfoglio>
