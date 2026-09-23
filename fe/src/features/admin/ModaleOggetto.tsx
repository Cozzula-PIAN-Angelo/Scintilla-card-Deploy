import { Euro, Tag } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { erroriCampi, messaggioErrore, statoErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Campo } from '../../components/Campo'
import { Modale } from '../../components/Modale'
import type { DatiOggetto, Oggetto } from '../../types/api'
import { leggiPrezzo, prezzoPerCampo, validaPrezzo } from '../../utils/prezzo'
import { AvvisoForm } from '../auth/AvvisoForm'
import { useCreaOggettoMutation, useModificaOggettoMutation } from '../oggetti/oggettiApi'
import { useToast } from '../toast/useToast'

interface Props {
  aperto: boolean
  // null: creazione di un nuovo oggetto
  oggetto: Oggetto | null
  onChiudi: () => void
}

type Errori = Partial<Record<'nome' | 'prezzo', string>>

export function ModaleOggetto({ aperto, oggetto, onChiudi }: Props) {
  const [nome, setNome] = useState('')
  const [prezzo, setPrezzo] = useState('')
  const [errori, setErrori] = useState<Errori>({})
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null)
  const [crea, { isLoading: inCreazione }] = useCreaOggettoMutation()
  const [modifica, { isLoading: inModifica }] = useModificaOggettoMutation()
  const toast = useToast()

  // a ogni apertura il form riparte dai valori dell'oggetto (o vuoto)
  useEffect(() => {
    if (!aperto) return
    setNome(oggetto?.nome ?? '')
    setPrezzo(prezzoPerCampo(oggetto?.prezzo))
    setErrori({})
    setErroreGenerale(null)
  }, [aperto, oggetto])

  const invia = async (evento: FormEvent) => {
    evento.preventDefault()
    const erroriClient: Errori = {}
    if (!nome.trim()) erroriClient.nome = 'Il nome è obbligatorio'
    const errorePrezzo = validaPrezzo(prezzo, true)
    if (errorePrezzo) erroriClient.prezzo = errorePrezzo
    setErrori(erroriClient)
    if (Object.keys(erroriClient).length > 0) return

    try {
      if (oggetto) {
        // PATCH: solo i campi cambiati
        const dati: Partial<DatiOggetto> = {}
        if (nome.trim() !== oggetto.nome) dati.nome = nome.trim()
        if (leggiPrezzo(prezzo) !== oggetto.prezzo) dati.prezzo = leggiPrezzo(prezzo)
        if (Object.keys(dati).length > 0) {
          await modifica({ id: oggetto.id, dati }).unwrap()
          toast.successo(`«${dati.nome ?? oggetto.nome}» aggiornato`)
        }
      } else {
        await crea({ nome: nome.trim(), prezzo: leggiPrezzo(prezzo) }).unwrap()
        toast.successo(`«${nome.trim()}» aggiunto al catalogo`)
      }
      onChiudi()
    } catch (errore) {
      const perCampo = erroriCampi(errore) as Errori
      if (statoErrore(errore) === 409) perCampo.nome = messaggioErrore(errore)
      setErrori(perCampo)
      if (Object.keys(perCampo).length === 0) setErroreGenerale(messaggioErrore(errore))
    }
  }

  return (
    <Modale aperto={aperto} onChiudi={onChiudi} titolo={oggetto ? 'Modifica oggetto' : 'Nuovo oggetto'}>
      <form onSubmit={invia} noValidate className="space-y-5">
        <Campo
          etichetta="Nome"
          autoFocus
          icona={<Tag className="size-5" />}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            setErrori((p) => ({ ...p, nome: undefined }))
          }}
          errore={errori.nome}
        />
        <Campo
          etichetta="Prezzo (€)"
          inputMode="decimal"
          placeholder="es. 12,50"
          icona={<Euro className="size-5" />}
          value={prezzo}
          onChange={(e) => {
            setPrezzo(e.target.value)
            setErrori((p) => ({ ...p, prezzo: undefined }))
          }}
          errore={errori.prezzo}
        />
        <AvvisoForm messaggio={erroreGenerale} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variante="fantasma" onClick={onChiudi}>
            Annulla
          </Button>
          <Button type="submit" variante="primario" caricamento={inCreazione || inModifica}>
            {oggetto ? 'Salva modifiche' : 'Crea oggetto'}
          </Button>
        </div>
      </form>
    </Modale>
  )
}
