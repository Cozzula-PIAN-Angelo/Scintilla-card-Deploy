import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

// pagina e ordinamento vivono nell'URL: si possono condividere e il tasto indietro funziona
export function useParametriPagina(ordinamentoPredefinito: string, ordinamentiAmmessi: readonly string[]) {
  const [params, setParams] = useSearchParams()

  const pagina = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const sortRichiesto = params.get('sort')
  const ordinamento =
    sortRichiesto && ordinamentiAmmessi.includes(sortRichiesto) ? sortRichiesto : ordinamentoPredefinito

  const vaiAPagina = useCallback(
    (nuovaPagina: number) =>
      setParams((precedenti) => {
        const nuovi = new URLSearchParams(precedenti)
        if (nuovaPagina > 0) nuovi.set('page', String(nuovaPagina))
        else nuovi.delete('page')
        return nuovi
      }),
    [setParams],
  )

  const cambiaOrdinamento = useCallback(
    (nuovo: string) =>
      setParams((precedenti) => {
        const nuovi = new URLSearchParams(precedenti)
        nuovi.delete('page')
        if (nuovo === ordinamentoPredefinito) nuovi.delete('sort')
        else nuovi.set('sort', nuovo)
        return nuovi
      }),
    [setParams, ordinamentoPredefinito],
  )

  return { pagina, ordinamento, vaiAPagina, cambiaOrdinamento }
}
