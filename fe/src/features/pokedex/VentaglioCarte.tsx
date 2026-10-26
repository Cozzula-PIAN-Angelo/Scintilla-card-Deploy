import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import type { Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'

// le ultime carte del Pokémon a ventaglio, come in mano: al passaggio la carta si raddrizza e sale.
// Solo carte con l'immagine: il placeholder non è una carta vera. Misura fissa (cinque carte da 5,5rem
// sovrapposte di 2rem) anche da vuoto, così chi sta accanto non si sposta quando arrivano
export function VentaglioCarte({ carte, inAttesa, className }: { carte: Oggetto[]; inAttesa: boolean; className?: string }) {
  const mostrate = carte.filter((c) => c.immagineUrlPiccola ?? c.immagineUrl).slice(0, 5)
  return (
    <ul className={cn('flex h-32 w-[19.5rem] shrink-0 items-end', className)} aria-label="Le sue carte più recenti" aria-busy={inAttesa}>
      {mostrate.map((c, i) => (
        <li
          key={c.id}
          className="-ml-8 transition-transform duration-300 ease-out first:ml-0 hover:z-20! hover:-translate-y-2! hover:rotate-0!"
          style={{ zIndex: 10 - i, rotate: `${(i - 2) * 5}deg`, translate: `0 ${Math.abs(i - 2) * 4}px` }}
        >
          <ImmagineCarta
            src={c.immagineUrlPiccola ?? c.immagineUrl}
            alt={c.nome}
            className={cn(FORMA_CARTA, 'aspect-[63/88] w-[5.5rem] shadow-lg shadow-black/40')}
          />
        </li>
      ))}
      {inAttesa && mostrate.length === 0 && <li className="text-sm text-white/90">Cerco le sue carte…</li>}
    </ul>
  )
}
