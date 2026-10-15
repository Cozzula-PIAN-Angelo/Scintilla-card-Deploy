import { Album, BookOpen, Heart, LayoutGrid, Palette, ShieldCheck, type LucideIcon } from 'lucide-react'

export interface VoceMenu {
  a: string
  etichetta: string
  icona: LucideIcon
}

// sezioni dell'app: nella navbar da desktop, nella barra in basso da telefono
export const VOCI_PRINCIPALI: VoceMenu[] = [
  { a: '/', etichetta: 'Catalogo', icona: LayoutGrid },
  { a: '/pokedex', etichetta: 'Pokédex', icona: BookOpen },
  { a: '/artisti', etichetta: 'Artisti', icona: Palette },
  { a: '/preferiti', etichetta: 'Preferiti', icona: Heart },
  { a: '/binder', etichetta: 'Binder', icona: Album },
]

// solo per gli admin: nella navbar da desktop, nel pannello account da telefono
export const VOCE_ADMIN: VoceMenu = { a: '/admin', etichetta: 'Admin', icona: ShieldCheck }

// la pagina di un'espansione fa parte del catalogo
export function voceAttiva(voce: VoceMenu, isActive: boolean, pathname: string): boolean {
  return isActive || (voce.a === '/' && pathname.startsWith('/espansioni/'))
}
