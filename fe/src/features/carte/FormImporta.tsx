import { motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { erroriCampi, messaggioErrore, statoErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Campo } from '../../components/Campo'
import type { CartaEsterna } from '../../types/api'
import { leggiPrezzo, prezzoPerCampo, validaPrezzo } from '../../utils/prezzo'
import { useToast } from '../toast/useToast'
import { useImportaCartaMutation } from './carteApi'

interface Props {
  carta: CartaEsterna
  onChiudi: () => void
}

// piccolo pannello che sale dal fondo della card: prezzo precompilato, obbligatorio se manca quello suggerito
export function FormImporta({ carta, onChiudi }: Props) {
  const prezzoObbligatorio = carta.prezzoSuggerito == null
  const [prezzo, setPrezzo] = useState(prezzoPerCampo(carta.prezzoSuggerito))
  const [errore, setErrore] = useState<string | null>(null)
  const [importa, { isLoading }] = useImportaCartaMutation()
  const toast = useToast()

  const invia = async (evento: FormEvent) => {
    evento.preventDefault()
    const erroreClient = validaPrezzo(prezzo, prezzoObbligatorio)
    setErrore(erroreClient)
    if (erroreClient) return

    try {
      await importa({ idEsterno: carta.idEsterno, prezzo: prezzo.trim() ? leggiPrezzo(prezzo) : undefined }).unwrap()
      toast.successo(`«${carta.nome}» è ora nel catalogo`)
      onChiudi()
    } catch (e) {
      const stato = statoErrore(e)
      if (stato === 409) {
        toast.info(messaggioErrore(e))
        onChiudi()
      } else if (stato === 502) {
        toast.errore('Il servizio delle carte non risponde: riprova tra qualche istante.')
        setErrore(messaggioErrore(e))
      } else {
        setErrore(erroriCampi(e).prezzo ?? messaggioErrore(e))
      }
    }
  }

  return (
    <motion.form
      onSubmit={invia}
      noValidate
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } }}
      exit={{ y: '100%', opacity: 0, transition: { duration: 0.2 } }}
      className="absolute inset-x-0 bottom-0 z-10 space-y-3 rounded-3xl bg-white p-4 shadow-2xl shadow-blu-900/30 ring-1 ring-blu-900/10"
    >
      <div className="flex items-center justify-between">
        <p className="font-titolo text-lg font-semibold text-blu-900">Importa nel catalogo</p>
        <button
          type="button"
          onClick={onChiudi}
          aria-label="Annulla l'importazione"
          className="grid size-8 place-items-center rounded-full text-blu-700 hover:bg-blu-50"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <Campo
        etichetta="Prezzo (€)"
        inputMode="decimal"
        placeholder="es. 12,50"
        autoFocus
        value={prezzo}
        onChange={(e) => {
          setPrezzo(e.target.value)
          setErrore(null)
        }}
        errore={errore ?? undefined}
        aiuto={prezzoObbligatorio ? 'Prezzo suggerito non disponibile: indicalo tu' : 'Precompilato con il prezzo suggerito'}
      />
      <Button type="submit" variante="primario" caricamento={isLoading} className="w-full">
        {!isLoading && <Download aria-hidden className="size-4" />}
        Importa
      </Button>
    </motion.form>
  )
}
