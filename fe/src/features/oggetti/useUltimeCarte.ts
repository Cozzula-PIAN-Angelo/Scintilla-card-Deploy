import { useGetOggettiQuery } from './oggettiApi'
import { ORDINAMENTO_PREDEFINITO } from './ordinamenti'

// le ultime carte arrivate con un'immagine: ventaglio dell'hero e carte di sfondo di hero e login.
// Stessa richiesta in tutte e due le pagine, quindi una sola chiamata grazie alla cache
export function useUltimeCarte() {
  const { data } = useGetOggettiQuery({ page: 0, size: 20, sort: ORDINAMENTO_PREDEFINITO })
  return data?.content.filter((o) => o.immagineUrl) ?? []
}
