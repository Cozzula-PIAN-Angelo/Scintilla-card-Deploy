import { useMemo, type ComponentProps } from 'react'
import type { Oggetto } from '../../types/api'
import type { BarraCollezione } from './BarraCollezione'
import type { FiltroPagina } from './collezioneApi'
import { conteggio, filtra, vuotoFiltro } from './conteggi'
import { useCollezione } from './useCollezione'
import { useFiltroCollezione } from './useFiltroCollezione'

// Collezione per la pagina di un set o di un Pokémon: filtro nell'URL, carte filtrate, props della barra
// e messaggio del filtro vuoto. Finché la collezione non è pronta (ospite, caricamento, errore) la pagina
// resta come per un ospite: carte non filtrate, niente barra, collezione undefined per griglia e dettaglio
export function useCollezionePagina(filtroPagina: FiltroPagina | null, data: Oggetto[] | undefined) {
  const { filtro, setFiltro } = useFiltroCollezione()
  const tutta = useCollezione(filtroPagina)
  const collezione = tutta.pronta ? tutta : undefined
  const carte = useMemo(() => (data && tutta.pronta ? filtra(data, tutta.mappa, filtro) : data), [data, tutta.pronta, tutta.mappa, filtro])

  const barra: ComponentProps<typeof BarraCollezione> | null =
    collezione && data
      ? {
          ...conteggio(data, collezione.mappa),
          filtro,
          onFiltro: setFiltro,
          aColori: collezione.aColori,
          onAlternaColori: collezione.alternaColori,
        }
      : null

  return {
    collezione,
    carte,
    barra,
    vuotoFiltro: collezione && data && data.length > 0 ? vuotoFiltro(filtro) : undefined,
  }
}
