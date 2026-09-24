import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, Pipette, Trash2, X } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { erroriCampi, messaggioErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Campo } from '../../components/Campo'
import { Modale } from '../../components/Modale'
import type { Binder, DatiBinder, MotivoBinder, Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { useToast } from '../toast/useToast'
import {
  classeMotivo,
  COLORI_BINDER,
  ELENCO_MOTIVI,
  FORMATI_TASCHE,
  griglia,
  nomeMotivo,
  PAGINE_MAX,
  PAGINE_MIN,
  proporzionePagina,
  stileMotivo,
} from './aspetto'
import {
  useCancellaBinderMutation,
  useCaricaImmagineBinderMutation,
  useCreaBinderMutation,
  useModificaBinderMutation,
  useRimuoviImmagineBinderMutation,
} from './binderApi'
import { CopertinaBinder } from './CopertinaBinder'
import { ElencoCarte } from './ElencoCarte'
import { comprimiImmagine, useImmagineBinder } from './immagine'

interface Props {
  aperta: boolean
  // null = nuovo binder
  binder: Binder | null
  onChiudi: () => void
  onCreato?: (binder: Binder) => void
  onEliminato?: () => void
}

type StatoImmagine = { tipo: 'esistente' } | { tipo: 'nuova'; blob: Blob; url: string } | { tipo: 'nessuna' }

export function ModaleBinder({ aperta, binder, onChiudi, onCreato, onEliminato }: Props) {
  return (
    <Modale aperto={aperta} onChiudi={onChiudi} titolo={binder ? 'Impostazioni del binder' : 'Nuovo binder'} larghezza="max-w-4xl">
      {/* rimontato a ogni apertura: il modulo riparte dai valori del binder */}
      {aperta && <ModuloBinder binder={binder} onChiudi={onChiudi} onCreato={onCreato} onEliminato={onEliminato} />}
    </Modale>
  )
}

function ModuloBinder({ binder, onChiudi, onCreato, onEliminato }: Omit<Props, 'aperta'>) {
  const toast = useToast()
  const [nome, setNome] = useState(binder?.nome ?? '')
  const [tasche, setTasche] = useState(binder?.tasche ?? 9)
  const [pagine, setPagine] = useState(binder?.pagine ?? 10)
  const [colore, setColore] = useState(binder?.colore ?? COLORI_BINDER[0].valore)
  const [motivo, setMotivo] = useState<MotivoBinder>(binder?.motivo ?? 'STELLE')
  const [carta, setCarta] = useState<Oggetto | null>(binder?.cartaCopertina ?? null)
  const [immagine, setImmagine] = useState<StatoImmagine>(binder?.immagineAggiornataIl ? { tipo: 'esistente' } : { tipo: 'nessuna' })
  const [sceltaCarta, setSceltaCarta] = useState(false)
  const [errori, setErrori] = useState<Record<string, string>>({})
  const [erroreImmagine, setErroreImmagine] = useState<string | null>(null)
  const [conferma, setConferma] = useState(false)
  const [salvataggio, setSalvataggio] = useState(false)

  const [crea] = useCreaBinderMutation()
  const [modifica] = useModificaBinderMutation()
  const [caricaImmagine] = useCaricaImmagineBinderMutation()
  const [rimuoviImmagine] = useRimuoviImmagineBinderMutation()
  const [cancella, { isLoading: inCancellazione }] = useCancellaBinderMutation()

  const immagineSalvata = useImmagineBinder(immagine.tipo === 'esistente' ? binder : null)
  const anteprimaImmagine = immagine.tipo === 'nuova' ? immagine.url : immagine.tipo === 'esistente' ? immagineSalvata : null

  // l'object URL dell'anteprima locale va rilasciato quando cambia o si chiude la modale
  const urlLocale = immagine.tipo === 'nuova' ? immagine.url : null
  useEffect(() => () => void (urlLocale && URL.revokeObjectURL(urlLocale)), [urlLocale])

  const idImmagine = useId()

  async function sceltaFile(file: File | undefined) {
    if (!file) return
    setErroreImmagine(null)
    try {
      const blob = await comprimiImmagine(file)
      setImmagine({ tipo: 'nuova', blob, url: URL.createObjectURL(blob) })
    } catch {
      setErroreImmagine('Non riesco a leggere questa immagine: prova con un JPEG, PNG o WebP.')
    }
  }

  async function salva(evento: FormEvent) {
    evento.preventDefault()
    const nomePulito = nome.trim()
    if (!nomePulito) {
      setErrori({ nome: 'Dai un nome al binder' })
      return
    }
    setErrori({})
    setSalvataggio(true)
    const dati: DatiBinder = { nome: nomePulito, tasche, pagine, colore, motivo, cartaCopertinaId: carta?.id ?? null }
    try {
      const salvato = binder ? await modifica({ id: binder.id, dati }).unwrap() : await crea(dati).unwrap()
      if (immagine.tipo === 'nuova') {
        await caricaImmagine({ id: salvato.id, immagine: immagine.blob }).unwrap()
      } else if (immagine.tipo === 'nessuna' && binder?.immagineAggiornataIl) {
        await rimuoviImmagine(salvato.id).unwrap()
      }
      toast.successo(binder ? 'Binder aggiornato' : `«${salvato.nome}» è pronto da riempire`)
      if (binder) onChiudi()
      else onCreato?.(salvato)
    } catch (errore) {
      const campi = erroriCampi(errore)
      setErrori(campi)
      if (Object.keys(campi).length === 0) toast.errore(messaggioErrore(errore, 'Non è stato possibile salvare il binder'))
    } finally {
      setSalvataggio(false)
    }
  }

  async function elimina() {
    if (!binder) return
    try {
      await cancella(binder.id).unwrap()
      toast.info(`«${binder.nome}» eliminato`)
      onEliminato?.()
    } catch (errore) {
      toast.errore(messaggioErrore(errore, 'Non è stato possibile eliminare il binder'))
    }
  }

  const { colonne, righe } = griglia(tasche)

  return (
    <form onSubmit={salva} noValidate className="grid gap-8 md:grid-cols-[1fr_15rem]">
      <div className="min-w-0 space-y-6">
        <Campo etichetta="Nome" value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} errore={errori.nome} placeholder="Es. I miei Pikachu" />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-testo">Tasche per pagina</legend>
          <div className="grid grid-cols-3 gap-2">
            {FORMATI_TASCHE.map((formato) => {
              const g = griglia(formato.tasche)
              return (
                <label
                  key={formato.tasche}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-3 ring-2 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-giallo-400',
                    tasche === formato.tasche ? 'bg-tenue ring-blu-500' : 'ring-linea/10 hover:bg-tenue/60',
                  )}
                >
                  <input type="radio" name="tasche" className="sr-only" checked={tasche === formato.tasche} onChange={() => setTasche(formato.tasche)} />
                  <span
                    aria-hidden
                    className="grid w-10 gap-0.5"
                    style={{ gridTemplateColumns: `repeat(${g.colonne}, 1fr)` }}
                  >
                    {Array.from({ length: formato.tasche }, (_, i) => (
                      <span key={i} className="aspect-[63/88] rounded-[2px] bg-accento/60" />
                    ))}
                  </span>
                  <span className="text-sm font-semibold text-testo">{formato.etichetta}</span>
                  <span className="text-xs text-testo/60">{formato.dettaglio}</span>
                </label>
              )
            })}
          </div>
          {errori.tasche && <p className="mt-1 text-sm font-medium text-errore">{errori.tasche}</p>}
        </fieldset>

        <div>
          <label htmlFor="pagine-binder" className="mb-2 flex items-baseline justify-between text-sm font-semibold text-testo">
            Pagine
            <span className="text-xs font-medium text-testo/70">
              {pagine} pagine · {pagine * tasche} carte
            </span>
          </label>
          <input
            id="pagine-binder"
            type="range"
            min={PAGINE_MIN}
            max={PAGINE_MAX}
            value={pagine}
            onChange={(e) => setPagine(Number(e.target.value))}
            className="w-full accent-blu-500"
          />
          {errori.pagine && <p className="mt-1 text-sm font-medium text-errore">{errori.pagine}</p>}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-testo">Colore</legend>
          <div className="flex flex-wrap items-center gap-2">
            {COLORI_BINDER.map((c) => (
              <label key={c.valore} title={c.nome} className="relative cursor-pointer">
                <input type="radio" name="colore" className="peer sr-only" checked={colore === c.valore} onChange={() => setColore(c.valore)} />
                <span className="sr-only">{c.nome}</span>
                <span
                  aria-hidden
                  className="block size-9 rounded-full ring-2 ring-linea/10 transition peer-checked:ring-4 peer-checked:ring-giallo-400 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-giallo-400"
                  style={{ backgroundColor: c.valore }}
                />
              </label>
            ))}
            <label
              title="Colore personalizzato"
              className={cn(
                'relative grid size-9 cursor-pointer place-items-center rounded-full ring-2 transition',
                COLORI_BINDER.some((c) => c.valore === colore) ? 'ring-linea/10' : 'ring-4 ring-giallo-400',
              )}
              style={{ background: 'conic-gradient(#e3350d, #ffcb05, #1f8a5b, #2a75bb, #6b3fa0, #e3350d)' }}
            >
              <Pipette aria-hidden className="size-4 text-white drop-shadow" />
              <input
                type="color"
                value={colore}
                onChange={(e) => setColore(e.target.value)}
                aria-label="Colore personalizzato"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-testo">Motivo</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ELENCO_MOTIVI.map((m) => (
              <label key={m} className="cursor-pointer text-center">
                <input type="radio" name="motivo" className="peer sr-only" checked={motivo === m} onChange={() => setMotivo(m)} />
                <span
                  aria-hidden
                  className="relative block aspect-square overflow-hidden rounded-xl ring-2 ring-linea/10 transition peer-checked:ring-4 peer-checked:ring-giallo-400 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-giallo-400"
                  style={{ backgroundColor: colore }}
                >
                  <span className={cn('absolute inset-0', classeMotivo(m))} style={stileMotivo(m)} />
                </span>
                <span className="mt-1 block text-xs font-medium text-testo/80">{nomeMotivo(m)}</span>
              </label>
            ))}
          </div>
          {immagine.tipo !== 'nessuna' && (
            <p className="mt-2 text-xs text-testo/60">Con un'immagine caricata il motivo resta nascosto sotto di essa.</p>
          )}
        </fieldset>

        <section aria-labelledby="titolo-carta-copertina">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 id="titolo-carta-copertina" className="font-sans text-sm font-semibold text-testo">
              Carta in copertina
            </h3>
            <div className="flex gap-2">
              {carta && (
                <Button variante="fantasma" dimensione="sm" onClick={() => setCarta(null)}>
                  <X aria-hidden className="size-4" />
                  Togli
                </Button>
              )}
              <Button variante="chiaro" dimensione="sm" onClick={() => setSceltaCarta((aperta) => !aperta)} aria-expanded={sceltaCarta}>
                {sceltaCarta ? 'Chiudi' : carta ? 'Cambia carta' : 'Scegli una carta'}
              </Button>
            </div>
          </div>
          {carta && !sceltaCarta && <p className="text-sm text-testo/70">{carta.nome}</p>}
          <AnimatePresence initial={false}>
            {sceltaCarta && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="h-96 rounded-2xl bg-tenue/50 p-3">
                  <ElencoCarte
                    colonne="grid-cols-4 sm:grid-cols-5"
                    selezionata={carta?.id}
                    onScegli={(oggetto) => {
                      setCarta(oggetto)
                      setSceltaCarta(false)
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section aria-labelledby="titolo-immagine-copertina">
          <h3 id="titolo-immagine-copertina" className="mb-2 font-sans text-sm font-semibold text-testo">
            Immagine di copertina
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={idImmagine} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-superficie px-3.5 py-2 text-sm font-semibold text-testo-2 shadow-md shadow-ombra/10 ring-1 ring-linea/10 transition-colors hover:bg-tenue has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-giallo-400">
              <ImagePlus aria-hidden className="size-4" />
              {immagine.tipo === 'nessuna' ? 'Carica un\'immagine' : 'Cambia immagine'}
              <input
                id={idImmagine}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  void sceltaFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
            {immagine.tipo !== 'nessuna' && (
              <Button variante="fantasma" dimensione="sm" onClick={() => setImmagine({ tipo: 'nessuna' })}>
                <X aria-hidden className="size-4" />
                Rimuovi immagine
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-testo/60">JPEG, PNG o WebP: la ridimensioniamo noi prima di salvarla.</p>
          {erroreImmagine && (
            <p role="alert" className="mt-1 text-sm font-medium text-errore">
              {erroreImmagine}
            </p>
          )}
        </section>

        {binder && (
          <div className="rounded-2xl p-4 ring-1 ring-rosso-500/30">
            {conferma ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-testo">
                  Eliminare <strong>{binder.nome}</strong>? Le carte restano nel catalogo, ma la loro disposizione va persa.
                </p>
                <div className="flex gap-2">
                  <Button variante="fantasma" dimensione="sm" onClick={() => setConferma(false)}>
                    Annulla
                  </Button>
                  <Button variante="pericolo" dimensione="sm" onClick={elimina} caricamento={inCancellazione}>
                    Elimina
                  </Button>
                </div>
              </div>
            ) : (
              <Button variante="fantasma" dimensione="sm" onClick={() => setConferma(true)} className="text-errore">
                <Trash2 aria-hidden className="size-4" />
                Elimina binder
              </Button>
            )}
          </div>
        )}
      </div>

      <aside className="order-first md:order-none">
        <div className="md:sticky md:top-4">
          <p className="mb-3 text-center text-sm font-semibold text-testo/70">Anteprima</p>
          <div className="mx-auto w-44 md:w-full" style={{ aspectRatio: proporzionePagina(tasche) }}>
            <CopertinaBinder
              nome={nome}
              colore={colore}
              motivo={motivo}
              tasche={tasche}
              cartaCopertina={carta}
              immagineUrl={anteprimaImmagine}
              className="shadow-2xl shadow-ombra/40"
            />
          </div>
          <p className="mt-3 text-center text-xs text-testo/60">
            {colonne} × {righe} tasche · {pagine} pagine
          </p>
          <div className="mt-6 hidden flex-col gap-2 md:flex">
            <Button type="submit" variante="primario" caricamento={salvataggio}>
              {binder ? 'Salva modifiche' : 'Crea binder'}
            </Button>
            <Button variante="fantasma" onClick={onChiudi}>
              Annulla
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex justify-end gap-2 md:hidden">
        <Button variante="fantasma" onClick={onChiudi}>
          Annulla
        </Button>
        <Button type="submit" variante="primario" caricamento={salvataggio}>
          {binder ? 'Salva' : 'Crea binder'}
        </Button>
      </div>
    </form>
  )
}
