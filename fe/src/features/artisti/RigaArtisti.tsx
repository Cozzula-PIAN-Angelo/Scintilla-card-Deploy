import { Palette } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import type { ArtistaCarta } from '../../types/api'

interface Props {
  artisti: ArtistaCarta[]
  // il link porta via dalla pagina: chi mostra la riga in un modale lo chiude
  onNavigazione?: () => void
}

// "Illustrazione di A e B" nel dettaglio della carta, un link per autore
export function RigaArtisti({ artisti, onNavigazione }: Props) {
  if (artisti.length === 0) return null
  return (
    <p className="flex items-start gap-2 text-sm text-testo/70">
      <Palette aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        Illustrazione di{' '}
        {artisti.map((artista, indice) => (
          <Fragment key={`${artista.nome}-${indice}`}>
            {indice > 0 && (indice === artisti.length - 1 ? ' e ' : ', ')}
            {artista.slug ? (
              <Link
                to={`/artisti/${artista.slug}`}
                onClick={onNavigazione}
                className="font-semibold text-testo underline decoration-accento/50 underline-offset-2 hover:decoration-accento"
              >
                {artista.nome}
              </Link>
            ) : (
              <span className="font-semibold text-testo">{artista.nome}</span>
            )}
          </Fragment>
        ))}
      </span>
    </p>
  )
}
