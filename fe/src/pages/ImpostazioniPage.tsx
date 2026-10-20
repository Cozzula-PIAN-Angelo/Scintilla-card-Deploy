import { ArrowLeft, UserX } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useAppSelector } from '../app/hooks'
import { Button } from '../components/Button'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { selectUtente } from '../features/auth/authSlice'
import { ModaleCancellaAccount } from '../features/auth/ModaleCancellaAccount'
import { FormAccount } from '../features/profilo/FormAccount'
import { FormPassword } from '../features/profilo/FormPassword'
import { useTitolo } from '../hooks/useTitolo'
import { cn } from '../utils/cn'

function Riquadro({ titolo, testo, children, pericolo = false }: { titolo: string; testo?: string; children: ReactNode; pericolo?: boolean }) {
  return (
    <section
      className={cn(
        'rounded-3xl bg-superficie p-5 shadow-lg shadow-ombra/10 ring-1 sm:p-6',
        pericolo ? 'ring-rosso-700/40' : 'ring-linea/5',
      )}
    >
      <h2 className="text-xl font-bold text-testo">{titolo}</h2>
      {testo && <p className="mt-1 text-sm text-testo/70">{testo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function ImpostazioniPage() {
  useTitolo('Impostazioni')
  const utente = useAppSelector(selectUtente)
  const [cancellazioneAperta, setCancellazioneAperta] = useState(false)

  return (
    <PaginaAnimata className="mx-auto min-h-[70vh] max-w-2xl px-4 py-10 sm:px-6">
      <Link to="/profilo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-testo-2 hover:underline">
        <ArrowLeft aria-hidden className="size-4" />
        Torna al profilo
      </Link>
      <h1 className="mt-3 text-4xl font-bold text-testo">Impostazioni</h1>

      {/* ProtectedRoute aspetta già l'utente: qui c'è sempre */}
      {utente && (
        <div className="mt-8 space-y-6">
          <Riquadro titolo="Account" testo="Lo username è il nome che vedono gli altri; con l'email o lo username accedi.">
            {/* key: dopo un salvataggio il form riparte dai valori nuovi */}
            <FormAccount key={`${utente.username}|${utente.email}`} utente={utente} />
          </Riquadro>
          <Riquadro titolo="Password">
            <FormPassword />
          </Riquadro>
          <Riquadro
            titolo="Zona pericolosa"
            testo="La cancellazione è definitiva: non potrai più accedere con questo account."
            pericolo
          >
            <Button variante="pericolo" onClick={() => setCancellazioneAperta(true)}>
              <UserX aria-hidden className="size-4" />
              Cancella account
            </Button>
          </Riquadro>
        </div>
      )}

      <ModaleCancellaAccount aperta={cancellazioneAperta} onChiudi={() => setCancellazioneAperta(false)} />
    </PaginaAnimata>
  )
}
