import { useEffect, useMemo, useState } from 'react'
import type { CartaAnteprima } from '../../types/api'

// TCGdex non ha l'immagine di tutte le carte (i Mew RGB di 30th Celebration danno 404): il backend ne manda
// qualcuna in più e qui si tengono le prime `quante` che si caricano davvero. Vuota finché le prove non finiscono
export function useCarteCaricate(candidate: CartaAnteprima[] | undefined, quante: number): CartaAnteprima[] {
  const gruppi = useMemo(() => (candidate ? [candidate] : []), [candidate])
  return useCarteCaricateDiPiuSet(gruppi, quante)[0] ?? []
}

// come useCarteCaricate, per più set insieme (quelli che girano nella hero): ogni set è pronto appena finiscono
// le sue prove, senza aspettare gli altri. `gruppi` va tenuto stabile (useMemo), se no le prove ripartono
export function useCarteCaricateDiPiuSet(gruppi: CartaAnteprima[][], quante: number): CartaAnteprima[][] {
  const [caricate, setCaricate] = useState<ReadonlyMap<CartaAnteprima[], CartaAnteprima[]>>(new Map())

  useEffect(() => {
    let attivo = true
    for (const candidate of gruppi) {
      if (candidate.length === 0) continue
      Promise.all(candidate.map(provaImmagine)).then((riuscite) => {
        if (!attivo) return
        const carte = candidate.filter((_, i) => riuscite[i]).slice(0, quante)
        setCaricate((prima) => new Map(prima).set(candidate, carte))
      })
    }
    return () => {
      attivo = false
    }
  }, [gruppi, quante])

  return gruppi.map((candidate) => caricate.get(candidate) ?? [])
}

function provaImmagine(carta: CartaAnteprima) {
  return new Promise<boolean>((risolvi) => {
    const img = new Image()
    img.onload = () => risolvi(true)
    img.onerror = () => risolvi(false)
    img.src = carta.immagineUrlPiccola ?? carta.immagineUrl ?? ''
  })
}
