import type { ReactNode } from 'react'
import type { MotivoBinder, Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { angoli, classeMotivo, proporzionePagina, scuro, stileMotivo } from './aspetto'

interface Props {
  nome: string
  colore: string
  motivo: MotivoBinder
  // decide la proporzione, quindi gli angoli
  tasche: number
  cartaCopertina: Oggetto | null
  // object URL dell'immagine caricata (vedi useImmagineBinder), oppure l'anteprima locale
  immagineUrl: string | null
  className?: string
}

// Faccia anteriore di un binder chiuso. Riempie il contenitore: le proporzioni le decide chi la usa.
// Le misure interne sono in cqw (larghezza della copertina), così resta uguale in mensola e da aperto
export function CopertinaBinder({ nome, colore, motivo, tasche, cartaCopertina, immagineUrl, className }: Props) {
  return (
    <div
      className={cn('@container relative h-full w-full overflow-hidden', className)}
      style={{ backgroundColor: colore, borderRadius: angoli('destra', proporzionePagina(tasche)) }}
    >
      {immagineUrl ? (
        <img src={immagineUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        motivo !== 'NESSUNO' && (
          <div aria-hidden className={cn('absolute inset-0', classeMotivo(motivo))} style={stileMotivo(motivo)} />
        )
      )}

      {/* luce radente e bordi più scuri: effetto similpelle */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgb(255 255 255 / 0.22), transparent 38%, transparent 62%, rgb(0 0 0 / 0.28)), radial-gradient(ellipse at 30% 0%, rgb(255 255 255 / 0.12), transparent 60%)',
          boxShadow: `inset 0 0 0 0.8cqw ${scuro(colore, 18)}, inset 0 0 3cqw rgb(0 0 0 / 0.25)`,
        }}
      />

      {/* cerniera del dorso */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-[8%]"
        style={{ background: `linear-gradient(90deg, ${scuro(colore, 45)}, ${scuro(colore, 20)} 70%, ${scuro(colore, 55)})` }}
      />

      {cartaCopertina && (
        <div className="absolute left-[54%] top-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[2.5cqw] bg-white/85 p-[1.6cqw] shadow-[0_1.5cqw_4cqw_rgb(0_0_0/0.45)] ring-[0.6cqw] ring-black/15">
          <img
            src={cartaCopertina.immagineUrlPiccola ?? cartaCopertina.immagineUrl ?? ''}
            alt=""
            className="aspect-[63/88] w-full rounded-[1.4cqw] object-cover"
          />
        </div>
      )}

      <div className="absolute inset-x-[14%] bottom-[7%] rounded-[3cqw] bg-black/40 px-[4cqw] py-[2.4cqw] text-center ring-1 ring-white/20 backdrop-blur-sm">
        <p className="truncate font-titolo text-[7cqw] font-bold leading-tight text-white drop-shadow">{nome || 'Senza nome'}</p>
      </div>
    </div>
  )
}

interface PropsInterno {
  colore: string
  className?: string
  children?: ReactNode
}

// interno della copertina (e del retro): fodera scura con una trama leggera
export function FoderaBinder({ colore, className, children }: PropsInterno) {
  return (
    <div
      className={cn('@container relative h-full w-full overflow-hidden', className)}
      style={{
        backgroundColor: scuro(colore, 38),
        backgroundImage:
          'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.035) 0 2px, transparent 2px 7px), linear-gradient(90deg, rgb(0 0 0 / 0.25), transparent 30%)',
      }}
    >
      {children}
    </div>
  )
}
