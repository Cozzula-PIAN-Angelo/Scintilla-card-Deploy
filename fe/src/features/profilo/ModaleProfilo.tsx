import { ImageUp, Pipette, Trash2 } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Avatar } from '../../components/Avatar'
import { Modale } from '../../components/Modale'
import type { Profilo } from '../../types/api'
import { cn } from '../../utils/cn'
import { comprimiImmagine } from '../../utils/immagini'
import { COLORI_BINDER } from '../binder/aspetto'
import { useToast } from '../toast/useToast'
import { PiedeModifica } from './PiedeModifica'
import { useCaricaAvatarMutation, useModificaProfiloMutation, useRimuoviAvatarMutation } from './profiloApi'

const MASSIMO_BIO = 160

// esistente: quella già salvata (o nessuna); nuova: scelta ora, da caricare al salvataggio; rimossa: da togliere
type StatoAvatar = { tipo: 'esistente' } | { tipo: 'nuova'; blob: Blob; url: string } | { tipo: 'rimossa' }

interface Props {
  aperta: boolean
  onChiudi: () => void
  profilo: Profilo
}

export function ModaleProfilo({ aperta, onChiudi, profilo }: Props) {
  return (
    <Modale aperto={aperta} onChiudi={onChiudi} titolo="Modifica profilo">
      <ModuloProfilo profilo={profilo} onChiudi={onChiudi} />
    </Modale>
  )
}

// montato a ogni apertura: riparte dai valori salvati
function ModuloProfilo({ profilo, onChiudi }: Omit<Props, 'aperta'>) {
  const [bio, setBio] = useState(profilo.bio ?? '')
  const [colore, setColore] = useState<string | null>(profilo.colore)
  const [avatar, setAvatar] = useState<StatoAvatar>({ tipo: 'esistente' })
  const [erroreImmagine, setErroreImmagine] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [inSalvataggio, setInSalvataggio] = useState(false)
  const [modifica] = useModificaProfiloMutation()
  const [caricaAvatar] = useCaricaAvatarMutation()
  const [rimuoviAvatar] = useRimuoviAvatarMutation()
  const toast = useToast()
  const idFile = useId()

  // l'object URL dell'anteprima va rilasciato quando cambia o si chiude la modale
  const urlLocale = avatar.tipo === 'nuova' ? avatar.url : null
  useEffect(() => () => void (urlLocale && URL.revokeObjectURL(urlLocale)), [urlLocale])

  const haImmagine = avatar.tipo === 'nuova' || (avatar.tipo === 'esistente' && profilo.avatarAggiornatoIl != null)

  async function sceltaFile(file: File | undefined) {
    if (!file) return
    setErroreImmagine(null)
    try {
      const blob = await comprimiImmagine(file, { latoMassimo: 400, quadrato: true })
      setAvatar({ tipo: 'nuova', blob, url: URL.createObjectURL(blob) })
    } catch {
      setErroreImmagine('Non riesco a leggere questa immagine: prova con un JPEG, PNG o WebP.')
    }
  }

  async function salva(evento: FormEvent) {
    evento.preventDefault()
    setErrore(null)
    setInSalvataggio(true)
    try {
      if (avatar.tipo === 'nuova') await caricaAvatar(avatar.blob).unwrap()
      if (avatar.tipo === 'rimossa' && profilo.avatarAggiornatoIl) await rimuoviAvatar().unwrap()
      const bioPulita = bio.trim()
      await modifica({ bio: bioPulita || null, colore }).unwrap()
      toast.successo('Profilo aggiornato')
      onChiudi()
    } catch (e) {
      setErrore(messaggioErrore(e, 'Non è stato possibile salvare il profilo'))
    } finally {
      setInSalvataggio(false)
    }
  }

  return (
    <form onSubmit={salva} noValidate className="space-y-6">
      <section aria-labelledby="titolo-avatar">
        <h3 id="titolo-avatar" className="mb-2 text-sm font-semibold text-testo">
          Immagine profilo
        </h3>
        <div className="flex items-center gap-4">
          {avatar.tipo === 'nuova' ? (
            <img src={avatar.url} alt="Anteprima della nuova immagine profilo" className="size-20 rounded-full object-cover ring-2 ring-giallo-400" />
          ) : (
            <Avatar
              utente={{ ...profilo, avatarAggiornatoIl: avatar.tipo === 'rimossa' ? null : profilo.avatarAggiornatoIl }}
              className="size-20 text-3xl"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={idFile}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-superficie px-3.5 py-2 text-sm font-semibold text-testo-2 shadow-md shadow-ombra/10 ring-1 ring-linea/10 transition-colors hover:bg-tenue has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-giallo-400"
            >
              <ImageUp aria-hidden className="size-4" />
              {haImmagine ? 'Cambia immagine' : "Carica un'immagine"}
              <input
                id={idFile}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  void sceltaFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
            {haImmagine && (
              <button
                type="button"
                onClick={() => setAvatar({ tipo: 'rimossa' })}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-testo-2 transition-colors hover:bg-tenue"
              >
                <Trash2 aria-hidden className="size-4" />
                Rimuovi
              </button>
            )}
          </div>
        </div>
        {erroreImmagine && <p className="mt-2 text-sm font-medium text-errore">{erroreImmagine}</p>}
      </section>

      <div>
        <label htmlFor="bio-profilo" className="mb-2 flex justify-between text-sm font-semibold text-testo">
          Bio
          <span className={cn('font-normal', bio.length > MASSIMO_BIO ? 'text-errore' : 'text-testo/60')}>
            {bio.length}/{MASSIMO_BIO}
          </span>
        </label>
        <textarea
          id="bio-profilo"
          value={bio}
          maxLength={MASSIMO_BIO}
          rows={3}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Colleziono dal 1999, cerco ancora il Charizard di Base Set…"
          className="w-full resize-none rounded-2xl bg-superficie px-4 py-3 text-testo ring-1 ring-linea/15 placeholder:text-testo/40 focus:outline-none focus:ring-2 focus:ring-blu-500"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-testo">Colore del profilo</legend>
        <div className="flex flex-wrap items-center gap-2">
          <label title="Nessun colore (quello del sito)" className="relative cursor-pointer">
            <input type="radio" name="colore" className="peer sr-only" checked={colore === null} onChange={() => setColore(null)} />
            <span className="sr-only">Nessun colore</span>
            <span
              aria-hidden
              className="block size-9 rounded-full bg-[linear-gradient(135deg,#1b4f8a,#0b1f4b)] ring-2 ring-linea/10 transition peer-checked:ring-4 peer-checked:ring-giallo-400 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-giallo-400"
            />
          </label>
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
              colore === null || COLORI_BINDER.some((c) => c.valore === colore) ? 'ring-linea/10' : 'ring-4 ring-giallo-400',
            )}
            style={{ background: 'conic-gradient(#e3350d, #ffcb05, #1f8a5b, #2a75bb, #6b3fa0, #e3350d)' }}
          >
            <Pipette aria-hidden className="size-4 text-white drop-shadow" />
            <input
              type="color"
              value={colore ?? '#2a75bb'}
              onChange={(e) => setColore(e.target.value)}
              aria-label="Colore personalizzato"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </fieldset>

      <PiedeModifica errore={errore} inSalvataggio={inSalvataggio} onAnnulla={onChiudi} />
    </form>
  )
}
