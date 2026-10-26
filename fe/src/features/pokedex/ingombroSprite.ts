import { useEffect, useState } from 'react'

// Dove sta davvero il Pokémon nella sua immagine. Gli sprite fermi hanno spazio vuoto non simmetrico e le GIF
// sono larghe quanto tutta l'animazione: una coda o un'ala che si allarga da un lato (la fiamma di Charmeleon)
// sposta il centro dell'immagine, e sulla pedana il corpo sembra fuori centro. Si centra quindi il "peso" del
// disegno (la media dei pixel pieni di tutti i fotogrammi), non il riquadro. In verticale conta il fondo tipico
// (la mediana dei fotogrammi): chi vola o saltella (Lugia, Butterfree) col fotogramma più basso resterebbe sospeso
// quasi sempre. dx e dy sono gli spostamenti, in frazioni della misura dell'immagine, che portano il peso al
// centro e i piedi sul fondo
export interface Ingombro {
  dx: number
  dy: number
}

// fotogrammi letti al massimo da una GIF: bastano a coprire un ciclo dell'animazione
const MAX_FOTOGRAMMI = 60
// sotto questa opacità un pixel non conta (bordi sfumati, ombre a terra)
const SOGLIA_ALFA = 20

const memoria = new Map<string, Promise<Ingombro | null>>()

export function misuraIngombro(url: string): Promise<Ingombro | null> {
  let misura = memoria.get(url)
  if (!misura) {
    misura = calcola(url).catch(() => null)
    memoria.set(url, misura)
  }
  return misura
}

async function calcola(url: string): Promise<Ingombro | null> {
  const blob = await (await fetch(url)).blob()
  const riquadro = { sommaX: 0, pieni: 0, larghezza: 0, altezza: 0 }
  // fondo del disegno in ogni fotogramma
  const fondi: number[] = []
  const leggi = (immagine: CanvasImageSource, larghezza: number, altezza: number) => {
    const tela = new OffscreenCanvas(larghezza, altezza)
    const ctx = tela.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(immagine, 0, 0)
    const dati = ctx.getImageData(0, 0, larghezza, altezza).data
    let fondo = -1
    for (let y = 0; y < altezza; y++)
      for (let x = 0; x < larghezza; x++)
        if (dati[(y * larghezza + x) * 4 + 3] > SOGLIA_ALFA) {
          riquadro.sommaX += x + 0.5
          riquadro.pieni++
          fondo = y
        }
    if (fondo >= 0) fondi.push(fondo)
    riquadro.larghezza = larghezza
    riquadro.altezza = altezza
  }

  // GIF: l'unione di tutti i fotogrammi, dove il browser sa decodificarli uno per uno (ImageDecoder);
  // altrove, e per i PNG, il primo
  if (blob.type === 'image/gif' && 'ImageDecoder' in window) {
    const decoder = new ImageDecoder({ data: blob.stream(), type: blob.type })
    await decoder.tracks.ready
    const fotogrammi = Math.min(decoder.tracks.selectedTrack?.frameCount ?? 1, MAX_FOTOGRAMMI)
    for (let i = 0; i < fotogrammi; i++) {
      const { image } = await decoder.decode({ frameIndex: i })
      leggi(image, image.displayWidth, image.displayHeight)
      image.close()
    }
    decoder.close()
  } else {
    const bitmap = await createImageBitmap(blob)
    leggi(bitmap, bitmap.width, bitmap.height)
    bitmap.close()
  }

  const { sommaX, pieni, larghezza, altezza } = riquadro
  if (pieni === 0) return null
  const sotto = fondi.sort((a, b) => a - b)[fondi.length >> 1]
  return {
    dx: (larghezza / 2 - sommaX / pieni) / larghezza,
    dy: (altezza - (sotto + 1)) / altezza,
  }
}

// l'ingombro dell'immagine all'indirizzo dato: undefined mentre si misura, null se non si può misurare
export function useIngombro(url: string | null): Ingombro | null | undefined {
  const [risultato, setRisultato] = useState<{ url: string; ingombro: Ingombro | null } | null>(null)
  useEffect(() => {
    if (!url) return
    let attivo = true
    misuraIngombro(url).then((ingombro) => attivo && setRisultato({ url, ingombro }))
    return () => {
      attivo = false
    }
  }, [url])
  return risultato?.url === url ? risultato.ingombro : undefined
}
