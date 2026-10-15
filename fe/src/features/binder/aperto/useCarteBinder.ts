import { useCallback, useMemo, useState } from 'react'
import { messaggioErrore } from '../../../app/errori'
import type { Binder, SlotBinder } from '../../../types/api'
import { useToast } from '../../toast/useToast'
import { useInserisciCartaMutation, useSpostaCartaMutation, useSvuotaTascaMutation } from '../binderApi'
import { inserisci as inserisciConSpazio } from '../disposizione'
import { stessaPosizione, type CartaInTasca, type ContestoBinder, type Posizione, type Sorgente } from '../contesto'

// carte: tocco, trascinamento, menu delle tasche. Con faiSpazio inserire e spostare fanno scalare le carte
export function useCarteBinder(binder: Binder, slot: SlotBinder[], faiSpazio: boolean) {
  const binderId = binder.id
  const toast = useToast()
  // carta in mano (scelta con un tocco), carta trascinata, tasca col menu aperto, carta ingrandita
  const [inMano, setInMano] = useState<Sorgente | null>(null)
  const [trascinata, setTrascinata] = useState<Sorgente | null>(null)
  const [tascaAttiva, setTascaAttiva] = useState<Posizione | null>(null)
  const [guardata, setGuardata] = useState<CartaInTasca | null>(null)

  const [inserisci] = useInserisciCartaMutation()
  const [sposta] = useSpostaCartaMutation()
  const [svuota] = useSvuotaTascaMutation()

  const contesto = useMemo<ContestoBinder>(() => {
    const errore = (e: unknown) => toast.errore(messaggioErrore(e, 'Operazione non riuscita, riprova'))
    return {
      inMano,
      prendi: (sorgente) => {
        setTascaAttiva(null)
        setInMano(sorgente)
      },
      trascinata,
      iniziaTrascinamento: (sorgente) => {
        setTascaAttiva(null)
        setInMano(null)
        setTrascinata(sorgente)
      },
      fineTrascinamento: () => setTrascinata(null),
      tascaAttiva,
      attivaTasca: setTascaAttiva,
      rilascia: (arrivo, sorgente) => {
        setInMano(null)
        setTascaAttiva(null)
        if (sorgente.tipo === 'carta') {
          // binder pieno dopo la tasca: si avvisa senza mandare la richiesta
          if (faiSpazio && !inserisciConSpazio(slot, binder.tasche, binder.pagine, arrivo, sorgente.oggetto)) {
            toast.errore("Binder pieno: non c'è una tasca libera dopo questa")
            return
          }
          inserisci({ binderId, ...arrivo, oggetto: sorgente.oggetto, faiSpazio }).unwrap().catch(errore)
        } else if (!stessaPosizione(sorgente, arrivo)) {
          const da = { pagina: sorgente.pagina, posizione: sorgente.posizione }
          sposta({ binderId, da, a: arrivo, faiSpazio }).unwrap().catch(errore)
        }
      },
      togli: (posizione) => {
        setTascaAttiva(null)
        svuota({ binderId, ...posizione, faiSpazio }).unwrap().catch(errore)
      },
      guarda: (carta) => {
        setTascaAttiva(null)
        setGuardata(carta)
      },
    }
  }, [inMano, trascinata, tascaAttiva, binderId, binder.tasche, binder.pagine, slot, faiSpazio, inserisci, sposta, svuota, toast])

  // chiude il menu della tasca
  const chiudiMenu = useCallback(() => setTascaAttiva(null), [])
  // posa la carta in mano e chiude il menu
  const annulla = useCallback(() => {
    setInMano(null)
    setTascaAttiva(null)
  }, [])
  const posa = useCallback(() => setInMano(null), [])
  const chiudiCarta = useCallback(() => setGuardata(null), [])

  return { contesto, inMano, trascinata, guardata, chiudiMenu, annulla, posa, chiudiCarta }
}
