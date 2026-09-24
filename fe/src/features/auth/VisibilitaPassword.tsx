import { Eye, EyeOff } from 'lucide-react'

interface Props {
  visibile: boolean
  onCambia: () => void
}

export function VisibilitaPassword({ visibile, onCambia }: Props) {
  return (
    <button
      type="button"
      onClick={onCambia}
      aria-label={visibile ? 'Nascondi la password' : 'Mostra la password'}
      aria-pressed={visibile}
      className="grid size-9 place-items-center rounded-full text-testo-2 transition-colors hover:bg-tenue"
    >
      {visibile ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
    </button>
  )
}
