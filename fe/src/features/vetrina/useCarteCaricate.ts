import { useEffect, useState } from 'react'
import type { CartaAnteprima } from '../../types/api'

// TCGdex non ha l'immagine di tutte le carte (i Mew RGB di 30th Celebration danno 404): il backend ne manda
// qualcuna in più e qui si tengono le prime `quante` che si caricano davvero. Vuota finché le prove non finiscono
export function useCarteCaricate(candidate: CartaAnteprima[] | undefined, quante: number): CartaAnteprima[] {
  const [esito, setEsito] = useState<{ da: CartaAnteprima[]; carte: CartaAnteprima[] } | null>(null)

  useEffect(() => {
    if (!candidate || candidate.length === 0) return
    let attivo = true
    const prove = candidate.map(
      (carta) =>
        new Promise<boolean>((risolvi) => {
          const img = new Image()
          img.onload = () => risolvi(true)
          img.onerror = () => risolvi(false)
          img.src = carta.immagineUrlPiccola ?? carta.immagineUrl ?? ''
        }),
    )
    Promise.all(prove).then((caricate) => {
      if (attivo) setEsito({ da: candidate, carte: candidate.filter((_, i) => caricate[i]).slice(0, quante) })
    })
    return () => {
      attivo = false
    }
  }, [candidate, quante])

  return esito && esito.da === candidate ? esito.carte : []
}
