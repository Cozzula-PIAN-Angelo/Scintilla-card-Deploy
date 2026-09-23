import type { Espansione } from '../../types/api'

// mantiene l'ordine del backend (dalla più recente): la serie compare dove compare il suo set più nuovo
export function raggruppaPerSerie(espansioni: Espansione[], filtro: string) {
  const gruppi = new Map<string, Espansione[]>()
  for (const espansione of espansioni) {
    const serie = espansione.serie || 'Altre'
    if (filtro && !espansione.nome.toLowerCase().includes(filtro) && !serie.toLowerCase().includes(filtro)) continue
    const gruppo = gruppi.get(serie)
    if (gruppo) gruppo.push(espansione)
    else gruppi.set(serie, [espansione])
  }
  return [...gruppi].map(([nome, espansioni]) => ({ nome, espansioni }))
}
