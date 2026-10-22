import { ArrowDownNarrowWide, ArrowDownWideNarrow } from 'lucide-react'
import { useState } from 'react'
import { messaggioErrore } from '../../../app/errori'
import { Button } from '../../../components/Button'
import { Modale } from '../../../components/Modale'
import type { BinderDettaglio, CriterioOrdine } from '../../../types/api'
import { cn } from '../../../utils/cn'
import { useToast } from '../../toast/useToast'
import { useRiordinaBinderMutation, useRipristinaBinderMutation } from '../binderApi'

// versi: [crescente, decrescente]
const CRITERI: { valore: CriterioOrdine; etichetta: string; versi: [string, string] }[] = [
  { valore: 'SET_NUMERO', etichetta: 'Set e numero', versi: ['Dal set più vecchio', 'Dal set più recente'] },
  { valore: 'POKEDEX', etichetta: 'Numero Pokédex', versi: ['Crescente', 'Decrescente'] },
  { valore: 'NOME', etichetta: 'Nome', versi: ['A-Z', 'Z-A'] },
  { valore: 'RARITA', etichetta: 'Rarità', versi: ['Dalla più comune', 'Dalla più rara'] },
]

interface Props {
  aperto: boolean
  dettaglio: BinderDettaglio
  onChiudi: () => void
}

// scelta del criterio (ritoccandolo si inverte) e conferma; dopo il riordino un toast permette di tornare alla disposizione di prima
export function ModaleOrdina({ aperto, dettaglio, onChiudi }: Props) {
  const toast = useToast()
  const [criterio, setCriterio] = useState<CriterioOrdine>('SET_NUMERO')
  const [decrescente, setDecrescente] = useState(false)
  const [riordina, { isLoading }] = useRiordinaBinderMutation()
  const [ripristina] = useRipristinaBinderMutation()
  const binderId = dettaglio.binder.id
  const carte = dettaglio.slot.length

  const conferma = async () => {
    const errore = (e: unknown) => toast.errore(messaggioErrore(e, 'Operazione non riuscita, riprova'))
    const prima = dettaglio.slot
    try {
      await riordina({ binderId, criterio, decrescente }).unwrap()
      onChiudi()
      toast.successo('Binder riordinato', {
        azione: { etichetta: 'Annulla', onClick: () => ripristina({ binderId, slot: prima }).unwrap().catch(errore) },
        durata: 8000,
      })
    } catch (e) {
      errore(e)
    }
  }

  const scegli = (valore: CriterioOrdine) => {
    if (valore === criterio) {
      setDecrescente((d) => !d)
    } else {
      setCriterio(valore)
      setDecrescente(false)
    }
  }
  const Freccia = decrescente ? ArrowDownWideNarrow : ArrowDownNarrowWide

  return (
    <Modale aperto={aperto} onChiudi={onChiudi} titolo="Ordina per…" larghezza="max-w-md">
      <div role="group" aria-label="Criterio" className="grid gap-2">
        {CRITERI.map((c) => {
          const scelto = criterio === c.valore
          return (
            <button
              key={c.valore}
              type="button"
              aria-pressed={scelto}
              onClick={() => scegli(c.valore)}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold ring-1 transition-colors',
                scelto ? 'bg-blu-500/10 text-testo ring-blu-500' : 'text-testo/80 ring-linea/15 hover:ring-linea/30',
              )}
            >
              <span className="flex-1">{c.etichetta}</span>
              {scelto && (
                <span className="flex items-center gap-1.5 font-normal text-testo/80">
                  {c.versi[decrescente ? 1 : 0]}
                  <Freccia aria-hidden className="size-4" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-sm text-testo/80">
        Riordino tutte le {carte === 1 ? 'carte' : `${carte} carte`} del binder. Le tasche vuote in mezzo spariscono.
        Tocca di nuovo il criterio scelto per invertire l'ordine.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variante="fantasma" dimensione="sm" onClick={onChiudi}>
          Annulla
        </Button>
        <Button dimensione="sm" onClick={conferma} caricamento={isLoading}>
          Riordina
        </Button>
      </div>
    </Modale>
  )
}
