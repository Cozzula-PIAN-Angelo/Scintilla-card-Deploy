import { useMemo } from 'react'
import { useAppDispatch } from '../../app/hooks'
import { toastAggiunto } from './toastSlice'

interface Opzioni {
  azione?: { etichetta: string; onClick: () => void }
  durata?: number
}

// le funzioni dei bottoni stanno qui e non nello store Redux (non sono serializzabili), per id del toast
const azioni = new Map<string, () => void>()

export function eseguiAzioneToast(id: string) {
  azioni.get(id)?.()
}

export function dimenticaAzioneToast(id: string) {
  azioni.delete(id)
}

export function useToast() {
  const dispatch = useAppDispatch()
  return useMemo(() => {
    const mostra = (tipo: 'successo' | 'errore' | 'info') => (messaggio: string, opzioni: Opzioni = {}) => {
      const { payload } = dispatch(toastAggiunto(tipo, messaggio, { azione: opzioni.azione?.etichetta, durata: opzioni.durata }))
      if (opzioni.azione) azioni.set(payload.id, opzioni.azione.onClick)
    }
    return { successo: mostra('successo'), errore: mostra('errore'), info: mostra('info') }
  }, [dispatch])
}
