// node --test scripts/abbinamento-regole.test.mjs
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { abbinaPerNome, abbinaSet, normalizzaNumero } from './abbinamento-regole.mjs'

test('normalizzaNumero toglie gli zeri davanti alle cifre e ignora le maiuscole', () => {
  assert.equal(normalizzaNumero('006'), '6')
  assert.equal(normalizzaNumero('6'), '6')
  assert.equal(normalizzaNumero('TG01'), 'TG1')
  assert.equal(normalizzaNumero('tg1'), 'TG1')
  assert.equal(normalizzaNumero('SV001'), 'SV1')
  assert.equal(normalizzaNumero('!'), '!')
  assert.equal(normalizzaNumero('0'), '0')
})

test('abbinaSet per data e totale, poi a mano', () => {
  const r = abbinaSet(
    [
      { id: 'sv3pt5', name: '151', releaseDate: '2023/09/22', total: 207 },
      { id: 'tk1a', name: 'EX Trainer Kit Latias', releaseDate: '2004/06/01', total: 10 },
    ],
    [
      { id: 'sv03.5', name: '151', releaseDate: '2023-09-22', cardCount: { total: 207 } },
      { id: 'tk-ex-latia', name: 'EX trainer Kit (Latias)', releaseDate: '2004-07-01', cardCount: { total: 10 } },
    ],
  )
  assert.equal(r.abbinati.get('sv3pt5'), 'sv03.5')
  assert.equal(r.abbinati.get('tk1a'), 'tk-ex-latia')
  assert.deepEqual(r.mancanti, [])
})

test('abbinaSet con due set nello stesso giorno e stesso totale sceglie per nome', () => {
  const r = abbinaSet(
    [{ id: 'a', name: 'Primo', releaseDate: '2020/01/01', total: 10 }],
    [
      { id: 'x', name: 'Secondo', releaseDate: '2020-01-01', cardCount: { total: 10 } },
      { id: 'y', name: 'primo', releaseDate: '2020-01-01', cardCount: { total: 10 } },
    ],
  )
  assert.equal(r.abbinati.get('a'), 'y')
})

test('abbinaSet segnala i set senza abbinamento', () => {
  const r = abbinaSet([{ id: 'zzz', name: 'Nessuno', releaseDate: '1990/01/01', total: 1 }], [])
  assert.deepEqual(r.mancanti, ['zzz'])
})

test('normalizzaNumero decodifica i localId di TCGdex con caratteri speciali', () => {
  assert.equal(normalizzaNumero('%3F'), '?')
})

test('abbinaPerNome abbina solo i nomi unici tra le carte non ancora usate', () => {
  const vecchie = [
    { id: 'cel25c-4_A', name: 'Charizard' },
    { id: 'cel25c-15_A1', name: "Venusaur" },
    { id: 'cel25c-15_A2', name: 'Here Comes Team Rocket!' },
    { id: 'cel25c-9_A', name: 'Doppia' },
    { id: 'cel25c-10_A', name: 'Doppia' },
  ]
  const nuove = [
    { id: 'cel25cc-CC001', name: 'Charizard' },
    { id: 'cel25cc-CC002', name: 'Venusaur' },
    { id: 'cel25cc-CC003', name: 'Here Comes Team Rocket!' },
    { id: 'cel25cc-CC004', name: 'Doppia' },
    { id: 'cel25cc-CC005', name: 'Doppia' },
  ]
  const abbinate = abbinaPerNome(vecchie, nuove, new Set(['cel25cc-CC002']))
  assert.deepEqual([...abbinate], [['cel25c-4_A', 'cel25cc-CC001'], ['cel25c-15_A2', 'cel25cc-CC003']])
})

test('abbinaPerNome ignora trattini, stelle e delta scritti in modo diverso', () => {
  const abbinate = abbinaPerNome(
    [{ id: 'a-1', name: 'Mewtwo-EX' }, { id: 'a-2', name: 'Umbreon ★' }, { id: 'a-3', name: 'Gardevoir ex δ' }],
    [{ id: 'b-1', name: 'Mewtwo EX' }, { id: 'b-2', name: 'Umbreon ☆' }, { id: 'b-3', name: 'Gardevoir ex' }],
    new Set(),
  )
  assert.deepEqual([...abbinate], [['a-1', 'b-1'], ['a-2', 'b-2'], ['a-3', 'b-3']])
})
