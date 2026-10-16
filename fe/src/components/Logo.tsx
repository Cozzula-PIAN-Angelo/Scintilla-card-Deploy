import { Link } from 'react-router'
import { cn } from '../utils/cn'
import { MarchioIcona, MarchioScritta } from './Marchio'

export function Logo({ compatto = false }: { compatto?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2" aria-label="CeloManca, torna al catalogo">
      <MarchioIcona className={cn('transition-all duration-300 group-hover:-rotate-6', compatto ? 'h-9' : 'h-11')} />
      <MarchioScritta className={cn('transition-all duration-300', compatto ? 'h-[23px]' : 'h-7')} />
    </Link>
  )
}
