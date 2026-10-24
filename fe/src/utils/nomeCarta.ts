// Il catalogo scrive il nome delle carte come "Bulbasaur (Mega Evolution 1/132)": il set e il numero stanno
// nell'ultima parentesi. Il numero è l'ultima parola se ha la barra ("50a/147") o è una sigla con cifre ("SVP001");
// un "2" da solo resta nel nome del set ("Base Set 2")
const NOME_E_SET = /^(.*\S)\s*\(([^()]+)\)$/
const SET_E_NUMERO = /^(.*\S)\s+(\S*\/\S+|[A-Za-z]+\d+[A-Za-z]?)$/

export function dividiNomeCarta(completo: string): { nome: string; set: string | null; numero: string | null } {
  const parti = NOME_E_SET.exec(completo.trim())
  if (!parti) return { nome: completo, set: null, numero: null }
  const [, nome, dentro] = parti
  const conNumero = SET_E_NUMERO.exec(dentro.trim())
  return conNumero ? { nome, set: conNumero[1], numero: conNumero[2] } : { nome, set: dentro.trim(), numero: null }
}
