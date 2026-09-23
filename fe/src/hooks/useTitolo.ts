import { useEffect } from 'react'

export function useTitolo(titolo: string): void {
  useEffect(() => {
    document.title = `${titolo} · Scintilla`
  }, [titolo])
}
