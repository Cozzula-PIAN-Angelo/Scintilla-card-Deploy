// immagini caricate dall'utente (copertine dei binder, immagine profilo): il backend ne accetta al massimo 1 MB
const DIMENSIONE_MASSIMA = 900 * 1024

export interface Ritaglio {
  // parte dell'immagine originale da prendere
  sx: number
  sy: number
  sw: number
  sh: number
  // dimensioni finali
  w: number
  h: number
}

// lato lungo al massimo `lato`, senza ingrandire; con `quadrato` si prende il quadrato centrale
export function ritaglio(larghezza: number, altezza: number, lato: number, quadrato: boolean): Ritaglio {
  if (quadrato) {
    const l = Math.min(larghezza, altezza)
    const finale = Math.min(l, lato)
    return { sx: (larghezza - l) / 2, sy: (altezza - l) / 2, sw: l, sh: l, w: finale, h: finale }
  }
  const scala = Math.min(1, lato / Math.max(larghezza, altezza))
  return { sx: 0, sy: 0, sw: larghezza, sh: altezza, w: Math.round(larghezza * scala), h: Math.round(altezza * scala) }
}

function comeBlob(canvas: HTMLCanvasElement, tipo: string, qualita: number) {
  return new Promise<Blob | null>((risolvi) => canvas.toBlob(risolvi, tipo, qualita))
}

// ridimensiona e comprime nel browser: al backend arrivano 100-300 KB invece di qualche MB.
// WebP dove il browser sa produrlo, altrimenti JPEG. Senza opzioni: lato lungo 1000 px, come le copertine
export async function comprimiImmagine(file: File, { latoMassimo = 1000, quadrato = false } = {}): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const r = ritaglio(bitmap.width, bitmap.height, latoMassimo, quadrato)
  const canvas = document.createElement('canvas')
  canvas.width = r.w
  canvas.height = r.h
  canvas.getContext('2d')!.drawImage(bitmap, r.sx, r.sy, r.sw, r.sh, 0, 0, r.w, r.h)
  bitmap.close()

  for (const qualita of [0.85, 0.7, 0.55]) {
    let blob = await comeBlob(canvas, 'image/webp', qualita)
    // chi non sa codificare WebP restituisce un PNG
    if (!blob || blob.type !== 'image/webp') blob = await comeBlob(canvas, 'image/jpeg', qualita)
    if (blob && blob.size <= DIMENSIONE_MASSIMA) return blob
  }
  throw new Error("L'immagine è troppo pesante anche dopo la compressione")
}
