// tema applicato prima del primo disegno, senza lampo di bianco: scelta salvata o, in mancanza, quella del sistema
// (stessa chiave di src/theme/tema.ts). È un file a parte e non uno script dentro index.html perché la
// Content-Security-Policy del sito (render.yaml) ammette solo script serviti dal sito stesso
try {
  var tema = localStorage.getItem('scintilla.tema')
  if (tema !== 'chiaro' && tema !== 'scuro') tema = matchMedia('(prefers-color-scheme: dark)').matches ? 'scuro' : 'chiaro'
  document.documentElement.dataset.tema = tema
} catch (e) {}
