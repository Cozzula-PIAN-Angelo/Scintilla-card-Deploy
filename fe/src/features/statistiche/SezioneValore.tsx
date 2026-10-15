import { ImmagineCarta } from '../../components/ImmagineCarta'
import { ModaleCarta } from '../../components/ModaleCarta'
import { useCartaSelezionata } from '../../hooks/useCartaSelezionata'
import type { Statistiche } from '../../types/api'
import { formattaPrezzo } from '../../utils/formato'
import { usePreferiti } from '../preferiti/usePreferiti'
import { Sezione } from './Sezione'

export function SezioneValore({ valore }: { valore: Statistiche['valore'] }) {
  const preferiti = usePreferiti()
  const carte = valore.piuPreziose.map((c) => c.oggetto)
  const { apri, modale } = useCartaSelezionata(preferiti, undefined, carte)

  return (
    <Sezione titolo="Valore stimato">
      <p className="text-3xl font-bold text-testo">≈ {formattaPrezzo(valore.totale)}</p>
      {valore.piuPreziose.length > 0 && (
        <>
          <h3 className="mb-3 mt-6 text-sm font-semibold text-testo/70">Le carte più preziose</h3>
          <ol className="grid gap-2">
            {valore.piuPreziose.map((c) => (
              <li key={c.oggetto.id}>
                <button
                  type="button"
                  onClick={() => apri(c.oggetto)}
                  className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-tenue"
                >
                  <ImmagineCarta src={c.oggetto.immagineUrlPiccola ?? c.oggetto.immagineUrl} alt="" className="w-10 shrink-0 rounded" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-testo">{c.oggetto.nome}</span>
                    <span className="block truncate text-sm text-testo/70">{c.nomeSet}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm text-testo/80">
                    {formattaPrezzo(c.oggetto.prezzo)} × {c.copie}
                    <strong className="block text-base text-testo">{formattaPrezzo(c.valore)}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="mt-4 text-sm text-testo/70">
        Stima con i prezzi Cardmarket del catalogo: le varianti hanno lo stesso prezzo e le carte senza prezzo contano 1 €
      </p>
      <ModaleCarta {...modale} />
    </Sezione>
  )
}
