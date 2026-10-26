import { useState } from 'react'
import { cn } from '../../utils/cn'
import { spriteAnimatoUrl, spriteUrl } from './pokedex'

interface Props {
  numero: number
  // il chiamante sa quando il mouse (o il focus) è sopra la sua voce
  attivo: boolean
  // Pokémon che manca alla collezione: sagoma, che si colora al passaggio
  sagoma?: boolean
  // la GIF è ritagliata attorno al Pokémon, alla sua misura: nei riquadri grandi si ingrandisce a pixel interi
  ingrandimento?: number
  // appoggiato sul fondo del riquadro (su una pedana) invece che al centro
  appoggiato?: boolean
  className?: string
}

// sprite fermo 96x96; al passaggio la GIF prende il suo posto quando è pronta. La GIF si scarica solo al primo
// passaggio, e se manca (404) non si riprova e resta lo sprite fermo. Con "riduci movimento" niente GIF
export function SpritePokemon({ numero, attivo, sagoma = false, ingrandimento = 1, appoggiato = false, className }: Props) {
  const [gifPronta, setGifPronta] = useState(false)
  const [larghezzaGif, setLarghezzaGif] = useState<number | null>(null)
  const [gifMancante, setGifMancante] = useState(false)
  const [richiesta, setRichiesta] = useState(false)
  if (attivo && !richiesta) setRichiesta(true)
  const mostraGif = attivo && gifPronta
  return (
    <span className={cn('relative block', className)}>
      <img
        src={spriteUrl(numero)}
        alt=""
        loading="lazy"
        decoding="async"
        width={96}
        height={96}
        className={cn(
          'sprite-pixel size-full object-contain transition-[filter,opacity] duration-300',
          sagoma && !attivo && 'sprite-sagoma',
          mostraGif && 'motion-safe:invisible',
        )}
      />
      {richiesta && !gifMancante && (
        <img
          src={spriteAnimatoUrl(numero)}
          alt=""
          onLoad={(e) => {
            setLarghezzaGif(e.currentTarget.naturalWidth)
            setGifPronta(true)
          }}
          onError={() => setGifMancante(true)}
          style={larghezzaGif && ingrandimento !== 1 ? { width: larghezzaGif * ingrandimento } : undefined}
          // le GIF più grandi del riquadro si rimpiccioliscono, le altre restano alla loro misura
          className={cn(
            'sprite-pixel absolute max-h-full max-w-full object-contain motion-reduce:hidden',
            appoggiato ? 'inset-x-0 bottom-[12%] mx-auto' : 'inset-0 m-auto',
            !mostraGif && 'invisible',
          )}
        />
      )}
    </span>
  )
}
