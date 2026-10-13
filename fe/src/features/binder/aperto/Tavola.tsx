import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'
import { angoli, scuro } from '../aspetto'
import { angoliFoglio, MARGINE_COPERTINA, type Lato } from './costanti'

// Solo il foglio, senza la cornice della copertina: è la parte che gira sfogliando (la cornice è
// la copertina e resta ferma). Stessa geometria di Tavola, così a fine giro combacia
export function SoloFoglio({ lato, children }: { lato: Lato; children: ReactNode }) {
  return (
    <div className="@container h-full w-full" style={{ padding: `${MARGINE_COPERTINA}%` }}>
      <div className={cn('relative h-full w-full overflow-hidden shadow-[0_0.3cqw_0.8cqw_rgb(0_0_0/0.45)]', angoliFoglio(lato))}>
        {children}
      </div>
    </div>
  )
}

// cornice colorata del binder attorno a una facciata: stessi angoli della copertina,
// così da chiuso non spunta niente da sotto. Sotto il foglio visibile, la pila degli altri
export function Tavola({
  colore,
  lato,
  proporzione,
  fogli = 0,
  fodera = false,
  senzaFondo = false,
  children,
}: {
  colore: string
  lato: Lato
  proporzione: number
  fogli?: number
  // la fodera interna ha gli stessi angoli morbidi della copertina, non quelli vivi del foglio
  fodera?: boolean
  // solo margine e contenuto: il fondo lo disegna chi sta sotto (la copertina aperta, unica)
  senzaFondo?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn('@container relative h-full w-full', !senzaFondo && 'shadow-xl shadow-ombra/30')}
      style={{
        padding: `${MARGINE_COPERTINA}%`,
        ...(senzaFondo
          ? {}
          : {
              borderRadius: angoli(lato, proporzione),
              backgroundColor: scuro(colore, 12),
              backgroundImage: 'linear-gradient(135deg, rgb(255 255 255 / 0.12), transparent 45%, rgb(0 0 0 / 0.2))',
            }),
      }}
    >
      {fogli > 0 && <PilaFogli lato={lato} fogli={fogli} classeAngoli={angoliFoglio(lato)} />}
      <div
        className={cn('relative h-full w-full overflow-hidden shadow-[0_0.3cqw_0.8cqw_rgb(0_0_0/0.45)]', !fodera && angoliFoglio(lato))}
        style={fodera ? { borderRadius: angoli(lato, proporzione) } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

// Fogli sotto quello visibile, sfalsati verso l'esterno e verso il basso: se ne vedono i bordi
// sulla cornice, come lo spessore di un album vero. Più fogli, pila più spessa (con un massimo,
// così resta dentro la cornice); oltre qualche strato i bordi si confonderebbero, quindi al più 7
function PilaFogli({ lato, fogli, classeAngoli }: { lato: Lato; fogli: number; classeAngoli: string }) {
  const strati = Math.min(fogli, 7)
  const spessore = Math.min(1.9, 0.5 + fogli * 0.12) // cqw
  const passo = spessore / strati
  const verso = lato === 'destra' ? 1 : -1
  // margine della cornice, in cqw della tavola
  const margine = MARGINE_COPERTINA

  // dal più lontano al più vicino: ciascuno copre in parte quello sotto
  return Array.from({ length: strati }, (_, i) => {
    const distanza = strati - i
    const dx = Number((distanza * passo * verso).toFixed(3))
    const dy = Number((distanza * passo * 0.8).toFixed(3))
    return (
      <div
        key={distanza}
        aria-hidden
        className={cn('pointer-events-none absolute', classeAngoli)}
        style={{
          top: `${margine + dy}cqw`,
          bottom: `${margine - dy}cqw`,
          left: `${margine + dx}cqw`,
          right: `${margine - dx}cqw`,
          backgroundColor: distanza % 2 ? '#1c1e23' : '#30333a',
          boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.1), 0 1px 3px rgb(0 0 0 / 0.5)',
        }}
      />
    )
  })
}
