import { Link } from 'react-router'
import type { Binder } from '../../types/api'
import { CopertinaBinder } from '../binder/CopertinaBinder'
import { useImmagineBinder } from '../binder/immagine'
import { CasellaVuota, SezioneProfilo } from './SezioneProfilo'

const POSTI = 3

function BinderInEvidenza({ binder }: { binder: Binder }) {
  const immagine = useImmagineBinder(binder)
  return (
    <Link to={`/binder/${binder.id}`} className="group block">
      <div className="aspect-[3/4] transition-transform group-hover:-translate-y-1">
        <CopertinaBinder
          nome={binder.nome}
          colore={binder.colore}
          motivo={binder.motivo}
          tasche={binder.tasche}
          cartaCopertina={binder.cartaCopertina}
          immagineUrl={immagine}
          className="shadow-xl shadow-ombra/30"
        />
      </div>
      <p className="mt-2 truncate text-center text-sm font-semibold text-testo">{binder.nome}</p>
      <p className="text-center text-xs text-testo/60">
        {binder.carteInserite === 1 ? '1 carta' : `${binder.carteInserite} carte`}
      </p>
    </Link>
  )
}

// fino a tre binder da mostrare; un clic apre il binder
export function SezioneBinderEvidenza({ binder, onModifica }: { binder: Binder[]; onModifica: () => void }) {
  return (
    <SezioneProfilo titolo="Binder in evidenza" sottotitolo="I tuoi album migliori, fino a tre" onModifica={onModifica}>
      <ul className="grid grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: POSTI }, (_, posto) => {
          const scelto = binder[posto]
          return (
            <li key={scelto?.id ?? `vuoto-${posto}`}>
              {scelto ? (
                <BinderInEvidenza binder={scelto} />
              ) : (
                <CasellaVuota etichetta="Metti in evidenza un binder" onClick={onModifica} className="aspect-[3/4] w-full" />
              )}
            </li>
          )
        })}
      </ul>
    </SezioneProfilo>
  )
}
