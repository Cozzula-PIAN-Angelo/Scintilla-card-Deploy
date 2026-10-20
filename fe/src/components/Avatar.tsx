import { useState } from 'react'
import { avatarUrl } from '../features/profilo/profiloApi'
import type { Profilo, Utente } from '../types/api'
import { cn } from '../utils/cn'

interface Props {
  utente: Pick<Utente | Profilo, 'id' | 'username' | 'avatarAggiornatoIl'>
  className?: string
}

// immagine profilo rotonda; senza immagine (o se non si carica) il pallino con l'iniziale del nome
export function Avatar({ utente, className }: Props) {
  const url = utente.avatarAggiornatoIl ? avatarUrl(utente.id, utente.avatarAggiornatoIl) : null
  // un errore riguarda solo quell'URL: con una versione nuova si riprova
  const [urlInErrore, setUrlInErrore] = useState<string | null>(null)

  if (url && url !== urlInErrore) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setUrlInErrore(url)}
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-giallo-400', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full bg-giallo-400 font-titolo font-bold uppercase text-blu-900', className)}
    >
      {utente.username.charAt(0)}
    </span>
  )
}
