const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const data = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

export function formattaPrezzo(valore: number): string {
  return euro.format(valore)
}

export function formattaData(iso: string): string {
  return data.format(new Date(iso))
}
