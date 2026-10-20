import { MarchioScritta } from './Marchio'

export function Footer() {
  return (
    <footer className="bg-notte text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
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
