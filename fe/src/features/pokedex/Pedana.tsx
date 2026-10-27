import { useEffect, useState } from 'react'
import { useDimensioni } from '../../hooks/useDimensioni'
import { cn } from '../../utils/cn'
import { SpritePokemon } from './SpritePokemon'

// lato massimo della pedana quando riempie lo spazio che ha
const LATO_MASSIMO = 480

// lo sprite animato in grande appoggiato su una pedana chiara (disegnata da SpritePokemon), come nella schermata
// dei giochi. Quadrata: con riempi prende il quadrato più grande che sta nello spazio del contenitore (la scheda
// dell'indice, alta quanto lo schermo), altrimenti la misura la dà className. Un Pokémon che manca alla
// collezione compare in sagoma e poco dopo si colora, come in "Chi è quel Pokémon?"
export function Pedana({ numero, sagoma = false, riempi = false, className }: { numero: number; sagoma?: boolean; riempi?: boolean; className?: string }) {
  const [misura, spazio] = useDimensioni<HTMLDivElement>()
  const lato = Math.min(spazio.larghezza, spazio.altezza, LATO_MASSIMO)

  const pedana = (
    <div className={cn('relative aspect-square', !riempi && className)} style={riempi ? { width: lato } : undefined}>
      <SpriteSvelato key={numero} numero={numero} sagoma={sagoma} />
    </div>
  )
  if (!riempi) return pedana
  return (
    <div ref={misura} className={cn('flex items-center justify-center', className)}>
      {pedana}
    </div>
  )
}

function SpriteSvelato({ numero, sagoma }: { numero: number; sagoma: boolean }) {
  const [svelato, setSvelato] = useState(!sagoma)
  useEffect(() => {
    if (svelato) return
    const timer = setTimeout(() => setSvelato(true), 700)
    return () => clearTimeout(timer)
  }, [svelato])
  return <SpritePokemon numero={numero} attivo={svelato} sagoma={sagoma} appoggiato className="size-full" />
}
