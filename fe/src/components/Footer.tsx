import { Scintilla, Stella } from './Forme'

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-blu-900 text-white">
      <Stella className="absolute -left-4 top-6 w-16 fill-blu-700" />
      <Scintilla className="absolute bottom-4 right-10 w-10 fill-blu-700" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <p className="font-titolo text-2xl font-bold">
          Scint<span className="text-giallo-400">illa</span>
        </p>
        <p className="max-w-md text-sm text-white/85">
          Una vetrina di carte da collezione: sfoglia il catalogo e salva le tue preferite.
        </p>
        <p className="text-xs text-white/85">
          Progetto didattico non affiliato con The Pokémon Company o Nintendo · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
