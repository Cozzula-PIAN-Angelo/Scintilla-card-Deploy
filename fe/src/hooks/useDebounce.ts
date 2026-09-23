import { useEffect, useState } from 'react'

export function useDebounce<T>(valore: T, ritardoMs: number): T {
  const [valoreRitardato, setValoreRitardato] = useState(valore)

  useEffect(() => {
    const timer = window.setTimeout(() => setValoreRitardato(valore), ritardoMs)
    return () => window.clearTimeout(timer)
  }, [valore, ritardoMs])

  return valoreRitardato
}
