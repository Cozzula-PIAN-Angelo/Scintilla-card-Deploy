import { useState } from 'react'
import { messaggioErrore } from '../../../app/errori'
import { Button } from '../../../components/Button'
import { Modale } from '../../../components/Modale'
import type { BinderDettaglio, CriterioOrdine } from '../../../types/api'
import { cn } from '../../../utils/cn'
import { useToast } from '../../toast/useToast'
import { useRiordinaBinderMutation, useRipristinaBinderMutation } from '../binderApi'

const CRITERI: { valore: CriterioOrdine; etichetta: string }[] = [
  { valore: 'SET_NUMERO', etichetta: 'Set e numero' },
  { valore: 'POKEDEX', etichetta: 'Numero Pokédex' },
  { valore: 'NOME', etichetta: 'Nome' },
  { valore: 'RARITA', etichetta: 'Rarità' },
]

interface Props {
  aperto: boolean
  dettaglio: BinderDettaglio
  onChiudi: () => void
}

// scelta del criterio e conferma; dopo il riordino un toast permette di tornare alla disposizione di prima
export function ModaleOrdina({ aperto, dettaglio, onChiudi }: Props) {
  const toast = useToast()
  const [criterio, setCriterio] = useState<CriterioOrdine>('SET_NUMERO')
  const [riordina, { isLoading }] = useRiordinaBinderMutation()
  const [ripristina] = useRipristinaBinderMutation()
  const binderId = dettaglio.binder.id
  const carte = dettaglio.slot.length

  const conferma = async () => {
    const errore = (e: unknown) => toast.errore(messaggioErrore(e, 'Operazione non riuscita, riprova'))
    const prima = dettaglio.slot
    try {
      await riordina({ binderId, criterio }).unwrap()
      onChiudi()
      toast.successo('Binder riordinato', {
        azione: { etichetta: 'Annulla', onClick: () => ripristina({ binderId, slot: prima }).unwrap().catch(errore) },
        durata: 8000,
      })
    } catch (e) {
      errore(e)
    }
  }

  return (
    <Modale aperto={aperto} onChiudi={onChiudi} titolo="Ordina per…" larghezza="max-w-md">
      <fieldset className="grid gap-2">
        <legend className="sr-only">Criterio</legend>
        {CRITERI.map((c) => (
          <label
            key={c.valore}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition-colors',
              criterio === c.valore ? 'bg-blu-500/10 text-testo ring-blu-500' : 'text-testo/80 ring-linea/15 hover:ring-linea/30',
            )}
          >
            <input
              type="radio"
              name="criterio"
              value={c.valore}
              checked={criterio === c.valore}
              onChange={() => setCriterio(c.valore)}
              className="size-4 accent-blu-500"
            />
            {c.etichetta}
          </label>
        ))}
      </fieldset>
      <p className="mt-4 text-sm text-testo/80">
        Riordino tutte le {carte === 1 ? 'carte' : `${carte} carte`} del binder. Le tasche vuote in mezzo spariscono.
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
