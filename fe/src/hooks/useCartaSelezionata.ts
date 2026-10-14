import { useCallback, useState } from 'react'
import type { CollezioneModale } from '../components/ModaleCarta'
import { sfoglioCarte } from '../components/sfoglioCarte'
import type { Oggetto } from '../types/api'

interface Preferiti {
  isPreferito: (id: string) => boolean
  toggle: (oggetto: Oggetto) => void
}

// carta aperta nel dettaglio dalle pagine con una griglia di carte (set, Pokémon, preferiti):
// apri va alla griglia, modale si stende sul componente: <ModaleCarta {...modale} />.
// `collezione` (facoltativa) è passata dalle pagine che la caricano: senza, il dettaglio non ha la sezione.
// `carte` è la lista mostrata dalla pagina: con questa il dettaglio ha le frecce per sfogliarla;
// `aperta` (id della carta nel dettaglio) serve alla griglia per seguirla tra le sue pagine
export function useCartaSelezionata({ isPreferito, toggle }: Preferiti, collezione?: CollezioneModale, carte?: Oggetto[]) {
  // con la posizione che la carta aveva nella lista: se ne esce (es. tolta dai preferiti) le frecce ripartono da lì
  const [selezione, setSelezione] = useState<{ oggetto: Oggetto; indice: number } | null>(null)
  const indiceDi = useCallback((oggetto: Oggetto) => carte?.findIndex((c) => c.id === oggetto.id) ?? -1, [carte])
  const apri = useCallback((oggetto: Oggetto) => setSelezione({ oggetto, indice: indiceDi(oggetto) }), [indiceDi])
  const selezionato = selezione?.oggetto ?? null

  return {
    apri,
    aperta: selezionato?.id ?? null,
    modale: {
      oggetto: selezionato,
      preferito: selezionato ? isPreferito(selezionato.id) : false,
      onTogglePreferito: toggle,
      onChiudi: () => setSelezione(null),
      collezione,
      sfoglio:
        selezione && carte
          ? sfoglioCarte(carte, indiceDi(selezione.oggetto), selezione.indice, (oggetto, indice) => setSelezione({ oggetto, indice }))
          : undefined,
    },
  }
}
