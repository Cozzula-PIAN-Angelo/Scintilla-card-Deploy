import { motion } from 'framer-motion'
import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import type { Artista } from '../../types/api'
import { cn } from '../../utils/cn'
import { contaCarte } from './artisti'
import { LinkArtista } from './LinkArtista'
import { memoriaArtisti } from './memoriaArtisti'

export const CLASSI_INDICE = 'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

// ventaglio chiuso dietro al nome; al passaggio le carte salgono e si aprono (come i set recenti della home)
const VENTAGLIO = [
  { chiusa: { x: -26, y: 16, rotate: -9 }, aperta: { x: -46, y: -6, rotate: -15 } },
  { chiusa: { x: 26, y: 16, rotate: 9 }, aperta: { x: 46, y: -6, rotate: 15 } },
  { chiusa: { x: 0, y: 4, rotate: 0 }, aperta: { x: 0, y: -20, rotate: 0 } },
]

// un illustratore dell'indice: tre sue carte a ventaglio dietro al riquadro col nome; evidenziato se è l'ultimo aperto
export function VoceIllustratore({ artista, immagini }: { artista: Artista; immagini: string[] }) {
  // la più preziosa al centro, davanti alle altre due
  const ordine = [immagini[1], immagini[2], immagini[0]]
  return (
    <motion.li initial="chiusa" whileHover="aperta" className="list-none">
      <LinkArtista slug={artista.slug} className="relative block rounded-2xl pt-24">
        <div aria-hidden className="absolute inset-x-0 top-0 flex justify-center">
          {immagini.length === 0 ? (
            // nessuna carta da mostrare (né in archivio né per l'avatar): una tasca vuota al posto del ventaglio
            <div className="aspect-[63/88] w-20 translate-y-1 rounded-[3%/2.1%] bg-testo/10 ring-1 ring-linea/10" />
          ) : (
            ordine.map((immagine, i) =>
              immagine ? (
                <motion.div
                  key={i}
                  variants={{ chiusa: VENTAGLIO[i].chiusa, aperta: VENTAGLIO[i].aperta }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="absolute w-20"
                >
                  <ImmagineCarta src={immagine} alt="" className={cn('aspect-[63/88] w-full shadow-lg shadow-ombra/40', FORMA_CARTA)} />
                </motion.div>
              ) : null,
            )
          )}
        </div>
        <div
          className={cn(
            'relative flex flex-col items-center rounded-2xl bg-superficie px-3 py-3 text-center shadow-lg shadow-ombra/15 ring-1 ring-linea/5',
            artista.slug === memoriaArtisti.ultimo && 'ring-4 ring-giallo-400',
          )}
        >
          <span className="line-clamp-2 font-titolo text-base font-semibold leading-tight text-testo">{artista.nome}</span>
          <span className="mt-0.5 text-xs font-semibold text-testo/60">{contaCarte(artista.carte)}</span>
        </div>
      </LinkArtista>
    </motion.li>
  )
}
