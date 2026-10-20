// Regole con cui scarica-immagini.mjs nomina le copie locali delle immagini. Funzioni pure, testate in
// immagini-regole.test.mjs

// nome di file valido anche su Windows: alcuni id hanno caratteri vietati ("exu-%3F", "exu-!")
export function nomeFile(id) {
  return id.replace(/[^A-Za-z0-9.-]/g, '_')
}

// percorsi relativi al sito: le immagini stanno in fe/public, le serve il frontend
export function percorsoCarta(id) {
  return `/immagini/carte/${nomeFile(id)}.webp`
}

// tipo: "logo" o "simbolo"
export function percorsoSet(id, tipo) {
  return `/immagini/set/${nomeFile(id)}-${tipo}.webp`
}
