import { describe, expect, it } from 'vitest'
import { COLONNE_GRIGLIA, schedeScheletro } from './Skeleton'

// le righe dello scheletro devono essere piene con ogni numero di colonne della griglia, da telefono a monitor
describe('schedeScheletro', () => {
  it.each([true, false])('stretta=%s: righe piene', (stretta) => {
    const quante = schedeScheletro(stretta)
    for (const colonne of COLONNE_GRIGLIA[stretta ? 'stretta' : 'larga']) {
      expect(quante % colonne).toBe(0)
    }
  })
})
