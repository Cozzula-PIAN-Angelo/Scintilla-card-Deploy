import { useEffect, useState } from 'react'
import { cn } from '../../utils/cn'
import { SpritePokemon } from './SpritePokemon'

// lo sprite animato in grande appoggiato su una pedana chiara, come nella schermata dei giochi. Quadrato: si dà
// l'altezza (o la larghezza) e l'altro lato segue. Un Pokémon che manca alla collezione compare in sagoma e
// poco dopo si colora, come in "Chi è quel Pokémon?"
export function Pedana({ numero, sagoma = false, className }: { numero: number; sagoma?: boolean; className?: string }) {
  return (
    <div className={cn('relative aspect-square', className)}>
      <span aria-hidden className="absolute bottom-[6%] left-[15%] h-[12%] w-[70%] rounded-[50%] bg-white/12 blur-[2px]" />
      <SpriteSvelato key={numero} numero={numero} sagoma={sagoma} />
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
  return <SpritePokemon numero={numero} attivo={svelato} sagoma={sagoma} appoggiato ingrandimento={4} className="absolute inset-0" />
}
