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

// "Blastoise · bw7-31 · Rare": distingue le ristampe con lo stesso nome
const descrizione = (carta: Oggetto) => [carta.nome, carta.idEsterno, carta.rarita].filter(Boolean).join(' · ')

// solo admin: la carta simbolo dell'illustratore, quella da cui il muro della pagina Illustratori ritaglia il
// disegno. Senza una scelta vale quella automatica (vedi VetrinaArtistiService.illustrazioni nel backend)
export function ModaleCartaSimbolo({ aperto, slug, nome, carte, onChiudi }: Props) {
  const { data: simbolo, isFetching, isError } = useGetCartaSimboloQuery(slug, { skip: !aperto })
  const [scegli, { isLoading: scegliInCorso }] = useScegliCartaSimboloMutation()
  const [togli, { isLoading: togliInCorso }] = useTogliCartaSimboloMutation()
  const occupato = scegliInCorso || togliInCorso
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
  // toccare la carta già scelta da un admin non è un cambio
  const cambio = selezionata !== null && selezionata !== simbolo?.scelta?.id ? selezionata : null
  const inAnteprima: CartaAnteprima | null = useMemo(() => {
    const carta = sceglibili.find((c) => c.id === cambio)
    return carta
      ? { id: carta.id, nome: carta.nome, numero: null, rarita: carta.rarita, immagineUrl: carta.immagineUrl, immagineUrlPiccola: carta.immagineUrlPiccola }
      : attuale
  }, [sceglibili, cambio, attuale])

  const salva = async () => {
    const carta = sceglibili.find((c) => c.id === cambio)
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

  // stato in una parola, poi una riga di spiegazione
  const [stato, dettaglio] = cambio
    ? ['Non ancora salvata', 'Salvala con "Usa questa carta".']
    : simbolo?.scelta
      ? ['Scelta da un admin', 'Tocca un\'altra carta per cambiarla.']
      : simbolo?.sceltaSalvata
        ? ['Scelta automatica', 'La carta scelta da un admin non è in archivio o non ha l\'immagine. Tocca una carta per cambiarla.']
        : ['Scelta automatica', 'Prima illustrazioni rare o carte da 20 € in su. Tocca una carta per cambiarla.']

  return (
    <Modale aperto={aperto} onChiudi={onChiudi} titolo={`Carta del muro di ${nome}`} larghezza="max-w-3xl">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {/* come la vedrà il muro: lo stesso ritaglio del disegno. Da telefono più piccolo, accanto al testo */}
          <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-2xl bg-blu-900 ring-1 ring-linea/10 sm:w-56">
            {inAnteprima ? <Anteprima key={inAnteprima.id} carta={inAnteprima} /> : <div aria-hidden className={cn('absolute inset-0', isFetching && 'skeleton opacity-20')} />}
          </div>
          <div className="min-w-0 text-sm">
            {isError ? (
              <AvvisoForm messaggio="Non è stato possibile leggere la carta salvata: chiudi e riapri per riprovare." />
            ) : (
              <>
                <p className="font-titolo text-base font-semibold text-testo sm:text-lg">{inAnteprima?.nome ?? (isFetching ? 'Un attimo…' : 'Nessuna carta')}</p>
                <p className="mt-1 font-semibold text-testo">{stato}</p>
                <p className="mt-0.5 text-xs text-testo/70">{dettaglio}</p>
                {simbolo && (
                  <p className="mt-1 text-xs text-testo/70">{simbolo.sulMuro ? 'Questa settimana è sul muro.' : 'Questa settimana non è sul muro.'}</p>
                )}
              </>
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

        {/* p-2.5: l'anello della scelta e la spunta non vengono tagliati dallo scorrimento */}
        <ul className="grid max-h-[32vh] grid-cols-3 gap-3 overflow-y-auto p-2.5 sm:max-h-[45vh] sm:grid-cols-5">
          {trovate.slice(0, quante).map((carta) => {
            const scelta = carta.id === (cambio ?? attuale?.id)
            return (
              <li key={carta.id}>
                <button
                  type="button"
                  aria-pressed={scelta}
                  aria-label={descrizione(carta)}
                  title={descrizione(carta)}
                  onClick={() => setSelezionata(carta.id)}
                  className={cn(
                    'relative block w-full rounded-[4%/3%] transition-transform hover:-translate-y-1',
                    // staccato dalla carta: tante hanno il bordo stampato giallo
                    scelta && 'ring-4 ring-giallo-400 ring-offset-2 ring-offset-superficie',
                  )}
                >
                  <ImmagineCarta src={carta.immagineUrlPiccola ?? carta.immagineUrl} alt="" className={cn('aspect-[63/88] w-full shadow-md shadow-ombra/30', FORMA_CARTA)} />
                  {scelta && (
                    <span aria-hidden className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-giallo-400 text-blu-900 shadow">
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
            <Button variante="fantasma" onClick={() => void tornaAutomatica()} disabled={occupato} caricamento={togliInCorso} className="mr-auto">
              Torna alla scelta automatica
            </Button>
          )}
          <Button variante="fantasma" onClick={onChiudi} disabled={occupato}>
            Annulla
          </Button>
          <Button onClick={() => void salva()} disabled={!cambio || occupato} caricamento={scegliInCorso}>
            Usa questa carta
          </Button>
        </div>
      </div>
    </Modale>
  )
}

// l'anteprima del ritaglio, con la stessa dissolvenza delle tessere del muro mentre l'immagine arriva
function Anteprima({ carta }: { carta: CartaAnteprima }) {
  const [caricata, setCaricata] = useState(false)
  return (
    <>
      {!caricata && <div aria-hidden className="skeleton absolute inset-0 opacity-20" />}
      <img
        src={carta.immagineUrl ?? carta.immagineUrlPiccola ?? ''}
        alt=""
        onLoad={() => setCaricata(true)}
        // immagine che non arriva: niente scheletro per sempre, resta il fondo blu
        onError={() => setCaricata(true)}
        className={cn(CLASSI_RITAGLIO, 'transition-opacity duration-700 ease-out', caricata ? 'opacity-100' : 'opacity-0')}
      />
    </>
  )
}
