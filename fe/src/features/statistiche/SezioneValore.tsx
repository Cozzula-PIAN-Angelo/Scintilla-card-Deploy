import { ImmagineCarta } from '../../components/ImmagineCarta'
import { ModaleCarta } from '../../components/ModaleCarta'
import { useCartaSelezionata } from '../../hooks/useCartaSelezionata'
import type { CartaPreziosa, Statistiche } from '../../types/api'
import { formattaPrezzo } from '../../utils/formato'
import { usePreferiti } from '../preferiti/usePreferiti'
import { Sezione } from './Sezione'

// valore stimato con la vetrina: le prime tre carte come carte vere, dalla quarta in elenco
export function SezioneValore({ valore }: { valore: Statistiche['valore'] }) {
  const preferiti = usePreferiti()
  const carte = valore.piuPreziose.map((c) => c.oggetto)
  const { apri, modale } = useCartaSelezionata(preferiti, undefined, carte)
  const vetrina = valore.piuPreziose.slice(0, 3)
  const altre = valore.piuPreziose.slice(3)

  return (
    <Sezione titolo="Valore stimato">
      <p className="font-titolo text-4xl font-bold tabular-nums text-testo">≈ {formattaPrezzo(valore.totale)}</p>
      {vetrina.length > 0 && (
        <>
          <h3 className="mb-3 mt-6 text-sm font-semibold text-testo/70">Le carte più preziose</h3>
          <ol className="grid grid-cols-3 gap-3">
            {vetrina.map((c, i) => (
              <li key={c.oggetto.id}>
                <button type="button" onClick={() => apri(c.oggetto)} className="group block w-full text-left">
                  <span className="relative block">
                    <ImmagineCarta
                      src={c.oggetto.immagineUrlPiccola ?? c.oggetto.immagineUrl}
                      alt={c.oggetto.nome}
                      className="aspect-[63/88] rounded-[4.5%] shadow-md shadow-ombra/25 transition-transform duration-300 ease-out group-hover:-translate-y-1"
                    />
                    <span className="absolute -left-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-giallo-400 text-xs font-bold text-blu-900 shadow">
                      {i + 1}
                    </span>
                  </span>
                  <span className="mt-2 block truncate text-xs text-testo/70">{c.oggetto.nome}</span>
                  <span className="block text-sm font-bold tabular-nums text-testo">{formattaPrezzo(c.valore)}</span>
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
      {altre.length > 0 && (
        <ol start={4} className="mt-4 grid gap-1 border-t border-linea/10 pt-3">
          {altre.map((c, i) => (
            <RigaPreziosa key={c.oggetto.id} carta={c} posizione={i + 4} onApri={() => apri(c.oggetto)} />
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs leading-relaxed text-testo/70">
        Stima con i prezzi Cardmarket del catalogo: le varianti hanno lo stesso prezzo e le carte senza prezzo contano 1 €
      </p>
      <ModaleCarta {...modale} />
    </Sezione>
  )
}

function RigaPreziosa({ carta, posizione, onApri }: { carta: CartaPreziosa; posizione: number; onApri: () => void }) {
  return (
    <li>
      <button type="button" onClick={onApri} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-tenue">
        <span className="w-4 shrink-0 text-right text-xs font-semibold tabular-nums text-testo/60">{posizione}</span>
        <ImmagineCarta src={carta.oggetto.immagineUrlPiccola ?? carta.oggetto.immagineUrl} alt="" className="aspect-[63/88] w-8 shrink-0 rounded-sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-testo">{carta.oggetto.nome}</span>
          <span className="block truncate text-xs text-testo/70">
            {carta.nomeSet ?? 'Senza set'} · {formattaPrezzo(carta.oggetto.prezzo)} × {carta.copie}
          </span>
        </span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-testo">{formattaPrezzo(carta.valore)}</span>
      </button>
    </li>
  )
}
