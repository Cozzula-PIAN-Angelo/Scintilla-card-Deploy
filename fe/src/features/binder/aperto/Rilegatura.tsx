import { motion } from 'framer-motion'
import type { Binder } from '../../../types/api'
import { RAGGIO_ESTERNO, scuro } from '../aspetto'
import { FoderaBinder } from '../CopertinaBinder'
import type { Lato } from './costanti'

export function InternoCopertina({ binder }: { binder: Binder }) {
  return (
    <FoderaBinder colore={binder.colore}>
      <div className="absolute inset-x-[12%] top-1/2 -translate-y-1/2 rounded-[3cqw] border-[0.5cqw] border-white/25 px-[6cqw] py-[7cqw] text-center text-white/85">
        <p className="text-[3.2cqw] font-semibold uppercase tracking-[0.3em] text-white/60">Collezione</p>
        <p className="mt-[2cqw] font-titolo text-[7cqw] font-bold leading-tight">{binder.nome}</p>
        <p className="mt-[3cqw] text-[3.4cqw]">
          {binder.pagine} pagine · {binder.tasche} tasche per pagina
        </p>
      </div>
    </FoderaBinder>
  )
}

// Copertina aperta a doppia pagina come un pezzo unico: le due metà e il dorso imbottito al
// centro, arrotondata solo agli angoli esterni. Verso il dorso si scurisce, come la piega di un libro
export function CopertinaAperta({ colore, proporzione }: { colore: string; proporzione: number }) {
  // stessi angoli esterni delle metà: la larghezza qui è doppia, l'altezza la stessa
  const orizzontale = RAGGIO_ESTERNO / 2
  const verticale = RAGGIO_ESTERNO * proporzione
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 shadow-xl shadow-ombra/30"
      style={{
        borderRadius: `${orizzontale}% / ${verticale}%`,
        backgroundColor: scuro(colore, 12),
        backgroundImage: [
          // piega verso il dorso
          'linear-gradient(90deg, transparent 38%, rgb(0 0 0 / 0.16) 47%, rgb(0 0 0 / 0.16) 53%, transparent 62%)',
          // luce radente, come sulle metà da chiuso
          'linear-gradient(135deg, rgb(255 255 255 / 0.12), transparent 45%, rgb(0 0 0 / 0.2))',
        ].join(', '),
      }}
    >
      <Dorso colore={colore} />
    </div>
  )
}

// Dorso imbottito: fascia più scura, due pieghe della cerniera ai lati e un riflesso al centro.
// Con "sopra" se ne disegna solo una metà, sopra la fodera di quel lato: la fodera (interno della
// copertina) passa sotto la costa, mentre le pagine restano appoggiate sopra
export function Dorso({ colore, sopra }: { colore: string; sopra?: Lato }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 w-[5%] -translate-x-1/2"
      style={{
        backgroundColor: scuro(colore, 26),
        backgroundImage: [
          'linear-gradient(90deg, rgb(0 0 0 / 0.4) 0 4%, rgb(255 255 255 / 0.14) 4% 8%, transparent 8% 92%, rgb(255 255 255 / 0.14) 92% 96%, rgb(0 0 0 / 0.4) 96%)',
          'linear-gradient(90deg, transparent 15%, rgb(255 255 255 / 0.1) 50%, transparent 85%)',
        ].join(', '),
        clipPath: sopra === 'sinistra' ? 'inset(0 50% 0 0)' : sopra === 'destra' ? 'inset(0 0 0 50%)' : undefined,
      }}
    />
  )
}

// meccanismo ad anelli sulla rilegatura
export function Anelli() {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pointer-events-none absolute inset-y-[3%] left-1/2 flex w-[4%] -translate-x-1/2 flex-col justify-around"
    >
      {/* barra del meccanismo: acciaio con la luce lungo il centro, così sembra tonda */}
      <div
        className="absolute inset-y-0 left-1/2 w-[34%] -translate-x-1/2 rounded-full shadow-[0_2px_5px_rgb(0_0_0/0.45)]"
        style={{
          background:
            'linear-gradient(90deg, #4b515c 0%, #8a919d 22%, #eef1f5 45%, #b9bec7 60%, #7c838f 80%, #454a54 100%)',
        }}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="relative mx-auto aspect-[1/2.2] w-full rounded-full border-[3px] border-[#c9ced8] shadow-[inset_0_0_2px_rgb(0_0_0/0.5),0_2px_4px_rgb(0_0_0/0.4)]"
          style={{ borderLeftColor: '#eef1f6', borderRightColor: '#8d94a3' }}
        />
      ))}
    </motion.div>
  )
}
