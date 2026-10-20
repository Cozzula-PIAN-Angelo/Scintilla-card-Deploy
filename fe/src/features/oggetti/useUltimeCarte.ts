import { useGetOggettiQuery } from './oggettiApi'
import { ORDINAMENTO_PREDEFINITO } from './ordinamenti'

// le ultime carte arrivate con un'immagine: ventaglio dell'hero e carte di sfondo di hero e login.
// Stessa richiesta in tutte e due le pagine, quindi una sola chiamata grazie alla cache. Il filtro lo fa il
// backend: le ultime importate possono essere tutte senza immagine (promo che TCGdex non ha) e l'hero restava vuoto
export function useUltimeCarte() {
  const { data } = useGetOggettiQuery({ page: 0, size: 20, sort: ORDINAMENTO_PREDEFINITO, conImmagine: true })
  return data?.content.filter((o) => o.immagineUrl) ?? []
}
