import type { Artista, ArtistaCarta, Oggetto } from '../../types/api'

// pagina delle carte per cui TCGdex non indica l'artista: in fondo all'elenco, fuori dalle lettere
export const SLUG_SCONOSCIUTO = 'sconosciuto'

// minuscole e senza accenti: "MÉKAYU" e "mekayu" trovano Mékayu
export function normalizza(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// filtro già normalizzato; trova anche una parte qualunque del nome (es. il cognome)
export function corrisponde(artista: Artista, filtro: string): boolean {
  return normalizza(artista.nome).includes(filtro)
}

// prima lettera A-Z del nome, saltando virgolette e simili; cifre e il resto vanno in "#"
export function letteraDi(nome: string): string {
  const iniziale = normalizza(nome).match(/[a-z0-9]/)?.[0]
  return iniziale && iniziale >= 'a' ? iniziale.toUpperCase() : '#'
}

// gruppi per lettera, "#" per primo; dentro un gruppo resta l'ordine dell'elenco
export function raggruppaPerLettera(artisti: Artista[]): { lettera: string; artisti: Artista[] }[] {
  const gruppi = new Map<string, Artista[]>()
  for (const artista of artisti) {
    const lettera = letteraDi(artista.nome)
    gruppi.set(lettera, [...(gruppi.get(lettera) ?? []), artista])
  }
  return [...gruppi]
    .sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)))
    .map(([lettera, artisti]) => ({ lettera, artisti }))
}

// le immagini delle carte di un illustratore per l'indice: quelle in archivio o, se non ce ne sono ancora, la carta
// del suo avatar
export function immaginiDi(artista: Artista, carteIndice: Record<string, string[]> | undefined): string[] {
  const inArchivio = carteIndice?.[artista.slug]
  if (inArchivio && inArchivio.length > 0) return inArchivio
  return artista.avatar ? [artista.avatar] : []
}

// "1 carta", "1.789 carte"
export function contaCarte(carte: number): string {
  return carte === 1 ? '1 carta' : `${carte.toLocaleString('it-IT')} carte`
}

// gli altri autori di una carta, tolto l'artista della pagina
export function coautori(oggetto: Oggetto, slug: string): ArtistaCarta[] {
  return oggetto.artisti.filter((artista) => artista.slug !== slug)
}

// "A", "A e B", "A, B e C"
export function elencoNomi(nomi: string[]): string {
  return nomi.length <= 1 ? (nomi[0] ?? '') : `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`
}
