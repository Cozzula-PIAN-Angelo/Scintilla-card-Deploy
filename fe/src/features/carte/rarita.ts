// colore del badge in base alla rarità indicata dall'API (testo libero, in inglese)
export function classiRarita(rarita: string | null): string {
  const r = (rarita ?? '').toLowerCase()
  if (!r) return 'bg-tenue text-testo-2'
  if (/(secret|hyper|rainbow|special illustration|gold)/.test(r)) return 'bg-rosso-700 text-white'
  if (/(ultra|illustration|double|vmax|vstar|ace|shiny|radiant)/.test(r)) return 'bg-blu-900 text-giallo-400 scuro:ring-1 scuro:ring-giallo-400/40'
  if (r.includes('uncommon')) return 'bg-blu-500 text-white'
  if (r.includes('common')) return 'bg-tenue text-testo-2'
  if (/(rare|holo)/.test(r)) return 'bg-giallo-400 text-blu-900'
  return 'bg-blu-700 text-white'
}
