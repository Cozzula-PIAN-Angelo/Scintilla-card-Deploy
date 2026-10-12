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

// richieste in corso per copia e cache; ultima = quantità dell'ultima risposta arrivata
const inCorso = new Map<string, { pendenti: number; fallita: boolean; ultima: number | null }>()

export const collezioneApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCollezione: build.query<Copia[], FiltroPagina>({
      query: (filtro) => ({ url: '/me/collezione', params: filtro }),
      providesTags: ['Collezione'],
    }),

    // Aggiornamento ottimistico (tetto 0..999). Le risposte non si applicano finché altre richieste
    // della stessa copia sono in corso: possono arrivare fuori ordine e rimetterebbero un valore vecchio.
    // Quando l'ultima si chiude: tutto riuscito = vale l'ultima risposta; un errore = si rilegge dal server
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
        // una voce per cache da aggiornare: lettura per set/Pokémon e/o dettaglio del binder
        const bersagli: { chiave: string; imposta: (q: number) => void; rileggi: () => void }[] = []
        if (filtro) {
          bersagli.push({
            chiave: `pagina|${JSON.stringify(filtro)}|${oggettoId}|${variante}`,
            imposta: (q) =>
              dispatch(
                collezioneApi.util.updateQueryData('getCollezione', filtro, (c) => impostaQuantita(c, oggettoId, variante, q)),
              ),
            rileggi: () => dispatch(api.util.invalidateTags(['Collezione'])),
          })
        }
        if (binderId) {
          bersagli.push({
            chiave: `binder|${binderId}|${oggettoId}|${variante}`,
            imposta: (q) =>
              dispatch(
                binderApi.util.updateQueryData('getBinderDettaglio', binderId, (d) =>
                  impostaQuantita(d.collezione, oggettoId, variante, q),
                ),
              ),
            rileggi: () => dispatch(api.util.invalidateTags([{ type: 'Binder', id: binderId }])),
          })
        }

        for (const { chiave } of bersagli) {
          const stato = inCorso.get(chiave) ?? { pendenti: 0, fallita: false, ultima: null }
          stato.pendenti += 1
          inCorso.set(chiave, stato)
        }
        if (filtro) dispatch(collezioneApi.util.updateQueryData('getCollezione', filtro, applica))
        if (binderId) dispatch(binderApi.util.updateQueryData('getBinderDettaglio', binderId, (d) => applica(d.collezione)))

        let quantita: number | null = null
        try {
          quantita = (await queryFulfilled).data.quantita
        } catch {
          // la gestione dell'errore è sotto, a richieste chiuse
        }
        for (const { chiave, imposta, rileggi } of bersagli) {
          const stato = inCorso.get(chiave)
          if (!stato) continue
          if (quantita === null) stato.fallita = true
          else stato.ultima = quantita
          stato.pendenti -= 1
          if (stato.pendenti > 0) continue
          inCorso.delete(chiave)
          if (stato.fallita || stato.ultima === null) rileggi()
          else imposta(stato.ultima)
        }
      },
    }),
  }),
})

export const { useGetCollezioneQuery, useModificaCollezioneMutation } = collezioneApi
