import type { ReactNode } from 'react'

export function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-superficie p-5 shadow-lg shadow-ombra/10 ring-1 ring-linea/5 sm:p-6">
      <h2 className="mb-4 text-xl font-bold text-testo">{titolo}</h2>
      {children}
    </section>
  )
}
