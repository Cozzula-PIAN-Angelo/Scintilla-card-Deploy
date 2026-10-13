import { cn } from '../../../utils/cn'
import { RAGGIO_ESTERNO } from '../aspetto'
import { MARGINE_COPERTINA, type Lato } from './costanti'

// Bordo esterno della pagina da cui afferrarla, anche sopra le carte. Al passaggio del mouse
// l'angolo in basso del foglio si solleva, semitrasparente come la plastica.
// La zona da afferrare è una striscia sottile (cornice e margine del foglio) per non coprire le
// carte; l'angolo è solo grafico e trasparente ai clic, quindi può essere grande.
// Misure in pixel ricavate dalla larghezza della facciata, con le stesse proporzioni di Tavola:
// la striscia segue la curva della cornice e l'angolo quella del foglio, senza sporgere
export function ManigliaPagina({ lato, larghezzaFacciata }: { lato: Lato; larghezzaFacciata: number }) {
  const destra = lato === 'destra'
  const raggioCornice = (larghezzaFacciata * RAGGIO_ESTERNO) / 100
  // margine della cornice e raggio del foglio (1cqw), come in Tavola
  const margine = (larghezzaFacciata * MARGINE_COPERTINA) / 100
  const raggioFoglio = larghezzaFacciata * 0.01
  const latoAngolo = larghezzaFacciata * 0.2

  return (
    <div
      data-maniglia
      aria-hidden
      className={cn('group absolute inset-y-0 z-10 cursor-grab', destra ? 'right-0' : 'left-0')}
      // fin dove iniziano le tasche: cornice più margine del foglio
      style={{ width: larghezzaFacciata * 0.052 }}
    >
      <div
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          destra ? 'bg-gradient-to-l from-black/8 to-transparent' : 'bg-gradient-to-r from-black/8 to-transparent',
        )}
        style={
          destra
            ? { borderTopRightRadius: raggioCornice, borderBottomRightRadius: raggioCornice }
            : { borderTopLeftRadius: raggioCornice, borderBottomLeftRadius: raggioCornice }
        }
      />
      {/* zona sensibile nell'angolo: un triangolo (clip-path limita anche i clic), così della carta
          sotto se ne copre solo la punta */}
      <div
        className="absolute cursor-grab"
        style={{
          bottom: margine,
          width: latoAngolo * 0.55,
          height: latoAngolo * 0.55,
          clipPath: destra ? 'polygon(100% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 100%, 0 100%)',
          ...(destra ? { right: margine, borderBottomRightRadius: raggioFoglio } : { left: margine, borderBottomLeftRadius: raggioFoglio }),
        }}
      />
      {/* ritaglio con l'angolo arrotondato del foglio; esce dalla striscia verso l'interno della pagina */}
      <div
        className="pointer-events-none absolute overflow-hidden"
        style={{
          bottom: margine,
          width: latoAngolo,
          height: latoAngolo,
          ...(destra ? { right: margine, borderBottomRightRadius: raggioFoglio } : { left: margine, borderBottomLeftRadius: raggioFoglio }),
        }}
      >
        <div
          className={cn(
            'absolute bottom-0 size-0 backdrop-blur-[1px] transition-all duration-300 group-hover:size-full',
            destra
              ? 'right-0 rounded-tl-[40%] bg-[linear-gradient(135deg,transparent_48%,rgb(0_0_0/0.12)_50%,rgb(255_255_255/0.32)_56%,rgb(255_255_255/0.14)_100%)]'
              : 'left-0 rounded-tr-[40%] bg-[linear-gradient(225deg,transparent_48%,rgb(0_0_0/0.12)_50%,rgb(255_255_255/0.32)_56%,rgb(255_255_255/0.14)_100%)]',
          )}
        />
      </div>
    </div>
  )
}
