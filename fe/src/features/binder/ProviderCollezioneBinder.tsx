import { useCallback, useMemo, type ReactNode } from 'react'
import { messaggioErrore, statoErrore } from '../../app/errori'
import type { Oggetto } from '../../types/api'
import { copieTotali, creaMappa } from '../collezione/conteggi'
import { useModificaCollezioneMutation } from '../collezione/collezioneApi'
import { ETICHETTE, varianteRapida } from '../collezione/varianti'
import { useToast } from '../toast/useToast'
import { useGetBinderDettaglioQuery } from './binderApi'
import { ContestoCollezione, type ContestoCollezioneBinder } from './contestoCollezione'

// Porta la collezione dell'utente alle tasche senza toccare BinderAperto. Il binder la mostra soltanto:
// inserire, spostare o svuotare non la modificano, solo "Ce l'ho" aggiunge una copia
export function ProviderCollezioneBinder({ id, children }: { id: string; children: ReactNode }) {
  // stessa query di BinderAperto: RTK Query la condivide. Si rilegge a ogni apertura: la collezione
  // può essere cambiata da un'altra pagina, che aggiorna solo la sua cache
  const { data } = useGetBinderDettaglioQuery(id, { refetchOnMountOrArgChange: true })
  const [modificaCopia] = useModificaCollezioneMutation()
  const toast = useToast()

  const mappa = useMemo(() => creaMappa(data?.collezione ?? []), [data?.collezione])
  const possiede = useCallback((oggettoId: string) => copieTotali(mappa, oggettoId) > 0, [mappa])

  const ceLho = useCallback(
    async (oggetto: Oggetto) => {
      const variante = varianteRapida(oggetto)
      toast.successo(`Aggiunta alla collezione: ${ETICHETTE[variante]}`)
      try {
        await modificaCopia({ oggettoId: oggetto.id, variante, delta: 1, binderId: id }).unwrap()
      } catch (errore) {
        // 401: ci pensa la gestione della sessione
        if (statoErrore(errore) === 401) return
        toast.errore(messaggioErrore(errore, 'Non è stato possibile aggiornare la collezione'))
      }
    },
    [id, modificaCopia, toast],
  )

  const valore = useMemo<ContestoCollezioneBinder>(
    () => ({ possiede, mostraMancanti: data !== undefined && data.binder.mostraMancanti, ceLho: (o) => void ceLho(o) }),
    [possiede, data, ceLho],
  )

  return <ContestoCollezione.Provider value={valore}>{children}</ContestoCollezione.Provider>
}
