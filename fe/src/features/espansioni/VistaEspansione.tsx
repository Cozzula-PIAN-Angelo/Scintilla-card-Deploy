import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { BookPlus, Layers } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { GrigliaCartePaginata } from '../../components/GrigliaCartePaginata'
import { ModaleCarta } from '../../components/ModaleCarta'
import { useCartaSelezionata } from '../../hooks/useCartaSelezionata'
import { ModaleBinder } from '../binder/ModaleBinder'
import { BarraCollezione } from '../collezione/BarraCollezione'
import { useCollezionePagina } from '../collezione/useCollezionePagina'
import type { Espansione, Oggetto } from '../../types/api'
import { useGetCarteEspansioneQuery } from './espansioniApi'

interface Props {
  espansione: Espansione
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
}

// intestazione e carte di un solo set, con il dettaglio carta che sfoglia le carte mostrate
export function VistaEspansione({ espansione, isPreferito, onTogglePreferito }: Props) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCarteEspansioneQuery(espansione.id)
  const filtroPagina = useMemo(() => ({ espansione: espansione.id }), [espansione.id])
  const masterSet = useMemo(() => ({ senzaDati: espansione.senzaDati }), [espansione.senzaDati])
  const { collezione, carte, barra, vuotoFiltro } = useCollezionePagina(filtroPagina, data, masterSet)
  const { apri, aperta, modale } = useCartaSelezionata({ isPreferito, toggle: onTogglePreferito }, collezione, carte)
  const anno = espansione.dataUscita?.slice(0, 4)
  const totale = data?.length ?? espansione.totaleCarte
  const navigate = useNavigate()
  const [checklistAperta, setChecklistAperta] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <header className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {espansione.logoUrl && (
          // dimensioni esplicite + object-contain: i loghi quadrati o verticali (POP, promo) con
          // max-h-full restavano alti quanto la loro larghezza e uscivano dal riquadro
          <div className="relative h-28 w-full max-w-56 shrink-0 rounded-3xl bg-superficie shadow-lg shadow-ombra/10">
            <img src={espansione.logoUrl} alt="" className="absolute inset-0 h-full w-full object-contain p-4" />
          </div>
        )}
        <div className="min-w-0">
          {espansione.serie && <p className="text-sm font-semibold uppercase tracking-wide text-accento">{espansione.serie}</p>}
          <h3 className="text-4xl font-bold text-testo">{espansione.nome}</h3>
          <p className="mt-1 flex items-center gap-2 text-testo/70">
            {espansione.simboloUrl && <img src={espansione.simboloUrl} alt="" className="size-5 object-contain" />}
            {[anno, totale != null && (totale === 1 ? '1 carta' : `${totale} carte`)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {/* barra presente = utente loggato */}
        {barra && data && data.length > 0 && (
          <Button variante="chiaro" dimensione="sm" onClick={() => setChecklistAperta(true)} className="sm:ml-auto">
            <BookPlus aria-hidden className="size-4" />
            Crea binder checklist
          </Button>
        )}
      </header>

      {data && (
        <ModaleBinder
          aperta={checklistAperta}
          binder={null}
          checklist={{ espansioneId: espansione.id, nome: espansione.nome, carte: data.length }}
          onChiudi={() => setChecklistAperta(false)}
          onCreato={(binder) => navigate(`/binder/${binder.id}`)}
        />
      )}

      {barra && <BarraCollezione {...barra} />}

      <GrigliaCartePaginata
        chiave={espansione.id}
        carte={carte}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        refetch={refetch}
        avvisoCaricamento={espansione.importata ? undefined : 'Prima apertura: stiamo preparando le carte, può volerci qualche secondo…'}
        erroreGenerico="Non è stato possibile caricare le carte di questa espansione."
        vuoto={{
          icona: <Layers aria-hidden className="size-16" />,
          titolo: 'Nessuna carta',
          testo: 'Questa espansione non ha ancora carte in vetrina.',
        }}
        isPreferito={isPreferito}
        onTogglePreferito={onTogglePreferito}
        onApri={apri}
        cartaAperta={aperta}
        stretta
        collezione={collezione}
        vuotoFiltro={vuotoFiltro}
      />

      <ModaleCarta {...modale} />
    </motion.div>
  )
}
