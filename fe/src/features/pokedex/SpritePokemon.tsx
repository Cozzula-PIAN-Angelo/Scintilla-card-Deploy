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
  // la GIF è ritagliata attorno al Pokémon, alla sua misura: nei riquadri grandi si ingrandisce a pixel interi
  ingrandimento?: number
  // in piedi su una pedana in fondo al riquadro, col disegno centrato davvero e l'ombra larga quanto lui
  appoggiato?: boolean
  className?: string
}

// sulla pedana i piedi stanno al 10% dal fondo del riquadro, un po' dentro l'ombra (che va dal 6% al 18%)
const PIEDI = 0.1

// sprite fermo 96x96; al passaggio la GIF prende il suo posto quando è pronta. La GIF si scarica solo al primo
// passaggio, e se manca (404) non si riprova e resta lo sprite fermo. Con "riduci movimento" niente GIF
export function SpritePokemon({ numero, attivo, sagoma = false, ingrandimento = 1, appoggiato = false, className }: Props) {
  const [gif, setGif] = useState<{ larghezza: number; altezza: number } | null>(null)
  const [gifMancante, setGifMancante] = useState(false)
  const [richiesta, setRichiesta] = useState(false)
  if (attivo && !richiesta) setRichiesta(true)
  // sulla pedana si misura dove sta il disegno nell'immagine; finché non si sa, l'immagine aspetta invisibile
  const ingombroFermo = useIngombro(appoggiato ? spriteUrl(numero) : null)
  const ingombroGif = useIngombro(appoggiato && richiesta && !gifMancante ? spriteAnimatoUrl(numero) : null)
  const mostraGif = attivo && gif !== null && (!appoggiato || ingombroGif !== undefined)
  const fermoPronto = !appoggiato || ingombroFermo !== undefined
  const [lato, refLato] = useLato(appoggiato)

  // larghezza del disegno a schermo, per l'ombra: la GIF si rimpicciolisce se non sta nel riquadro
  let disegno = 0
  if (mostraGif && ingombroGif) {
    const scala = Math.min(ingrandimento, lato / gif.larghezza, lato / gif.altezza)
    disegno = ingombroGif.larghezza * gif.larghezza * scala
  } else if (ingombroFermo) disegno = ingombroFermo.larghezza * lato

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
        // lo sprite fermo riempie il riquadro: il fondo del disegno va all'altezza dei piedi della GIF
        style={appoggiato ? spostamento(ingombroFermo, PIEDI) : undefined}
        className={cn(
          'sprite-pixel relative size-full object-contain transition-[filter,opacity] duration-300',
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
          style={{
            ...(gif && ingrandimento !== 1 && { width: gif.larghezza * ingrandimento }),
            ...(appoggiato && spostamento(ingombroGif, 0)),
          }}
          // le GIF più grandi del riquadro si rimpiccioliscono, le altre restano alla loro misura
          className={cn(
            'sprite-pixel absolute max-h-full max-w-full object-contain motion-reduce:hidden',
            appoggiato ? 'inset-x-0 bottom-[10%] mx-auto' : 'inset-0 m-auto',
            !mostraGif && 'invisible',
          )}
        />
      )}
    </span>
  )
}

// translate in percentuale della misura dell'immagine stessa: vale a qualunque ingrandimento. sollevato: quanto
// il fondo del disegno deve restare sopra il fondo dell'immagine
function spostamento(ingombro: Ingombro | null | undefined, sollevato: number): CSSProperties | undefined {
  // senza misura (immagine non leggibile) lo spostamento medio degli sprite fermi
  if (!ingombro) return sollevato ? { translate: '0 10%' } : undefined
  return { translate: `${ingombro.dx * 100}% ${(ingombro.dy - sollevato) * 100}%` }
}

// lato in pixel del riquadro dello sprite, misurato solo se serve (sulla pedana)
function useLato(attivo: boolean) {
  const [lato, setLato] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!attivo || !el) return
    const osservatore = new ResizeObserver(() => setLato(el.offsetWidth))
    osservatore.observe(el)
    return () => osservatore.disconnect()
  }, [attivo])
  return [lato, ref] as const
}
