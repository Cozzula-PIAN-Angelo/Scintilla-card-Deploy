import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import type { Filtro } from './conteggi'

// Filtro (?filtro=possedute|mancanti, assente = tutte) nell'URL, come la paginazione
export function useFiltroCollezione() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const letto = params.get('filtro')
  const filtro: Filtro = letto === 'possedute' || letto === 'mancanti' ? letto : 'tutte'

  // cambiando filtro si riparte dalla prima pagina
  const setFiltro = useCallback(
    (nuovo: Filtro) =>
      setParams(
        (precedenti) => {
          const nuovi = new URLSearchParams(precedenti)
          if (nuovo === 'tutte') nuovi.delete('filtro')
          else nuovi.set('filtro', nuovo)
          nuovi.delete('page')
          return nuovi
        },
        { replace: true, state: location.state },
      ),
    [setParams, location.state],
  )

  return { filtro, setFiltro }
}
