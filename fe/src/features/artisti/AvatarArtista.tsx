import { HelpCircle } from 'lucide-react'
import type { Artista } from '../../types/api'
import { cn } from '../../utils/cn'

interface Props {
  artista: Artista
  dimensione: 'piccolo' | 'grande'
}

// Cerchio con un ritaglio dell'illustrazione di una carta dell'artista: l'immagine è la carta intera,
// ingrandita e spostata verso l'alto, dove sta il disegno. alt vuoto: il nome è sempre scritto accanto
export function AvatarArtista({ artista, dimensione }: Props) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-tenue ring-2 ring-linea/10',
        dimensione === 'piccolo' ? 'size-28' : 'size-40',
      )}
    >
      {artista.avatar ? (
        <img
          src={artista.avatar}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full origin-[50%_28%] scale-[2] object-cover object-[50%_28%]"
        />
      ) : (
        <HelpCircle aria-hidden className={cn('text-testo/40', dimensione === 'piccolo' ? 'size-14' : 'size-20')} />
      )}
    </span>
  )
}
