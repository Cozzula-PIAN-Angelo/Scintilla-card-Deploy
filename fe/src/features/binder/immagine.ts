import { useEffect, useState } from 'react'
import { API_URL } from '../../app/api'
import { useAppSelector } from '../../app/hooks'
import type { Binder } from '../../types/api'
import { selectToken } from '../auth/authSlice'

// lato lungo massimo dell'immagine salvata: basta per una copertina anche su schermi densi
const LATO_MASSIMO = 1000
const DIMENSIONE_MASSIMA = 900 * 1024

function comeBlob(canvas: HTMLCanvasElement, tipo: string, qualita: number) {
  return new Promise<Blob | null>((risolvi) => canvas.toBlob(risolvi, tipo, qualita))
}

// ridimensiona e comprime nel browser: al backend arrivano 100-300 KB invece di qualche MB.
// WebP dove il browser sa produrlo, altrimenti JPEG
export async function comprimiImmagine(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scala = Math.min(1, LATO_MASSIMO / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scala)
  canvas.height = Math.round(bitmap.height * scala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  for (const qualita of [0.85, 0.7, 0.55]) {
    let blob = await comeBlob(canvas, 'image/webp', qualita)
    // chi non sa codificare WebP restituisce un PNG
    if (!blob || blob.type !== 'image/webp') blob = await comeBlob(canvas, 'image/jpeg', qualita)
    if (blob && blob.size <= DIMENSIONE_MASSIMA) return blob
  }
  throw new Error("L'immagine è troppo pesante anche dopo la compressione")
}

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
