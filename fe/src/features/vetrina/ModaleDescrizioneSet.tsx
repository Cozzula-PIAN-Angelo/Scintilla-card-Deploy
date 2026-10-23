import { useEffect, useState, type FormEvent } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Modale } from '../../components/Modale'
import type { Espansione } from '../../types/api'
import { cn } from '../../utils/cn'
import { AvvisoForm } from '../auth/AvvisoForm'
import { useModificaEspansioneMutation } from '../espansioni/espansioniApi'
import { useToast } from '../toast/useToast'

// come il limite del backend (ModificaEspansioneDTO)
const MASSIMO = 600

interface Props {
  aperto: boolean
  espansione: Espansione
  onChiudi: () => void
}

// solo admin: la descrizione del set che la hero mostra sopra le rarità. Vuota la toglie
export function ModaleDescrizioneSet({ aperto, espansione, onChiudi }: Props) {
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [modifica, { isLoading }] = useModificaEspansioneMutation()
  const toast = useToast()

  // a ogni apertura si riparte dalla descrizione salvata
  useEffect(() => {
    if (!aperto) return
    setTesto(espansione.descrizione ?? '')
    setErrore(null)
  }, [aperto, espansione.descrizione])

  const salva = async (descrizione: string | null) => {
    try {
      await modifica({ id: espansione.id, descrizione }).unwrap()
      toast.successo(descrizione ? `Descrizione di ${espansione.nome} salvata` : `Descrizione di ${espansione.nome} tolta`)
      onChiudi()
    } catch (e) {
      setErrore(messaggioErrore(e, 'Non è stato possibile salvare la descrizione.'))
    }
  }

  const invia = (evento: FormEvent) => {
    evento.preventDefault()
    void salva(testo.trim() || null)
  }

  return (
    <Modale aperto={aperto} onChiudi={onChiudi} titolo={`Descrizione di ${espansione.nome}`}>
      <form onSubmit={invia} noValidate className="space-y-5">
        <div>
          <label htmlFor="descrizione-set" className="mb-2 flex justify-between text-sm font-semibold text-testo">
            Testo nella hero della home
            <span className={cn('font-normal', testo.length > MASSIMO ? 'text-errore' : 'text-testo/60')}>
              {testo.length}/{MASSIMO}
            </span>
          </label>
          <textarea
            id="descrizione-set"
            value={testo}
            maxLength={MASSIMO}
            rows={5}
            autoFocus
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Il set dei trent'anni: tre Mew RGB da cercare e una Pikachu Rare in ogni busta…"
            className="w-full resize-none rounded-2xl bg-superficie px-4 py-3 text-testo ring-1 ring-linea/15 placeholder:text-testo/60 focus:outline-none focus:ring-2 focus:ring-blu-500"
          />
          <p className="mt-1.5 text-xs text-testo/70">Compare sopra le rarità, solo finché il set è il più nuovo. Lasciala vuota per non mostrare niente.</p>
        </div>
        <AvvisoForm messaggio={errore} />
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {espansione.descrizione && (
            <Button variante="fantasma" onClick={() => void salva(null)} disabled={isLoading} className="mr-auto">
              Togli la descrizione
            </Button>
          )}
          <Button variante="fantasma" onClick={onChiudi}>
            Annulla
          </Button>
          <Button type="submit" variante="primario" caricamento={isLoading}>
            Salva
          </Button>
        </div>
      </form>
    </Modale>
  )
}
