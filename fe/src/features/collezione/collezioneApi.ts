import { api } from '../../app/api'
import type { Copia, Variante } from '../../types/api'
import { binderApi } from '../binder/binderApi'

// la collezione si legge per set o per Pokémon (numero del Pokédex)
export type FiltroPagina = { espansione: string } | { pokemon: number }

interface ModificaArg {
  oggettoId: string
  variante: Variante
  delta: number
  // cache da aggiornare subito: la pagina del set/Pokémon e/o il binder aperto
  filtro?: FiltroPagina
  binderId?: string
}

// imposta la quantità di una copia in una lista; 0 toglie la riga
function impostaQuantita(copie: Copia[], oggettoId: string, variante: Variante, quantita: number) {
  const indice = copie.findIndex((c) => c.oggettoId === oggettoId && c.variante === variante)
  if (quantita <= 0) {
    if (indice >= 0) copie.splice(indice, 1)
  } else if (indice >= 0) {
    copie[indice].quantita = quantita
  } else {
    copie.push({ oggettoId, variante, quantita })
  }
}

export const collezioneApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCollezione: build.query<Copia[], FiltroPagina>({
      query: (filtro) => ({ url: '/me/collezione', params: filtro }),
      providesTags: ['Collezione'],
    }),

    // aggiornamento ottimistico (tetto 0..999); a risposta ricevuta vale la quantità del server
    modificaCollezione: build.mutation<Copia, ModificaArg>({
      query: ({ oggettoId, variante, delta }) => ({
        url: '/me/collezione',
        method: 'PATCH',
        body: { oggettoId, variante, delta },
      }),
      async onQueryStarted({ oggettoId, variante, delta, filtro, binderId }, { dispatch, queryFulfilled }) {
        const applica = (copie: Copia[]) => {
          const attuale = copie.find((c) => c.oggettoId === oggettoId && c.variante === variante)?.quantita ?? 0
          impostaQuantita(copie, oggettoId, variante, Math.min(999, Math.max(0, attuale + delta)))
        }
        const patch = []
        if (filtro) patch.push(dispatch(collezioneApi.util.updateQueryData('getCollezione', filtro, applica)))
        if (binderId) {
          patch.push(
            dispatch(binderApi.util.updateQueryData('getBinderDettaglio', binderId, (d) => applica(d.collezione))),
          )
        }
        try {
          const { data } = await queryFulfilled
          // la quantità del server sostituisce quella ottimistica
          if (filtro) {
            dispatch(
              collezioneApi.util.updateQueryData('getCollezione', filtro, (copie) =>
                impostaQuantita(copie, oggettoId, variante, data.quantita),
              ),
            )
          }
          if (binderId) {
            dispatch(
              binderApi.util.updateQueryData('getBinderDettaglio', binderId, (d) =>
                impostaQuantita(d.collezione, oggettoId, variante, data.quantita),
              ),
            )
          }
        } catch {
          patch.forEach((p) => p.undo())
        }
      },
    }),
  }),
})

export const { useGetCollezioneQuery, useModificaCollezioneMutation } = collezioneApi
