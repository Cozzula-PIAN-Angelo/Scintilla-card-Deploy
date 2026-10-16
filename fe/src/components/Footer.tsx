import { Scintilla, Stella } from './Forme'
import { MarchioScritta } from './Marchio'

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-notte text-white">
      <Stella className="absolute -left-4 top-6 w-16 fill-notte-2" />
      <Scintilla className="absolute bottom-4 right-10 w-10 fill-notte-2" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <p>
          <MarchioScritta className="h-8" />
          <span className="sr-only">CeloManca</span>
        </p>
        <p className="max-w-md text-sm text-white/85">
          Segna le carte che hai, trova quelle che mancano e riempi il binder.
        </p>
        <p className="text-xs text-white/85">
          Progetto didattico non affiliato con The Pokémon Company o Nintendo · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
