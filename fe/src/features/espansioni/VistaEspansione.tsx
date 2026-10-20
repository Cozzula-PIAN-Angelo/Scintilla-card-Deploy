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
import { conteggioMaster } from '../collezione/conteggi'
import { AvvisoCarteInArrivo } from '../collezione/AvvisoCarteInArrivo'
import { useCollezionePagina } from '../collezione/useCollezionePagina'
import { useCarteProgressive } from '../oggetti/useCarteProgressive'
import type { Espansione, Oggetto } from '../../types/api'
import { useGetCarteEspansioneQuery, useGetStatoCarteEspansioneQuery } from './espansioniApi'
import { SimboloSet } from '../../components/SimboloSet'

interface Props {
  espansione: Espansione
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
}

// intestazione e carte di un solo set, con il dettaglio carta che sfoglia le carte mostrate
export function VistaEspansione({ espansione, isPreferito, onTogglePreferito }: Props) {
  const risposta = useCarteProgressive(useGetCarteEspansioneQuery, useGetStatoCarteEspansioneQuery, espansione.id)
  const { isLoading, isFetching, isError, error, refetch } = risposta
  // lista intera solo a set completo: barra, filtri, master set e binder hanno bisogno di tutte le carte
  const data = risposta.aPezzi ? undefined : risposta.carte
  const filtroPagina = useMemo(() => ({ espansione: espansione.id }), [espansione.id])
  const { collezione, carte, barra, vuotoFiltro, master } = useCollezionePagina(filtroPagina, data, true)
  const carteGriglia = risposta.aPezzi ? risposta.carte : carte
  const { apri, aperta, modale } = useCartaSelezionata({ isPreferito, toggle: onTogglePreferito }, collezione, carteGriglia)
  const anno = espansione.dataUscita?.slice(0, 4)
  const totale = data?.length ?? risposta.totaleServer ?? espansione.totaleCarte
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
            <SimboloSet src={espansione.simboloUrl} className="size-5" />
            {[anno, totale != null && (totale === 1 ? '1 carta' : `${totale} carte`)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {/* collezione presente = utente loggato. A pezzi il bottone si vede ma aspetta tutte le carte */}
        {collezione && (risposta.aPezzi ? (risposta.totaleServer ?? 0) > 0 : data && data.length > 0) && (
          <Button
            variante="chiaro"
            dimensione="sm"
            onClick={() => setChecklistAperta(true)}
            className="sm:ml-auto"
            disabled={risposta.aPezzi}
            title={risposta.aPezzi ? 'Disponibile quando tutte le carte sono pronte' : undefined}
          >
            <BookPlus aria-hidden className="size-4" />
            {master ? 'Crea binder master set' : 'Crea binder checklist'}
            {risposta.aPezzi && <span className="sr-only">: disponibile quando tutte le carte sono pronte</span>}
          </Button>
        )}
      </header>

      {data && (
        <ModaleBinder
          aperta={checklistAperta}
          binder={null}
          checklist={
            master && collezione
              ? {
                  espansioneId: espansione.id,
                  nome: `${espansione.nome} · Master`,
                  carte: conteggioMaster(data, collezione.mappa).totale,
                  master: true,
                }
              : { espansioneId: espansione.id, nome: espansione.nome, carte: data.length }
          }
          onChiudi={() => setChecklistAperta(false)}
          onCreato={(binder) => navigate(`/binder/${binder.id}`)}
        />
      )}

      {risposta.aPezzi ? <AvvisoCarteInArrivo fallito={risposta.fallito} /> : barra && <BarraCollezione {...barra} />}

      <GrigliaCartePaginata
        chiave={espansione.id}
        carte={carteGriglia}
        totaleServer={risposta.totaleServer}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        refetch={refetch}
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
