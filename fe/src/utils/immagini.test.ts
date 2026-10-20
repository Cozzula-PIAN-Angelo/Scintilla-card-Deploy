import { describe, expect, it } from 'vitest'
import { ritaglio } from './immagini'

describe('ritaglio', () => {
  it('rimpicciolisce tenendo le proporzioni', () => {
    expect(ritaglio(2000, 1000, 1000, false)).toEqual({ sx: 0, sy: 0, sw: 2000, sh: 1000, w: 1000, h: 500 })
  })

  it('non ingrandisce le immagini piccole', () => {
    expect(ritaglio(500, 300, 1000, false)).toEqual({ sx: 0, sy: 0, sw: 500, sh: 300, w: 500, h: 300 })
  })

  it('ritaglia al centro un quadrato da una foto orizzontale', () => {
    expect(ritaglio(2000, 1000, 400, true)).toEqual({ sx: 500, sy: 0, sw: 1000, sh: 1000, w: 400, h: 400 })
  })

  it('ritaglia al centro un quadrato da una foto verticale piccola', () => {
    expect(ritaglio(300, 600, 400, true)).toEqual({ sx: 0, sy: 150, sw: 300, sh: 300, w: 300, h: 300 })
  })
})
