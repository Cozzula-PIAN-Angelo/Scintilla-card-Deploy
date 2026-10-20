import { useEffect, useState } from 'react'
import { API_URL } from '../../app/api'
import { useAppSelector } from '../../app/hooks'
import type { Binder } from '../../types/api'
import { selectToken } from '../auth/authSlice'

// L'immagine di copertina richiede il token, quindi non basta un <img src>: si scarica con
// fetch e si mostra come object URL. Un URL per versione, condiviso tra mensola e binder aperto.
// Un object URL tiene in memoria i byte dell'immagine finché non viene revocato: lo si fa quando
// arriva una versione nuova dello stesso binder e quando finisce la sessione (liberaImmaginiBinder)
const cache = new Map<string, Promise<string>>()

function caricaImmagine(id: string, versione: string, token: string) {
  const chiave = `${id}:${versione}`
  let promessa = cache.get(chiave)
  if (!promessa) {
    promessa = fetch(`${API_URL}/me/binder/${id}/immagine?v=${encodeURIComponent(versione)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (risposta) => {
      if (!risposta.ok) throw new Error(`Immagine non disponibile (${risposta.status})`)
      const url = URL.createObjectURL(await risposta.blob())
      // versione nuova pronta: quelle vecchie dello stesso binder non le mostra più nessuno
      for (const vecchia of [...cache.keys()].filter((k) => k.startsWith(`${id}:`) && k !== chiave)) {
        revoca(vecchia)
      }
      return url
    })
    // un errore non resta in cache: al prossimo montaggio si riprova
    promessa.catch(() => cache.delete(chiave))
    cache.set(chiave, promessa)
  }
  return promessa
}

function revoca(chiave: string) {
  const promessa = cache.get(chiave)
  cache.delete(chiave)
  promessa?.then((url) => URL.revokeObjectURL(url)).catch(() => undefined)
}

// fine della sessione (logout, account cancellato, sessione scaduta): le immagini erano dell'utente uscito
export function liberaImmaginiBinder() {
  for (const chiave of [...cache.keys()]) revoca(chiave)
}

export function useImmagineBinder(binder: Pick<Binder, 'id' | 'immagineAggiornataIl'> | null): string | null {
  const token = useAppSelector(selectToken)
  const id = binder?.id
  const versione = binder?.immagineAggiornataIl
  const [url, setUrl] = useState<{ chiave: string; valore: string } | null>(null)

  useEffect(() => {
    if (!id || !versione || !token) return
    let attivo = true
    caricaImmagine(id, versione, token)
      .then((valore) => attivo && setUrl({ chiave: `${id}:${versione}`, valore }))
      .catch(() => undefined)
    return () => {
      attivo = false
    }
  }, [id, versione, token])

  // un URL rimasto da una versione precedente non si mostra
  return id && versione && url?.chiave === `${id}:${versione}` ? url.valore : null
}
