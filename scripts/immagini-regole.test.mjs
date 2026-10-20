// node --test scripts/immagini-regole.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nomeFile, percorsoCarta, percorsoSet } from './immagini-regole.mjs'

test('nomeFile tiene lettere, cifre, punti e trattini', () => {
  assert.equal(nomeFile('sm7.5-1'), 'sm7.5-1')
  assert.equal(nomeFile('swsh9tg-TG01'), 'swsh9tg-TG01')
})

test('nomeFile sostituisce i caratteri vietati nei nomi dei file', () => {
  assert.equal(nomeFile('exu-%3F'), 'exu-_3F')
  assert.equal(nomeFile('exu-!'), 'exu-_')
  assert.equal(nomeFile('ex10-?'), 'ex10-_')
})

test('percorsi relativi al sito', () => {
  assert.equal(percorsoCarta('sm7.5-1'), '/immagini/carte/sm7.5-1.webp')
  assert.equal(percorsoSet('sv03.5', 'simbolo'), '/immagini/set/sv03.5-simbolo.webp')
  assert.equal(percorsoSet('30th', 'logo'), '/immagini/set/30th-logo.webp')
})
