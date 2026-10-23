import type { FasciaPrezzo, PrezziCarta, Variante } from '../../types/api'
import { formattaPrezzo } from '../../utils/formato'

// la Reverse ha i suoi prezzi (i valori holo di Cardmarket); senza, meglio niente che quelli della normale
export function fasciaDellaVariante(prezzi: PrezziCarta, variante: Variante | null | undefined): FasciaPrezzo | null {
  return variante === 'REVERSE_HOLO' ? prezzi.reverse : prezzi.normale
}

export function testoFascia(fascia: FasciaPrezzo): { fascia: string; dettagli: string } {
  const { minimo, massimo, trend, media30 } = fascia
  return {
    fascia: minimo === massimo ? formattaPrezzo(minimo) : `da ${formattaPrezzo(minimo)} a ${formattaPrezzo(massimo)}`,
    dettagli: [trend != null && `Trend ${formattaPrezzo(trend)}`, media30 != null && `media 30 gg ${formattaPrezzo(media30)}`]
      .filter(Boolean)
      .join(' · '),
  }
}
