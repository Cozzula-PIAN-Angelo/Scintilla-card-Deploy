import { useCallback, useMemo } from 'react'
import { useAppSelector } from '../../app/hooks'
import { messaggioErrore, statoErrore } from '../../app/errori'
import type { Oggetto, Variante } from '../../types/api'
import { selectToken } from '../auth/authSlice'
import { useToast } from '../toast/useToast'
import { copieTotali, creaMappa, type MappaCopie } from './conteggi'
import { useGetCollezioneQuery, useModificaCollezioneMutation, type FiltroPagina } from './collezioneApi'
import { useMancantiAColori } from './useMancantiAColori'
import { ETICHETTE, varianteRapida } from './varianti'

// ciò che la griglia delle carte usa della collezione (la prop facoltativa `collezione`)
export interface CollezioneGriglia {
  copie(id: string): number
  perVariante(id: string): Map<Variante, number>
  aggiungiRapido(oggetto: Oggetto): void
  // true: le non possedute restano a colori invece che in grigio
  aColori: boolean
}

const VUOTA: MappaCopie = new Map()
const NESSUNA = new Map<Variante, number>()

// Collezione dell'utente per la pagina di un set o di un Pokémon. Da ospite o senza filtro non fa
// richieste e restituisce una collezione vuota (attiva = false): i componenti restano come prima
export function useCollezione(filtro: FiltroPagina | null) {
  const token = useAppSelector(selectToken)
  const attiva = !!token && filtro !== null
  // si rilegge a ogni apertura: la collezione può essere cambiata altrove (binder, altra pagina), e le
  // modifiche aggiornano solo la cache della pagina da cui partono. currentData: i dati di questo filtro,
  // non quelli del set o del Pokémon precedente mentre il nuovo carica
  const { currentData: data } = useGetCollezioneQuery(filtro ?? { pokemon: 0 }, {
    skip: !attiva,
    refetchOnMountOrArgChange: true,
  })
  const [modificaCopia] = useModificaCollezioneMutation()
  const toast = useToast()
  const { aColori, alterna: alternaColori } = useMancantiAColori()

  const mappa = useMemo(() => (attiva && data ? creaMappa(data) : VUOTA), [attiva, data])
  const perVariante = useCallback((id: string) => mappa.get(id) ?? NESSUNA, [mappa])
  const copie = useCallback((id: string) => copieTotali(mappa, id), [mappa])

  // true se il server ha salvato la modifica
  const modifica = useCallback(
    async (oggetto: Oggetto, variante: Variante, delta: number) => {
      if (!attiva) return false
      try {
        await modificaCopia({ oggettoId: oggetto.id, variante, delta, filtro: filtro ?? undefined }).unwrap()
        return true
      } catch (errore) {
        // 401: ci pensa la gestione della sessione
        if (statoErrore(errore) !== 401) toast.errore(messaggioErrore(errore, 'Non è stato possibile aggiornare la collezione'))
        return false
      }
    },
    [attiva, filtro, modificaCopia, toast],
  )

  const aggiungiRapido = useCallback(
    (oggetto: Oggetto) => {
      const variante = varianteRapida(oggetto)
      // il conteggio cambia subito (aggiornamento ottimistico), la conferma solo a salvataggio riuscito
      void modifica(oggetto, variante, 1).then((salvata) => {
        if (salvata) toast.successo(`Aggiunta: ${ETICHETTE[variante]}`)
      })
    },
    [modifica, toast],
  )

  // pronta: dati arrivati. Durante il caricamento o dopo un errore la pagina resta come per un ospite
  const pronta = attiva && data !== undefined

  return { attiva, pronta, mappa, perVariante, copie, modifica, aggiungiRapido, aColori, alternaColori }
}
