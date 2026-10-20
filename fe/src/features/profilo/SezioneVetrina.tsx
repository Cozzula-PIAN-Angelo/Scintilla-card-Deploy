import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import type { Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { CasellaVuota, SezioneProfilo } from './SezioneProfilo'

const POSTI = 6

interface Props {
  vetrina: Oggetto[]
  onApri: (carta: Oggetto) => void
  onModifica: () => void
}

// sei carte scelte a mano, separate dai preferiti col cuore; un clic apre il dettaglio
export function SezioneVetrina({ vetrina, onApri, onModifica }: Props) {
  return (
    <SezioneProfilo titolo="Vetrina" sottotitolo="Fino a sei carte da mostrare, anche se non le hai" onModifica={onModifica}>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: POSTI }, (_, posto) => {
          const carta = vetrina[posto]
          return (
            <li key={carta?.id ?? `vuoto-${posto}`} className="aspect-[63/88]">
              {carta ? (
                <button
                  type="button"
                  onClick={() => onApri(carta)}
                  aria-label={`Apri ${carta.nome}`}
                  className="block h-full w-full transition-transform hover:-translate-y-1"
                >
                  <ImmagineCarta
                    src={carta.immagineUrlPiccola ?? carta.immagineUrl}
                    alt={carta.nome}
                    className={cn('aspect-[63/88] w-full shadow-lg shadow-ombra/20', FORMA_CARTA)}
                  />
                </button>
              ) : (
                <CasellaVuota etichetta="Aggiungi una carta alla vetrina" onClick={onModifica} className="h-full w-full" />
              )}
            </li>
          )
        })}
      </ul>
    </SezioneProfilo>
  )
}
