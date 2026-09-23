import { ArrowUpDown } from 'lucide-react'
import { useId } from 'react'
import type { OpzioneOrdinamento } from '../features/oggetti/ordinamenti'

interface Props {
  valore: string
  opzioni: OpzioneOrdinamento[]
  onCambia: (valore: string) => void
}

export function SelectOrdinamento({ valore, opzioni, onCambia }: Props) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-blu-900">
        Ordina per
      </label>
      <div className="relative">
        <ArrowUpDown aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blu-700" />
        <select
          id={id}
          value={valore}
          onChange={(evento) => onCambia(evento.target.value)}
          className="appearance-none rounded-full border-2 border-blu-500/80 bg-white py-2 pl-9 pr-5 text-sm font-semibold text-blu-900 shadow-sm outline-none transition focus:ring-4 focus:ring-blu-500/25"
        >
          {opzioni.map((opzione) => (
            <option key={opzione.valore} value={opzione.valore}>
              {opzione.etichetta}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
