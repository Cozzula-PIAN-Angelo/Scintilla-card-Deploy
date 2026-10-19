import { useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import type { Filtro } from './conteggi'

// Filtro (?filtro=possedute|mancanti, assente = tutte) e master set (?master=1) nell'URL, come la paginazione
export function useFiltroCollezione() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const letto = params.get('filtro')
  const filtro: Filtro = letto === 'possedute' || letto === 'mancanti' ? letto : 'tutte'
  const master = params.get('master') === '1'

  // cambiando filtro o master si riparte dalla prima pagina; null toglie il parametro
  const imposta = useCallback(
    (nome: string, valore: string | null) =>
      setParams(
        (precedenti) => {
          const nuovi = new URLSearchParams(precedenti)
          if (valore === null) nuovi.delete(nome)
          else nuovi.set(nome, valore)
          nuovi.delete('page')
          return nuovi
        },
        { replace: true, state: location.state },
      ),
    [setParams, location.state],
  )
  const setFiltro = useCallback((nuovo: Filtro) => imposta('filtro', nuovo === 'tutte' ? null : nuovo), [imposta])
  const setMaster = useCallback((attivo: boolean) => imposta('master', attivo ? '1' : null), [imposta])

  return { filtro, setFiltro, master, setMaster }
}
