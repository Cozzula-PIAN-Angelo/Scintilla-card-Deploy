import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { memoriaArtisti } from './memoriaArtisti'

// link alla pagina di un illustratore che ricorda il punto dell'elenco: tornando indietro si riparte da lì,
// con lui evidenziato
export function LinkArtista({ slug, className, etichetta, children }: { slug: string; className?: string; etichetta?: string; children: ReactNode }) {
  return (
    <Link
      to={`/artisti/${slug}`}
      // arrivati dall'elenco: "← Illustratori" nella pagina dell'illustratore torna qui con l'indietro del browser
      state={{ daElenco: true }}
      aria-label={etichetta}
      onClick={() => {
        memoriaArtisti.posizione = window.scrollY
        memoriaArtisti.ultimo = slug
      }}
      className={className}
    >
      {children}
    </Link>
  )
}
