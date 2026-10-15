import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router'

// segno nello state della voce di cronologia aggiunta all'apertura
const SEGNO = 'dettaglioAperto'

// Finestra aperta = una voce in più nella cronologia, con lo stesso indirizzo: l'indietro del telefono
// (o del browser) chiude la finestra invece di lasciare la pagina. Chiudendo in altro modo (X, sfondo,
// Esc) la voce si toglie con un passo indietro, così i pulsanti "indietro" delle pagine, che tornano
// indietro di un numero preciso di passi, contano giusto
export function useIndietroChiude(aperto: boolean, onChiudi: () => void) {
  const location = useLocation()
  const navigate = useNavigate()
  const tipoNavigazione = useNavigationType()
  const segnata = (location.state as Record<string, unknown> | null)?.[SEGNO] === true
  const chiudi = useRef(onChiudi)
  chiudi.current = onChiudi

  // apertura: si aggiunge la voce; chiusura con la voce ancora lì: la si toglie.
  // Solo sui cambi di `aperto`, non al montaggio (es. pagina ricaricata su una voce segnata)
  const apertoPrima = useRef(aperto)
  useEffect(() => {
    if (apertoPrima.current === aperto) return
    apertoPrima.current = aperto
    if (aperto && !segnata) {
      const { pathname, search, hash } = location
      const stato = (location.state as Record<string, unknown> | null) ?? {}
      navigate({ pathname, search, hash }, { state: { ...stato, [SEGNO]: true } })
    } else if (!aperto && segnata) {
      navigate(-1)
    }
  }, [aperto]) // conta solo il cambio di `aperto`

  // indirizzo della voce segnata: mentre la finestra è aperta può cambiare (la griglia segue le frecce, ?page=)
  const indirizzo = useRef<string | null>(null)
  useEffect(() => {
    const qui = location.pathname + location.search + location.hash
    if (segnata) {
      indirizzo.current = qui
      return
    }
    if (indirizzo.current === null) return
    const daRiportare = indirizzo.current
    indirizzo.current = null
    // la voce segnata non c'è più (indietro, o chiusura con la X): la finestra si chiude e, tornati
    // indietro, la voce di sotto prende l'indirizzo che aveva quella segnata
    chiudi.current()
    if (tipoNavigazione === 'POP' && daRiportare !== qui) navigate(daRiportare, { replace: true, state: location.state })
  }, [location]) // reagisce solo ai cambi di voce
}
