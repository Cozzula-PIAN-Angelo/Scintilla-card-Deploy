import { Check, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import { Modale } from '../../components/Modale'
import type { CartaAnteprima, Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { AvvisoForm } from '../auth/AvvisoForm'
import { useToast } from '../toast/useToast'
import { normalizza } from './artisti'
import { useGetCartaSimboloQuery, useScegliCartaSimboloMutation, useTogliCartaSimboloMutation } from './artistiApi'
import { CLASSI_RITAGLIO } from './MuroIllustrazioni'

// carte mostrate per volta: un illustratore può averne più di mille
const PER_VOLTA = 60

interface Props {
  aperto: boolean
  slug: string
  nome: string
  // tutte le sue carte (la pagina le ha già)
  carte: Oggetto[]
  onChiudi: () => void
}

// solo admin: la carta simbolo dell'illustratore, quella da cui il muro della pagina Illustratori ritaglia il
// disegno. Senza una scelta vale quella automatica (la carta da collezionista che vale di più)
export function ModaleCartaSimbolo({ aperto, slug, nome, carte, onChiudi }: Props) {
  const { data: simbolo, isFetching } = useGetCartaSimboloQuery(slug, { skip: !aperto })
  const [scegli, { isLoading: scegliInCorso }] = useScegliCartaSimboloMutation()
  const [togli, { isLoading: togliInCorso }] = useTogliCartaSimboloMutation()
  const toast = useToast()
  const [selezionata, setSelezionata] = useState<string | null>(null)
  const [ricerca, setRicerca] = useState('')
  const [quante, setQuante] = useState(PER_VOLTA)
  const [errore, setErrore] = useState<string | null>(null)

  // a ogni apertura si riparte dalla scelta salvata
  useEffect(() => {
    if (!aperto) return
    setSelezionata(null)
    setRicerca('')
    setQuante(PER_VOLTA)
    setErrore(null)
  }, [aperto])

  // solo carte di TCGdex con immagine, dalla più preziosa: quelle da muro di solito stanno in cima
  const sceglibili = useMemo(
    () =>
      carte
        .filter((c) => c.idEsterno && c.immagineUrl)
        .sort((a, b) => (b.prezzoMassimo ?? -1) - (a.prezzoMassimo ?? -1)),
    [carte],
  )
  const filtro = normalizza(ricerca.trim())
  const trovate = filtro ? sceglibili.filter((c) => normalizza(c.nome).includes(filtro)) : sceglibili

  const attuale = simbolo?.scelta ?? simbolo?.automatica ?? null
  const inAnteprima: CartaAnteprima | null = useMemo(() => {
    const carta = sceglibili.find((c) => c.id === selezionata)
    return carta ? { id: carta.id, nome: carta.nome, numero: null, rarita: carta.rarita, immagineUrl: carta.immagineUrl, immagineUrlPiccola: carta.immagineUrlPiccola } : attuale
  }, [sceglibili, selezionata, attuale])

  const salva = async () => {
    const carta = sceglibili.find((c) => c.id === selezionata)
    if (!carta?.idEsterno) return
    try {
      await scegli({ slug, idEsterno: carta.idEsterno }).unwrap()
      toast.successo(`${carta.nome} è la carta del muro di ${nome}`)
      onChiudi()
    } catch (e) {
      setErrore(messaggioErrore(e, 'Non è stato possibile salvare la carta.'))
    }
  }

  const tornaAutomatica = async () => {
    try {
      await togli(slug).unwrap()
      toast.successo(`Per ${nome} il muro torna alla scelta automatica`)
      onChiudi()
    } catch (e) {
      setErrore(messaggioErrore(e, 'Non è stato possibile tornare alla scelta automatica.'))
    }
  }

  return (
    <Modale aperto={aperto} onChiudi={onChiudi} titolo={`Carta del muro di ${nome}`} larghezza="max-w-3xl">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* come la vedrà il muro: lo stesso ritaglio del disegno */}
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl bg-blu-900 ring-1 ring-linea/10 sm:w-56">
            {inAnteprima?.immagineUrl ? (
              <img key={inAnteprima.id} src={inAnteprima.immagineUrl} alt="" className={CLASSI_RITAGLIO} />
            ) : (
              <div aria-hidden className={cn('absolute inset-0', isFetching && 'skeleton opacity-20')} />
            )}
          </div>
          <div className="min-w-0 text-sm text-testo/80">
            <p className="font-titolo text-lg font-semibold text-testo">{inAnteprima?.nome ?? (isFetching ? 'Un attimo…' : 'Nessuna carta')}</p>
            <p className="mt-1">
              {selezionata
                ? 'La tua scelta, non ancora salvata.'
                : simbolo?.scelta
                  ? 'Scelta da un admin.'
                  : simbolo?.sceltaSalvata
                    ? 'La carta scelta da un admin non è più in archivio: per ora vale la scelta automatica.'
                    : 'Scelta automatica: la carta da collezionista più preziosa, o la più preziosa se non ce ne sono.'}
            </p>
            {simbolo && (
              <p className="mt-1">
                {simbolo.sulMuro ? 'Questa settimana è sul muro.' : 'Questa settimana non è sul muro: la carta comparirà quando ci torna.'}
              </p>
            )}
          </div>
        </div>

        <label className="relative block">
          <span className="sr-only">Cerca fra le sue carte</span>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-accento" />
          <input
            type="search"
            value={ricerca}
            onChange={(e) => {
              setRicerca(e.target.value)
              setQuante(PER_VOLTA)
            }}
            placeholder={`Cerca fra le ${sceglibili.length} carte…`}
            className="w-full rounded-full bg-superficie py-2.5 pl-12 pr-5 text-testo ring-1 ring-linea/15 outline-none placeholder:text-testo/60 focus:ring-2 focus:ring-blu-500"
          />
        </label>

        <ul className="grid max-h-[45vh] grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-5">
          {trovate.slice(0, quante).map((carta) => {
            const scelta = carta.id === (selezionata ?? attuale?.id)
            return (
              <li key={carta.id}>
                <button
                  type="button"
                  aria-pressed={scelta}
                  aria-label={carta.nome}
                  onClick={() => setSelezionata(carta.id)}
                  className={cn('relative block w-full rounded-[4%/3%] transition-transform hover:-translate-y-1', scelta && 'ring-4 ring-giallo-400')}
                >
                  <ImmagineCarta src={carta.immagineUrlPiccola ?? carta.immagineUrl} alt="" className={cn('aspect-[63/88] w-full shadow-md shadow-ombra/30', FORMA_CARTA)} />
                  {scelta && (
                    <span aria-hidden className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-giallo-400 text-blu-900 shadow">
                      <Check className="size-4" />
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        {trovate.length > quante && (
          <div className="flex justify-center">
            <Button variante="fantasma" dimensione="sm" onClick={() => setQuante((q) => q + PER_VOLTA)}>
              Mostra altre {Math.min(PER_VOLTA, trovate.length - quante)}
            </Button>
          </div>
        )}
        {trovate.length === 0 && <p className="text-center text-sm text-testo/70">Nessuna carta con questo nome.</p>}

        <AvvisoForm messaggio={errore} />
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {simbolo?.sceltaSalvata && (
            <Button variante="fantasma" onClick={() => void tornaAutomatica()} disabled={togliInCorso} className="mr-auto">
              Torna alla scelta automatica
            </Button>
          )}
          <Button variante="fantasma" onClick={onChiudi}>
            Annulla
          </Button>
          <Button onClick={() => void salva()} disabled={!selezionata} caricamento={scegliInCorso}>
            Usa questa carta
          </Button>
        </div>
      </div>
    </Modale>
  )
}
