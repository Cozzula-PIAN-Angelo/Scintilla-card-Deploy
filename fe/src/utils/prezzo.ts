// stessi vincoli del backend: @DecimalMin("0.01") e @Digits(integer = 6, fraction = 2)
const FORMATO_PREZZO = /^\d{1,6}(\.\d{1,2})?$/

function normalizza(testo: string): string {
  return testo.trim().replace(',', '.')
}

export function validaPrezzo(testo: string, obbligatorio: boolean): string | null {
  const valore = normalizza(testo)
  if (!valore) return obbligatorio ? 'Il prezzo è obbligatorio' : null
  if (!FORMATO_PREZZO.test(valore)) return 'Massimo 6 cifre intere e 2 decimali (es. 12,50)'
  if (Number(valore) < 0.01) return 'Il prezzo deve essere almeno 0,01 €'
  return null
}

export function leggiPrezzo(testo: string): number {
  return Number(normalizza(testo))
}

// valore iniziale di un campo prezzo, con la virgola come separatore italiano
export function prezzoPerCampo(valore: number | null | undefined): string {
  return valore == null ? '' : valore.toFixed(2).replace('.', ',')
}
