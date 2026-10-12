import { useState } from 'react'
import type { Oggetto } from '../types/api'

interface Preferiti {
  isPreferito: (id: string) => boolean
  toggle: (oggetto: Oggetto) => void
}

// carta aperta nel dettaglio dalle pagine con una griglia di carte (set, Pokémon, preferiti):
// apri va alla griglia, modale si stende sul componente: <ModaleCarta {...modale} />
export function useCartaSelezionata({ isPreferito, toggle }: Preferiti) {
  const [selezionato, setSelezionato] = useState<Oggetto | null>(null)
  return {
    apri: setSelezionato,
    modale: {
      oggetto: selezionato,
      preferito: selezionato ? isPreferito(selezionato.id) : false,
      onTogglePreferito: toggle,
      onChiudi: () => setSelezionato(null),
    },
  }
}
