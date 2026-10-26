import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigationType } from 'react-router'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { BarraPokedex } from '../features/pokedex/BarraPokedex'
import { CONTENITORE_POKEDEX, type FiltroStato } from '../features/pokedex/indice'
import { memoriaPokedex } from '../features/pokedex/memoriaPokedex'
import { TestataPokedex } from '../features/pokedex/TestataPokedex'
import { usePokemonPosseduti } from '../features/pokedex/usePokemonPosseduti'
import { useVistaPokedex } from '../features/pokedex/useVistaPokedex'
import { VistaGriglia } from '../features/pokedex/VistaGriglia'
import { VistaScheda } from '../features/pokedex/VistaScheda'
import { useDebounce } from '../hooks/useDebounce'
import { useTitolo } from '../hooks/useTitolo'
import { cn } from '../utils/cn'

// indice dei 1025 Pokémon: la scheda dei giochi (elenco e Pokémon scelto) o la griglia di tutti, per generazione.
// Con l'accesso chi manca alla collezione è in sagoma; cliccandone uno si aprono tutte le sue carte
export function PokedexPage() {
  useTitolo('Pokédex')
  const tipoNavigazione = useNavigationType()
  const [ricerca, setRicerca] = useState('')
  const [stato, setStato] = useState<FiltroStato>('tutti')
  const [vista, setVista] = useVistaPokedex()
  const filtro = useDebounce(ricerca.trim().toLowerCase(), 150)
  const posseduti = usePokemonPosseduti()

  // altezza della barra attaccata: titoli e pannelli delle viste si attaccano sotto di lei
  const barraRef = useRef<HTMLDivElement>(null)
  const [altoBarra, setAltoBarra] = useState(0)
  useEffect(() => {
    const el = barraRef.current
    if (!el) return
    const osservatore = new ResizeObserver(() => setAltoBarra(el.offsetHeight))
    osservatore.observe(el)
    return () => osservatore.disconnect()
  }, [vista])

  // tornati da un Pokémon (indietro del browser o del sito): si riparte dallo stesso punto.
  // Salto istantaneo: il tema ha scroll-behavior smooth, che animerebbe migliaia di pixel
  useEffect(() => {
    if (tipoNavigazione === 'POP' && memoriaPokedex.posizione !== null) {
      window.scrollTo({ top: memoriaPokedex.posizione, behavior: 'instant' })
    }
    memoriaPokedex.posizione = null
  }, [tipoNavigazione])

  // top-15: attaccata alla navbar ridotta dallo scorrimento (pulsanti da 44px + py-2 = 60px)
  const barra = (generazioni?: ReactNode) => (
    <div ref={barraRef} className="sticky top-15 z-30 mt-4 bg-sfondo/90 backdrop-blur-md">
      <div className={cn(CONTENITORE_POKEDEX, 'py-3')}>
        <BarraPokedex
          ricerca={ricerca}
          onRicerca={setRicerca}
          stato={stato}
          onStato={setStato}
          vista={vista}
          onVista={setVista}
          conCollezione={posseduti !== null}
        >
          {generazioni}
        </BarraPokedex>
      </div>
    </div>
  )

  // da ospite non c'è niente da filtrare: tutti
  const props = { ricerca, filtro, stato: posseduti ? stato : 'tutti', posseduti, barra } as const

  return (
    <PaginaAnimata className="pb-16">
      <TestataPokedex posseduti={posseduti} />
      <div style={{ '--alto-barra': `${altoBarra}px` } as CSSProperties}>
        {vista === 'scheda' ? <VistaScheda {...props} /> : <VistaGriglia {...props} />}
      </div>
    </PaginaAnimata>
  )
}
