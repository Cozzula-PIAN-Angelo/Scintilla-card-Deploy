import { useCallback, useMemo, useState } from 'react'
import { messaggioErrore } from '../../../app/errori'
import type { Binder, Oggetto } from '../../../types/api'
import { useToast } from '../../toast/useToast'
import { useInserisciCartaMutation, useSpostaCartaMutation, useSvuotaTascaMutation } from '../binderApi'
import { stessaPosizione, type ContestoBinder, type Posizione, type Sorgente } from '../contesto'

// carte: tocco, trascinamento, menu delle tasche
export function useCarteBinder(binderId: Binder['id']) {
  const toast = useToast()
  // carta in mano (scelta con un tocco), carta trascinata, tasca col menu aperto, carta ingrandita
  const [inMano, setInMano] = useState<Sorgente | null>(null)
  const [trascinata, setTrascinata] = useState<Sorgente | null>(null)
  const [tascaAttiva, setTascaAttiva] = useState<Posizione | null>(null)
  const [guardata, setGuardata] = useState<Oggetto | null>(null)

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
          inserisci({ binderId, ...arrivo, oggetto: sorgente.oggetto }).unwrap().catch(errore)
        } else if (!stessaPosizione(sorgente, arrivo)) {
          const da = { pagina: sorgente.pagina, posizione: sorgente.posizione }
          sposta({ binderId, da, a: arrivo }).unwrap().catch(errore)
        }
      },
      togli: (posizione) => {
        setTascaAttiva(null)
        svuota({ binderId, ...posizione }).unwrap().catch(errore)
      },
      guarda: (oggetto) => {
        setTascaAttiva(null)
        setGuardata(oggetto)
      },
    }
  }, [inMano, trascinata, tascaAttiva, binderId, inserisci, sposta, svuota, toast])

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
