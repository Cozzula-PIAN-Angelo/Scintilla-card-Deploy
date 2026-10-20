import { Button } from '../../components/Button'
import { AvvisoForm } from '../auth/AvvisoForm'

interface Props {
  errore: string | null
  inSalvataggio: boolean
  onAnnulla: () => void
}

// fondo delle modali del profilo: l'errore del server e i due bottoni (Salva invia il form)
export function PiedeModifica({ errore, inSalvataggio, onAnnulla }: Props) {
  return (
    <div className="space-y-4 pt-2">
      <AvvisoForm messaggio={errore} />
      <div className="flex justify-end gap-3">
        <Button variante="fantasma" onClick={onAnnulla}>
          Annulla
        </Button>
        <Button type="submit" caricamento={inSalvataggio}>
          Salva
        </Button>
      </div>
    </div>
  )
}
