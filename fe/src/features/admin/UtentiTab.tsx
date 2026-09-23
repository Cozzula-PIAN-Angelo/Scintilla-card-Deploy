import { Crown, ShieldCheck, ShieldOff, Users } from 'lucide-react'
import { useState } from 'react'
import { messaggioErrore } from '../../app/errori'
import { useAppSelector } from '../../app/hooks'
import { Button } from '../../components/Button'
import { Loader } from '../../components/Loader'
import { Modale } from '../../components/Modale'
import { Paginazione } from '../../components/Paginazione'
import { StatoErrore, StatoVuoto } from '../../components/StatiPagina'
import { RUOLO_ADMIN, type Utente } from '../../types/api'
import { cn } from '../../utils/cn'
import { selectUtente } from '../auth/authSlice'
import { useToast } from '../toast/useToast'
import { useAssegnaAdminMutation, useGetUtentiQuery, useRevocaAdminMutation } from './adminApi'

const PER_PAGINA = 10

export function UtentiTab() {
  const [pagina, setPagina] = useState(0)
  const { data, isLoading, isFetching, isError, error, refetch } = useGetUtentiQuery({ page: pagina, size: PER_PAGINA })
  const [assegna] = useAssegnaAdminMutation()
  const [revoca] = useRevocaAdminMutation()
  const io = useAppSelector(selectUtente)
  const toast = useToast()

  const [inCorso, setInCorso] = useState<string | null>(null)
  // revocare ADMIN a sé stessi fa perdere l'accesso a questa pagina: serve una conferma
  const [revocaPersonale, setRevocaPersonale] = useState(false)

  const cambiaRuolo = async (utente: Utente) => {
    const eraAdmin = utente.ruoli.includes(RUOLO_ADMIN)
    setInCorso(utente.id)
    try {
      if (eraAdmin) {
        await revoca(utente.id).unwrap()
        toast.successo(`${utente.username} non è più admin`)
      } else {
        await assegna(utente.id).unwrap()
        toast.successo(`${utente.username} ora è admin`)
      }
    } catch (e) {
      // 409: ultimo admin rimasto, o ruolo già assegnato
      toast.errore(messaggioErrore(e, 'Operazione non riuscita'))
    } finally {
      setInCorso(null)
      setRevocaPersonale(false)
    }
  }

  const gestisciClic = (utente: Utente) => {
    if (utente.id === io?.id && utente.ruoli.includes(RUOLO_ADMIN)) setRevocaPersonale(true)
    else void cambiaRuolo(utente)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-blu-900">Utenti registrati</h2>
        {data && <p className="text-sm text-blu-900/70">{data.totalElements} in totale</p>}
      </div>

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <StatoErrore messaggio={messaggioErrore(error)} onRiprova={refetch} />
      ) : !data || data.content.length === 0 ? (
        <StatoVuoto icona={<Users aria-hidden className="size-16" />} titolo="Nessun utente" testo="Non ci sono ancora utenti registrati." />
      ) : (
        <>
          <div className={cn('overflow-x-auto rounded-3xl bg-white shadow-lg shadow-blu-900/10 transition-opacity', isFetching && 'opacity-60')}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-blu-50 text-xs uppercase tracking-wide text-blu-700">
                <tr>
                  <th scope="col" className="px-5 py-4">Utente</th>
                  <th scope="col" className="px-5 py-4">Email</th>
                  <th scope="col" className="px-5 py-4">Ruoli</th>
                  <th scope="col" className="px-5 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((utente) => {
                  const admin = utente.ruoli.includes(RUOLO_ADMIN)
                  return (
                    <tr key={utente.id} className="border-t border-blu-50 transition-colors hover:bg-blu-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className={cn(
                              'grid size-10 place-items-center rounded-full font-titolo text-lg font-bold',
                              admin ? 'bg-giallo-400 text-blu-900' : 'bg-blu-500 text-white',
                            )}
                          >
                            {utente.username.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold text-blu-900">
                            {utente.username}
                            {utente.id === io?.id && <span className="ml-1 font-normal text-blu-900/70">(tu)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-blu-900/70">{utente.email}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {utente.ruoli.map((ruolo) => (
                            <span
                              key={ruolo}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                                ruolo === RUOLO_ADMIN ? 'bg-giallo-400 text-blu-900' : 'bg-blu-50 text-blu-700',
                              )}
                            >
                              {ruolo === RUOLO_ADMIN && <Crown aria-hidden className="size-3.5" />}
                              {ruolo}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variante={admin ? 'chiaro' : 'primario'}
                          dimensione="sm"
                          caricamento={inCorso === utente.id}
                          disabled={inCorso !== null && inCorso !== utente.id}
                          onClick={() => gestisciClic(utente)}
                        >
                          {inCorso !== utente.id &&
                            (admin ? <ShieldOff aria-hidden className="size-4" /> : <ShieldCheck aria-hidden className="size-4" />)}
                          {admin ? 'Revoca admin' : 'Rendi admin'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Paginazione pagina={pagina} totalePagine={data.totalPages} onCambia={setPagina} />
        </>
      )}

      <Modale aperto={revocaPersonale} onChiudi={() => setRevocaPersonale(false)} titolo="Revocare il tuo ruolo admin?">
        <p className="text-blu-900">
          Perderai subito l'accesso al pannello di amministrazione. Potrà ridartelo solo un altro admin.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variante="fantasma" onClick={() => setRevocaPersonale(false)}>
            Annulla
          </Button>
          <Button variante="pericolo" caricamento={inCorso !== null} onClick={() => io && cambiaRuolo({ ...io, ruoli: [RUOLO_ADMIN] })}>
            <ShieldOff aria-hidden className="size-4" />
            Revoca
          </Button>
        </div>
      </Modale>
    </div>
  )
}
