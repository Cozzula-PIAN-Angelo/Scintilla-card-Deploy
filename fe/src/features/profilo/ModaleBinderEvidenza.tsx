import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Modale } from '../../components/Modale'
import { Skeleton } from '../../components/Skeleton'
import type { Binder } from '../../types/api'
import { cn } from '../../utils/cn'
import { useGetBinderQuery } from '../binder/binderApi'
import { useToast } from '../toast/useToast'
import { aggiungi } from './liste'
import { ListaOrdinabile } from './ListaOrdinabile'
import { PiedeModifica } from './PiedeModifica'
import { useSalvaBinderEvidenzaMutation } from './profiloApi'

const MASSIMO = 3

interface Props {
  aperta: boolean
  onChiudi: () => void
  binder: Binder[]
}

export function ModaleBinderEvidenza({ aperta, onChiudi, binder }: Props) {
  return (
    <Modale aperto={aperta} onChiudi={onChiudi} titolo="Binder in evidenza">
      <ModuloBinder binder={binder} onChiudi={onChiudi} />
    </Modale>
  )
}

function Pallino({ colore }: { colore: string }) {
  return <span aria-hidden className="size-6 shrink-0 rounded-md ring-1 ring-linea/10" style={{ backgroundColor: colore }} />
}

function ModuloBinder({ binder, onChiudi }: Omit<Props, 'aperta'>) {
  const [scelti, setScelti] = useState(binder)
  const [errore, setErrore] = useState<string | null>(null)
  const { data: tutti, isLoading: inCaricamento } = useGetBinderQuery()
  const [salva, { isLoading }] = useSalvaBinderEvidenzaMutation()
  const toast = useToast()
  const pieno = scelti.length >= MASSIMO

  async function invia(evento: FormEvent) {
    evento.preventDefault()
    setErrore(null)
    try {
      await salva(scelti.map((b) => b.id)).unwrap()
      toast.successo('Binder in evidenza aggiornati')
      onChiudi()
    } catch (e) {
      setErrore(messaggioErrore(e, 'Non è stato possibile salvare i binder in evidenza'))
    }
  }

  return (
    <form onSubmit={invia} noValidate className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-testo">
          In evidenza <span className="font-normal text-testo/60">{scelti.length}/{MASSIMO}</span>
        </p>
        {scelti.length === 0 ? (
          <p className="rounded-2xl bg-tenue/60 p-4 text-sm text-testo/70">Scegli fino a {MASSIMO} binder da mostrare.</p>
        ) : (
          <ListaOrdinabile
            voci={scelti}
            chiave={(b) => b.id}
            etichetta={(b) => b.nome}
            onCambia={setScelti}
            render={(b) => (
              <div className="flex items-center gap-3">
                <Pallino colore={b.colore} />
                <span className="truncate text-sm font-semibold text-testo">{b.nome}</span>
              </div>
            )}
          />
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-testo">I tuoi binder</p>
        {inCaricamento ? (
          <Skeleton className="h-32" />
        ) : !tutti || tutti.length === 0 ? (
          <p className="text-sm text-testo/70">Non hai ancora creato nessun binder.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {tutti.map((b) => {
              const scelto = scelti.some((s) => s.id === b.id)
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    disabled={scelto || pieno}
                    onClick={() => setScelti((s) => aggiungi(s, b, MASSIMO, (x, y) => x.id === y.id))}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-tenue disabled:hover:bg-transparent',
                      !scelto && pieno && 'opacity-40',
                    )}
                  >
                    <Pallino colore={b.colore} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-testo">{b.nome}</span>
                    {scelto && <Check aria-label="già in evidenza" className="size-4 text-blu-500" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <PiedeModifica errore={errore} inSalvataggio={isLoading} onAnnulla={onChiudi} />
    </form>
  )
}
