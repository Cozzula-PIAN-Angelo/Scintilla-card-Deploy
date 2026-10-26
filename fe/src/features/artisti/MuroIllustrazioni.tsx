import { motion } from 'framer-motion'
import { useMemo, useState, type ReactNode } from 'react'
import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import type { AnteprimaArtista, CartaAnteprima } from '../../types/api'
import { cn } from '../../utils/cn'
import { useCarteCaricateDiPiuSet } from '../vetrina/useCarteCaricate'
import { contaCarte } from './artisti'
import { LinkArtista } from './LinkArtista'

// sul muro (sei colonne per tre righe): il titolo in alto a sinistra, due illustrazioni grandi (a destra in alto e a
// sinistra sotto il titolo) e otto piccole; da telefono il titolo, la prima grande e quattro piccole
const SUL_MURO = 10
const GRANDI: Record<number, string> = { 0: 'lg:col-start-5 lg:row-start-1', 5: 'lg:col-start-1 lg:row-start-2' }

interface Props {
  // vuoto mentre arrivano: al loro posto le sagome
  artisti: AnteprimaArtista[]
  inAttesa: boolean
  // il primo riquadro del muro
  titolo: ReactNode
}

// il muro delle illustrazioni: per ogni illustratore il disegno di una sua carta, ritagliato dalla finestra
// dell'illustrazione, con il nome come una firma. Al passaggio la carta intera spunta dall'angolo
export function MuroIllustrazioni({ artisti, inAttesa, titolo }: Props) {
  const gruppi = useMemo(() => artisti.slice(0, SUL_MURO).map((a) => a.illustrazioni), [artisti])
  const carte = useCarteCaricateDiPiuSet(gruppi, 1)
  // finito l'arrivo senza nessuno da mostrare (archivio vuoto, errore) resta solo il titolo
  const riquadri = artisti.length > 0 || inAttesa ? SUL_MURO : 0

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
      <div className="col-span-2 flex flex-col justify-end pb-2 lg:col-start-1 lg:row-start-1">{titolo}</div>
      {Array.from({ length: riquadri }, (_, i) => {
        const artista = artisti[i]
        const classi = cn(i in GRANDI ? cn('col-span-2 row-span-2 max-lg:aspect-[4/3]', GRANDI[i]) : 'aspect-[4/3]', i >= 5 && 'max-lg:hidden')
        return artista ? (
          <Illustrazione key={artista.slug} artista={artista} carta={carte[i]?.[0]} grande={i in GRANDI} className={classi} />
        ) : (
          <div key={i} aria-hidden className={cn('skeleton rounded-2xl opacity-20', classi)} />
        )
      })}
    </div>
  )
}

function Illustrazione({ artista, carta, grande, className }: { artista: AnteprimaArtista; carta?: CartaAnteprima; grande: boolean; className: string }) {
  // anche col focus da tastiera la carta spunta: il focus è sul link, gli eventi di React risalgono fin qui
  const [fuoco, setFuoco] = useState(false)
  return (
    <motion.div
      initial="ferma"
      animate={fuoco ? 'sopra' : 'ferma'}
      whileHover="sopra"
      onFocus={() => setFuoco(true)}
      onBlur={() => setFuoco(false)}
      className={className}
    >
      <LinkArtista
        slug={artista.slug}
        etichetta={`${artista.nome}, ${contaCarte(artista.carte)}`}
        className="group relative block size-full overflow-hidden rounded-2xl bg-blu-900 shadow-xl shadow-black/30 ring-1 ring-white/15"
      >
        {carta ? (
          <>
            {/* il cuore della finestra del disegno, dal 12% al 46% dell'altezza della carta (sotto c'è la riga di
                altezza e peso): la carta è alta 2,9 volte il riquadro, sale del 34% del riquadro e sta al centro */}
            <img
              src={carta.immagineUrl ?? carta.immagineUrlPiccola ?? ''}
              alt=""
              decoding="async"
              className="absolute top-[-34%] left-1/2 h-[290%] w-auto max-w-none -translate-x-1/2 origin-[50%_15%] transition-transform duration-700 ease-out group-hover:scale-105 group-focus-visible:scale-105"
            />
            <motion.div
              aria-hidden
              variants={{ ferma: { y: '115%', rotate: 12 }, sopra: { y: '0%', rotate: 6 } }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className={cn('absolute right-3 bottom-3', grande ? 'w-[24%]' : 'w-[30%]')}
            >
              <ImmagineCarta src={carta.immagineUrlPiccola} alt="" className={cn('aspect-[63/88] w-full shadow-2xl shadow-black/60', FORMA_CARTA)} />
            </motion.div>
          </>
        ) : (
          <div aria-hidden className="skeleton absolute inset-0 opacity-20" />
        )}
        <span
          className={cn(
            'absolute bottom-3 left-3 flex max-w-[85%] flex-col rounded-2xl bg-giallo-400 text-blu-900 shadow-lg shadow-black/30',
            grande ? 'px-4 py-2' : 'px-3 py-1.5',
          )}
        >
          {/* la firma si legge intera: va a capo invece di finire coi puntini */}
          <span className={cn('line-clamp-2 font-titolo font-semibold leading-tight break-words', grande ? 'text-2xl' : 'text-base')}>{artista.nome}</span>
          <span className="text-xs font-semibold text-blu-900/75">{contaCarte(artista.carte)}</span>
        </span>
      </LinkArtista>
    </motion.div>
  )
}
