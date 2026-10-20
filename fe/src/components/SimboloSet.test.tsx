import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SimboloSet } from './SimboloSet'

describe('SimboloSet', () => {
  it('mostra il simbolo decorativo', () => {
    const html = renderToStaticMarkup(<SimboloSet src="/immagini/set/base1-simbolo.webp" className="size-4" lazy />)
    expect(html).toContain('src="/immagini/set/base1-simbolo.webp"')
    expect(html).toContain('alt=""')
    expect(html).toContain('loading="lazy"')
  })

  it('senza simbolo non mostra niente', () => {
    expect(renderToStaticMarkup(<SimboloSet src={null} className="size-4" />)).toBe('')
  })

  it('senza simbolo tiene il posto se richiesto', () => {
    expect(renderToStaticMarkup(<SimboloSet src={null} className="size-6" tieniPosto />)).toBe('<span class="size-6"></span>')
  })
})
