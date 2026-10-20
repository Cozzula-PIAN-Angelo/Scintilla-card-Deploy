import { scuro } from '../binder/aspetto'

// oltre questa luminanza il testo bianco non si legge più bene (contrasto sotto 3:1)
const LUMINANZA_MASSIMA = 0.3

// luminanza relativa di un colore #rrggbb (WCAG): 0 nero, 1 bianco
export function luminanza(colore: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(colore.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// inizio della fascia del profilo, dove stanno nome e bio in bianco: un colore chiaro (scelto col selettore
// libero) si scurisce abbastanza da tenere il testo leggibile
export function inizioFascia(colore: string): string {
  return luminanza(colore) > LUMINANZA_MASSIMA ? scuro(colore, 60) : colore
}
