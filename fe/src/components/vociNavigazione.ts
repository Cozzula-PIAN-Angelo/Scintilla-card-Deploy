import { Album, BookOpen, ChartPie, Heart, LayoutGrid, Palette, Settings, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'

export interface VoceMenu {
  a: string
  etichetta: string
  icona: LucideIcon
}

// sezioni dell'app: nella navbar da desktop, nella barra in basso da telefono
export const VOCI_PRINCIPALI: VoceMenu[] = [
  { a: '/', etichetta: 'Catalogo', icona: LayoutGrid },
  { a: '/pokedex', etichetta: 'Pokédex', icona: BookOpen },
  { a: '/artisti', etichetta: 'Illustratori', icona: Palette },
  { a: '/preferiti', etichetta: 'Preferiti', icona: Heart },
  { a: '/binder', etichetta: 'Binder', icona: Album },
]

// solo per gli admin: nel pannello account
export const VOCE_ADMIN: VoceMenu = { a: '/admin', etichetta: 'Admin', icona: ShieldCheck }

// statistiche della collezione: nel pannello account
export const VOCE_COLLEZIONE: VoceMenu = { a: '/collezione', etichetta: 'Collezione', icona: ChartPie }

// profilo e impostazioni dell'account: nel pannello account
export const VOCE_PROFILO: VoceMenu = { a: '/profilo', etichetta: 'Profilo', icona: UserRound }
export const VOCE_IMPOSTAZIONI: VoceMenu = { a: '/profilo/impostazioni', etichetta: 'Impostazioni', icona: Settings }

// l'elenco delle espansioni e la pagina di un'espansione fanno parte del catalogo
export function voceAttiva(voce: VoceMenu, isActive: boolean, pathname: string): boolean {
  return isActive || (voce.a === '/' && pathname.startsWith('/espansioni'))
}
