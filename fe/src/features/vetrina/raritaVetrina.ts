import type { RaritaContata } from '../../types/api'

// filtro della ball: arcobaleno solo per la più rara del set, poi per grado (vedi GradoRarita nel backend)
// rosso: la Poké Ball classica, fuori dalle rarità (titolo della pagina Illustratori)
export type TonoBall = 'arcobaleno' | 'oro' | 'argento' | 'blu' | 'rosso'

export interface RaritaMostrata extends RaritaContata {
  sigla: string
  nome: string
  tono: TonoBall
}

// rarità di TCGdex: sigla da collezionista e nome italiano [una, più di una]. Quelle non in elenco prendono le
// iniziali e il nome com'è
const RARITA: Record<string, { sigla: string; nome: [string, string] }> = {
  'mega hyper rare': { sigla: 'MHR', nome: ['mega iper rara', 'mega iper rare'] },
  'hyper rare': { sigla: 'HR', nome: ['iper rara', 'iper rare'] },
  'special illustration rare': { sigla: 'SIR', nome: ['rara illustrazione speciale', 'rare illustrazione speciale'] },
  'illustration rare': { sigla: 'IR', nome: ['rara illustrazione', 'rare illustrazione'] },
  'secret rare': { sigla: 'SR', nome: ['rara segreta', 'rare segrete'] },
  'ultra rare': { sigla: 'UR', nome: ['ultra rara', 'ultra rare'] },
  'shiny rare': { sigla: 'SHR', nome: ['rara cromatica', 'rare cromatiche'] },
  'shiny ultra rare': { sigla: 'SUR', nome: ['ultra rara cromatica', 'ultra rare cromatiche'] },
  'ace spec rare': { sigla: 'ACE', nome: ['rara ACE SPEC', 'rare ACE SPEC'] },
  'rgb rare': { sigla: 'RGB', nome: ['rara RGB', 'rare RGB'] },
  'radiant rare': { sigla: 'RAD', nome: ['rara radiosa', 'rare radiose'] },
}

const TONO_PER_GRADO: Record<number, TonoBall> = { 6: 'oro', 5: 'argento' }

// le rarità arrivano già dalla più rara
export function raritaMostrate(rarita: RaritaContata[]): RaritaMostrata[] {
  return rarita.map((r, i) => {
    const voce = RARITA[r.rarita.toLowerCase()]
    return {
      ...r,
      sigla: voce?.sigla ?? r.rarita.split(/\s+/).map((parola) => parola[0]?.toUpperCase()).join(''),
      nome: voce ? voce.nome[r.quante === 1 ? 0 : 1] : r.rarita,
      tono: i === 0 ? 'arcobaleno' : (TONO_PER_GRADO[r.grado] ?? 'blu'),
    }
  })
}

// "152" con 128 carte ufficiali fa "152/128"; gli zeri davanti (001) si tolgono, le lettere (R, TG01) restano
export function numeroNelSet(numero: string | null, ufficiali: number | null): string | null {
  if (!numero) return null
  const pulito = numero.replace(/^0+(?=\d)/, '')
  return ufficiali ? `${pulito}/${ufficiali}` : pulito
}

// carte oltre il totale ufficiale; null se non si sa
export function carteSegrete(totale: number | null, ufficiali: number | null): number | null {
  if (totale == null || ufficiali == null) return null
  return Math.max(0, totale - ufficiali)
}
