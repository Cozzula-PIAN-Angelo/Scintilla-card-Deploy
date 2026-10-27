import { Link } from 'react-router'
import { cn } from '../utils/cn'
import { MarchioIcona, MarchioScritta } from './Marchio'

export function Logo({ compatto = false }: { compatto?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2" aria-label="CeloManca, torna al catalogo">
      <MarchioIcona animata className={cn('transition-all duration-300', compatto ? 'h-10' : 'h-10 sm:h-[52px]')} />
      <MarchioScritta className={cn('transition-all duration-300', compatto ? 'h-5' : 'h-5 sm:h-[25px]')} />
    </Link>
  )
}
