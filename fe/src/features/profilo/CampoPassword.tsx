import { Lock } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { Campo } from '../../components/Campo'
import { VisibilitaPassword } from '../auth/VisibilitaPassword'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  etichetta: string
  errore?: string
  aiuto?: string
}

// campo password con il bottone per mostrarla, come nei form di login e registrazione
export function CampoPassword(props: Props) {
  const [visibile, setVisibile] = useState(false)
  return (
    <Campo
      {...props}
      type={visibile ? 'text' : 'password'}
      icona={<Lock className="size-5" />}
      suffisso={<VisibilitaPassword visibile={visibile} onCambia={() => setVisibile((v) => !v)} />}
    />
  )
}
