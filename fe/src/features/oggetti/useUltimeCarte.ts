import { useGetOggettiQuery } from './oggettiApi'
import { ORDINAMENTO_PREDEFINITO } from './ordinamenti'

// le ultime carte arrivate con un'immagine: carte di sfondo delle pagine di accesso. Il filtro lo fa il
// backend: le ultime importate possono essere tutte senza immagine (promo che TCGdex non ha) e lo sfondo restava vuoto
export function useUltimeCarte() {
  const { data } = useGetOggettiQuery({ page: 0, size: 20, sort: ORDINAMENTO_PREDEFINITO, conImmagine: true })
  return data?.content.filter((o) => o.immagineUrl) ?? []
}
