import { useState } from 'react'
import type { CollezioneModale } from '../components/ModaleCarta'
import type { Oggetto } from '../types/api'

interface Preferiti {
  isPreferito: (id: string) => boolean
  toggle: (oggetto: Oggetto) => void
}

// carta aperta nel dettaglio dalle pagine con una griglia di carte (set, Pokémon, preferiti):
// apri va alla griglia, modale si stende sul componente: <ModaleCarta {...modale} />.
// `collezione` (facoltativa) è passata dalle pagine che la caricano: senza, il dettaglio non ha la sezione
export function useCartaSelezionata({ isPreferito, toggle }: Preferiti, collezione?: CollezioneModale) {
  const [selezionato, setSelezionato] = useState<Oggetto | null>(null)
  return {
    apri: setSelezionato,
    modale: {
      oggetto: selezionato,
      preferito: selezionato ? isPreferito(selezionato.id) : false,
      onTogglePreferito: toggle,
      onChiudi: () => setSelezionato(null),
      collezione,
    },
  }
}
