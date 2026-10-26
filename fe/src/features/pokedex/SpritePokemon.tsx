import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '../../utils/cn'
import { useIngombro, type Ingombro } from './ingombroSprite'
import { spriteAnimatoUrl, spriteUrl } from './pokedex'

interface Props {
  numero: number
  // il chiamante sa quando il mouse (o il focus) è sopra la sua voce
  attivo: boolean
  // Pokémon che manca alla collezione: sagoma, che si colora al passaggio
  sagoma?: boolean
  // in piedi su una pedana in fondo al riquadro, ingrandito in proporzione al riquadro, col disegno centrato
  // davvero e l'ombra larga quanto lui
  appoggiato?: boolean
  className?: string
}

// sulla pedana i piedi stanno all'8% dal fondo del riquadro, verso il bordo basso dell'ombra (che va dal 6% al 18%)
const PIEDI = 0.08
// sulla pedana un pixel dello sprite è grande 1/60 del riquadro: 4 volte in un riquadro da 240 px. Sprite fermo e
// GIF hanno la stessa scala (i loro pixel art sono alla stessa misura), così al cambio non c'è scatto
const PIXEL_PER_LATO = 60

// sprite fermo 96x96; al passaggio la GIF prende il suo posto quando è pronta. La GIF si scarica solo al primo
// passaggio, e se manca (404) non si riprova e resta lo sprite fermo. Con "riduci movimento" niente GIF
export function SpritePokemon({ numero, attivo, sagoma = false, appoggiato = false, className }: Props) {
  const [gif, setGif] = useState<{ larghezza: number; altezza: number } | null>(null)
  const [gifMancante, setGifMancante] = useState(false)
  const [richiesta, setRichiesta] = useState(false)
  if (attivo && !richiesta) setRichiesta(true)
  // sulla pedana si misura dove sta il disegno nell'immagine; finché non si sa, l'immagine aspetta invisibile
  const ingombroFermo = useIngombro(appoggiato ? spriteUrl(numero) : null)
  const ingombroGif = useIngombro(appoggiato && richiesta && !gifMancante ? spriteAnimatoUrl(numero) : null)
  const mostraGif = attivo && gif !== null && (!appoggiato || ingombroGif !== undefined)
  const [lato, refLato] = useLato(appoggiato)
  const fermoPronto = !appoggiato || (ingombroFermo !== undefined && lato > 0)
  const scala = lato / PIXEL_PER_LATO

  // larghezza del disegno a schermo, per l'ombra: le GIF più grandi del riquadro si rimpiccioliscono
  let disegno = 0
  if (mostraGif && ingombroGif) disegno = ingombroGif.larghezza * gif.larghezza * Math.min(scala, lato / gif.larghezza, lato / gif.altezza)
  else if (ingombroFermo) disegno = ingombroFermo.larghezza * 96 * scala

  return (
    <span ref={refLato} className={cn('relative block', className)}>
      {appoggiato && (
        // l'ombra: almeno il 70% del riquadro, più larga sotto chi è più largo (Venusaur)
        <span
          aria-hidden
          style={{ width: lato ? Math.min(lato * 1.1, Math.max(lato * 0.7, disegno * 1.05)) : '70%' }}
          className="absolute bottom-[6%] left-1/2 h-[12%] -translate-x-1/2 rounded-[50%] bg-white/12 blur-[2px] transition-[width] duration-300"
        />
      )}
      <img
        src={spriteUrl(numero)}
        alt=""
        loading="lazy"
        decoding="async"
        width={96}
        height={96}
        crossOrigin={appoggiato ? 'anonymous' : undefined}
        style={appoggiato ? sullaPedana(96 * scala, ingombroFermo) : undefined}
        className={cn(
          'sprite-pixel object-contain transition-[filter,opacity] duration-300',
          // sulla pedana alla stessa scala della GIF: il riquadro 96x96 ha molto vuoto attorno e può uscire dal bordo
          appoggiato ? 'absolute inset-x-0 mx-auto max-w-none' : 'size-full',
          sagoma && !attivo && 'sprite-sagoma',
          mostraGif && 'motion-safe:invisible',
          !fermoPronto && 'invisible',
        )}
      />
      {richiesta && !gifMancante && (
        <img
          src={spriteAnimatoUrl(numero)}
          alt=""
          crossOrigin={appoggiato ? 'anonymous' : undefined}
          onLoad={(e) => setGif({ larghezza: e.currentTarget.naturalWidth, altezza: e.currentTarget.naturalHeight })}
          onError={() => setGifMancante(true)}
          style={appoggiato && gif ? sullaPedana(gif.larghezza * scala, ingombroGif) : undefined}
          // le GIF più grandi del riquadro si rimpiccioliscono, le altre restano alla loro misura
          className={cn(
            'sprite-pixel absolute max-h-full max-w-full object-contain motion-reduce:hidden',
            appoggiato ? 'inset-x-0 mx-auto' : 'inset-0 m-auto',
            !mostraGif && 'invisible',
          )}
        />
      )}
    </span>
  )
}

// immagine larga larghezza px, coi piedi del disegno all'altezza PIEDI e il suo peso al centro. Il translate è in
// percentuale della misura dell'immagine stessa, quindi vale a qualunque ingrandimento
function sullaPedana(larghezza: number, ingombro: Ingombro | null | undefined): CSSProperties {
  return {
    width: larghezza,
    bottom: `${PIEDI * 100}%`,
    translate: ingombro ? `${ingombro.dx * 100}% ${ingombro.dy * 100}%` : undefined,
  }
}

// lato in pixel del riquadro dello sprite, misurato solo se serve (sulla pedana)
function useLato(attivo: boolean) {
  const [lato, setLato] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!attivo || !el) return
    const osservatore = new ResizeObserver(() => setLato(Math.min(el.offsetWidth, el.offsetHeight)))
    osservatore.observe(el)
    return () => osservatore.disconnect()
  }, [attivo])
  return [lato, ref] as const
}
