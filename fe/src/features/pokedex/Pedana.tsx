import { cn } from '../../utils/cn'
import { SpritePokemon } from './SpritePokemon'

// lo sprite animato in grande appoggiato su una pedana chiara, come nella schermata dei giochi. Quadrato: si dà
// l'altezza (o la larghezza) e l'altro lato segue
export function Pedana({ numero, className }: { numero: number; className?: string }) {
  return (
    <div className={cn('relative aspect-square', className)}>
      <span aria-hidden className="absolute bottom-[6%] left-[15%] h-[12%] w-[70%] rounded-[50%] bg-white/12 blur-[2px]" />
      <SpritePokemon key={numero} numero={numero} attivo appoggiato ingrandimento={4} className="absolute inset-0" />
    </div>
  )
}
