import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, Layers, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { messaggioErrore } from '../app/errori'
import { Button, LinkBottone } from '../components/Button'
import { ModaleCarta } from '../components/ModaleCarta'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { GrigliaSkeleton, Skeleton } from '../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../components/StatiPagina'
import { useGetEspansioniQuery } from '../features/espansioni/espansioniApi'
import { ListaEspansioni } from '../features/espansioni/ListaEspansioni'
import { memoriaElenco } from '../features/espansioni/memoriaElenco'
import { VistaEspansione } from '../features/espansioni/VistaEspansione'
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { useTitolo } from '../hooks/useTitolo'
import type { Oggetto } from '../types/api'
import { cn } from '../utils/cn'

// pagina di un set: a sinistra l'elenco delle espansioni per cambiare set senza perdere il
// contesto, a destra solo le carte. Niente hero né griglia della vetrina
export function EspansionePage() {
  const { id } = useParams()
  const { data, isLoading, isError, error, refetch } = useGetEspansioniQuery()
  const espansione = data?.find((e) => e.id === id)
  const { isPreferito, toggle } = usePreferiti()
  const [selezionato, setSelezionato] = useState<Oggetto | null>(null)
  const [listaMobileAperta, setListaMobileAperta] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  useTitolo(espansione?.nome ?? 'Espansione')

  // quante pagine di set ci sono nella cronologia dopo la vetrina: 1 arrivando dalla vetrina,
  // +1 per ogni set aperto dalla lista laterale; null con un link diretto
  const passiDallaVetrina = (location.state as { passiDallaVetrina?: number | null } | null)?.passiDallaVetrina ?? null

  useEffect(() => {
    if (espansione) memoriaElenco.ultimaAperta = espansione.id
    setListaMobileAperta(false)
  }, [espansione])

  // si torna alla vetrina ripercorrendo la cronologia, così riappare nello stesso punto;
  // da un link diretto non c'è niente dietro, quindi ci si va e basta
  const tornaAllaVetrina = () => {
    if (passiDallaVetrina) navigate(-passiDallaVetrina)
    else navigate('/')
  }

  return (
    <PaginaAnimata className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6">
      {isLoading ? (
        <div role="status" aria-label="Caricamento dell'espansione" className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Skeleton className="hidden h-[32rem] rounded-3xl lg:block" />
          <div>
            <Skeleton className="h-9 w-52 rounded-full" />
            <Skeleton className="mb-10 mt-6 h-28 w-full max-w-md rounded-3xl" />
            <GrigliaSkeleton quante={6} />
          </div>
        </div>
      ) : isError ? (
        <StatoErrore messaggio={messaggioErrore(error, "Non è stato possibile caricare l'espansione.")} onRiprova={refetch} />
      ) : !data || !espansione ? (
        <StatoVuoto
          icona={<Sparkles aria-hidden className="size-16" />}
          titolo="Espansione non trovata"
          testo="Forse il link non è corretto."
          azione={
            <LinkBottone to="/" variante="primario" dimensione="lg">
              Torna alle espansioni
            </LinkBottone>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <ListaEspansioni
              espansioni={data}
              corrente={espansione}
              passiDallaVetrina={passiDallaVetrina}
              className="sticky top-24 max-h-[calc(100vh-8rem)]"
            />
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Button variante="chiaro" dimensione="sm" onClick={tornaAllaVetrina}>
                <ArrowLeft aria-hidden className="size-4" />
                Tutte le espansioni
              </Button>
              {/* su schermi stretti la lista laterale diventa un pannello a scomparsa */}
              <Button
                variante="chiaro"
                dimensione="sm"
                onClick={() => setListaMobileAperta((aperta) => !aperta)}
                aria-expanded={listaMobileAperta}
                className="lg:hidden"
              >
                <Layers aria-hidden className="size-4" />
                Altre espansioni
                <ChevronDown aria-hidden className={cn('size-4 transition-transform', listaMobileAperta && 'rotate-180')} />
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {listaMobileAperta && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden lg:hidden"
                >
                  <ListaEspansioni
                    espansioni={data}
                    corrente={espansione}
                    passiDallaVetrina={passiDallaVetrina}
                    className="mb-8 h-96"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <VistaEspansione
                key={espansione.id}
                espansione={espansione}
                isPreferito={isPreferito}
                onTogglePreferito={toggle}
                onApri={setSelezionato}
              />
            </AnimatePresence>
          </div>
        </div>
      )}

      <ModaleCarta
        oggetto={selezionato}
        preferito={selezionato ? isPreferito(selezionato.id) : false}
        onTogglePreferito={toggle}
        onChiudi={() => setSelezionato(null)}
      />
    </PaginaAnimata>
  )
}
