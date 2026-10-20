import { useState, type FormEvent } from 'react'
import { messaggioErrore } from '../../app/errori'
import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import { Modale } from '../../components/Modale'
import type { Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { ElencoCarte } from '../binder/ElencoCarte'
import { useToast } from '../toast/useToast'
import { aggiungi, senzaInvioNeiCampi } from './liste'
import { ListaOrdinabile } from './ListaOrdinabile'
import { PiedeModifica } from './PiedeModifica'
import { useSalvaVetrinaMutation } from './profiloApi'

const MASSIMO = 6

interface Props {
  aperta: boolean
  onChiudi: () => void
  vetrina: Oggetto[]
}

export function ModaleVetrina({ aperta, onChiudi, vetrina }: Props) {
  return (
    <Modale aperto={aperta} onChiudi={onChiudi} titolo="Vetrina" larghezza="max-w-2xl">
      <ModuloVetrina vetrina={vetrina} onChiudi={onChiudi} />
    </Modale>
  )
}

function ModuloVetrina({ vetrina, onChiudi }: Omit<Props, 'aperta'>) {
  const [carte, setCarte] = useState(vetrina)
  const [errore, setErrore] = useState<string | null>(null)
  const [salva, { isLoading }] = useSalvaVetrinaMutation()
  const toast = useToast()
  const piena = carte.length >= MASSIMO

  async function invia(evento: FormEvent) {
    evento.preventDefault()
    setErrore(null)
    try {
      await salva(carte.map((c) => c.id)).unwrap()
      toast.successo('Vetrina aggiornata')
      onChiudi()
    } catch (e) {
      setErrore(messaggioErrore(e, 'Non è stato possibile salvare la vetrina'))
    }
  }

  return (
    <form onSubmit={invia} noValidate className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-testo">
          Le tue carte <span className="font-normal text-testo/60">{carte.length}/{MASSIMO}</span>
        </p>
        {carte.length === 0 ? (
          <p className="rounded-2xl bg-tenue/60 p-4 text-sm text-testo/70">Scegli qui sotto fino a {MASSIMO} carte da mettere in mostra.</p>
        ) : (
          <ListaOrdinabile
            voci={carte}
            chiave={(c) => c.id}
            etichetta={(c) => c.nome}
            onCambia={setCarte}
            render={(c) => (
              <div className="flex items-center gap-3">
                <ImmagineCarta src={c.immagineUrlPiccola ?? c.immagineUrl} alt={c.nome} className={cn('aspect-[63/88] w-10', FORMA_CARTA)} />
                <span className="truncate text-sm font-semibold text-testo">{c.nome}</span>
              </div>
            )}
          />
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-testo">{piena ? 'La vetrina è piena: togli una carta per aggiungerne altre' : 'Aggiungi una carta'}</p>
        <div
          onKeyDown={senzaInvioNeiCampi}
          className={cn('h-80 rounded-2xl bg-tenue/50 p-3', piena && 'pointer-events-none opacity-50')}
          aria-disabled={piena || undefined}
        >
          <ElencoCarte colonne="grid-cols-4 sm:grid-cols-5" onScegli={(carta) => setCarte((c) => aggiungi(c, carta, MASSIMO, (a, b) => a.id === b.id))} />
        </div>
      </div>

      <PiedeModifica errore={errore} inSalvataggio={isLoading} onAnnulla={onChiudi} />
    </form>
  )
}
