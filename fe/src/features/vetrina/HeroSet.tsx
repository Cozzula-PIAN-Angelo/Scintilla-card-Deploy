import { motion } from 'framer-motion'
import { PencilLine } from 'lucide-react'
import { useState } from 'react'
import { useAppSelector } from '../../app/hooks'
import { Button, LinkBottone } from '../../components/Button'
import { CarteSfondo } from '../../components/CarteSfondo'
import { SimboloSet } from '../../components/SimboloSet'
import { DALL_ELENCO } from '../../hooks/useRitornoElenco'
import type { AnteprimaSet } from '../../types/api'
import { formattaData } from '../../utils/formato'
import { selectIsAdmin } from '../auth/authSlice'
import { useGetAnteprimeQuery } from '../espansioni/espansioniApi'
import { LogoSet } from '../espansioni/LogoSet'
import { RaritaSet } from './BallRarita'
import { ModaleDescrizioneSet } from './ModaleDescrizioneSet'
import { carteSegrete } from './raritaVetrina'
import { TAVOLO, TavoloCarte } from './TavoloCarte'
import { useCarteCaricate } from './useCarteCaricate'

const entrata = (ritardo: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { delay: ritardo } },
})

// la hero della home è il set più nuovo già scaricato: le sue carte di punta sul tavolo, altre carte del set sparse
// sullo sfondo. Senza nessun set scaricato (database appena creato) resta solo l'invito all'elenco
export function HeroSet() {
  const { data, isLoading } = useGetAnteprimeQuery()
  const hero = data?.[0]

  return (
    <section aria-labelledby="hero-set" className="sfondo-hero relative animate-gradiente overflow-hidden text-white">
      {hero && <CarteSfondo carte={hero.carteSfondo} />}
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_23rem] xl:gap-16">
        {hero ? <ContenutoHero hero={hero} /> : <HeroSenzaSet inAttesa={isLoading} />}
      </div>
    </section>
  )
}

function ContenutoHero({ hero }: { hero: AnteprimaSet }) {
  const { espansione } = hero
  const carte = useCarteCaricate(hero.carteDiPunta, TAVOLO.length)
  const isAdmin = useAppSelector(selectIsAdmin)
  const [modificaAperta, setModificaAperta] = useState(false)
  const segrete = carteSegrete(espansione.totaleCarte, espansione.carteUfficiali)
  const percorso = `/espansioni/${encodeURIComponent(espansione.id)}`

  return (
    <>
      <TavoloCarte espansione={espansione} carte={carte} className="order-2 lg:order-1" />

      <div className="order-1 lg:order-2">
        <motion.div {...entrata(0.05)} className="relative h-28 w-full max-w-80 drop-shadow-lg">
          <LogoSet src={espansione.logoUrl} className="object-left" />
        </motion.div>
        <motion.h1 {...entrata(0.1)} id="hero-set" className="mt-5 text-balance text-5xl font-bold leading-[1.05] sm:text-6xl">
          {espansione.nome}
        </motion.h1>
        <motion.div {...entrata(0.15)} className="mt-4 text-base font-medium text-blu-50">
          {espansione.serie && (
            <p className="flex items-center gap-2">
              <SimboloSet src={espansione.simboloUrl} className="size-5" />
              {espansione.serie}
            </p>
          )}
          <p className="mt-0.5">
            {[
              espansione.dataUscita && formattaData(espansione.dataUscita),
              espansione.totaleCarte != null && `${espansione.totaleCarte} carte`,
              segrete ? `${segrete} segrete` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </motion.div>
        <motion.div {...entrata(0.2)}>
          {espansione.descrizione && <p className="mt-6 text-lg text-white">{espansione.descrizione}</p>}
          <RaritaSet rarita={hero.raritaAmbite} className="mt-6" />
        </motion.div>
        <motion.div {...entrata(0.3)} className="mt-8 flex flex-wrap gap-3">
          <LinkBottone to={percorso} state={DALL_ELENCO} variante="secondario" dimensione="lg">
            Apri il set
          </LinkBottone>
          <LinkBottone to="/espansioni" variante="suScuro" dimensione="lg">
            Tutti i set
          </LinkBottone>
        </motion.div>
        {isAdmin && (
          <>
            <Button variante="suScuro" dimensione="sm" onClick={() => setModificaAperta(true)} className="mt-4">
              <PencilLine aria-hidden className="size-4" />
              {espansione.descrizione ? 'Modifica la descrizione' : 'Scrivi una descrizione'}
            </Button>
            <ModaleDescrizioneSet aperto={modificaAperta} espansione={espansione} onChiudi={() => setModificaAperta(false)} />
          </>
        )}
      </div>
    </>
  )
}

// nessun set ancora scaricato (o vetrina non raggiungibile): niente carte da mostrare, solo la strada per l'elenco
function HeroSenzaSet({ inAttesa }: { inAttesa: boolean }) {
  return (
    <div className="max-w-xl lg:col-span-2">
      <h1 id="hero-set" className="text-balance text-5xl font-bold leading-[1.05] sm:text-6xl">
        {inAttesa ? 'Il set più nuovo sta arrivando…' : 'Tutte le espansioni, da Base Set a oggi'}
      </h1>
      {!inAttesa && (
        <>
          <p className="mt-5 text-lg text-white">Apri un set e guarda quante carte ti mancano: le altre aspettano in grigio al loro posto.</p>
          <LinkBottone to="/espansioni" variante="secondario" dimensione="lg" className="mt-8">
            Tutti i set
          </LinkBottone>
        </>
      )}
    </div>
  )
}
