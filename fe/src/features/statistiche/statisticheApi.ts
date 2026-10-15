import { api } from '../../app/api'
import type { Statistiche } from '../../types/api'

// si rilegge quando cambiano collezione o binder (le mutation invalidano 'Statistiche')
export const statisticheApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStatistiche: build.query<Statistiche, void>({
      query: () => '/me/statistiche',
      providesTags: ['Statistiche'],
    }),
  }),
})

export const { useGetStatisticheQuery } = statisticheApi
