// Regole di genera-artisti.mjs: si eseguono con `node --test scripts/`
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dividi, pulisci, sceltaAvatar, slug } from './artisti-regole.mjs'

test('pulisci riduce spazi e a capo a uno spazio', () => {
  assert.equal(pulisci('Noriko Takaya,   \n  \n Shinji Higuchi '), 'Noriko Takaya, Shinji Higuchi')
})

test('dividi separa i coautori', () => {
  assert.deepEqual(dividi('Shinji Higuchi + Sachiko Eba'), ['Shinji Higuchi', 'Sachiko Eba'])
  assert.deepEqual(dividi('K. Hoshiba, CR CG gangs'), ['K. Hoshiba', 'CR CG gangs'])
  assert.deepEqual(dividi('Ken Sugimori/Yusuke Ohmura'), ['Ken Sugimori', 'Yusuke Ohmura'])
  assert.deepEqual(dividi('"Big Mama" Tagawa & Benimaru Itoh'), ['"Big Mama" Tagawa', 'Benimaru Itoh'])
  assert.deepEqual(dividi('Kent Kanetsuna/Direc. Shinji Higuchi'), ['Kent Kanetsuna', 'Shinji Higuchi'])
  assert.deepEqual(dividi('Noriko Takaya,\n   Shinji Higuchi'), ['Noriko Takaya', 'Shinji Higuchi'])
})

test('dividi applica gli alias dei doppioni', () => {
  assert.deepEqual(dividi('K Hoshiba'), ['K. Hoshiba'])
  assert.deepEqual(dividi('akyCG Works'), ['aky CG Works'])
})

test('un nome singolo con spazi resta intero', () => {
  assert.deepEqual(dividi('5ban Graphics'), ['5ban Graphics'])
})

test('slug', () => {
  assert.equal(slug('Mitsuhiro Arita'), 'mitsuhiro-arita')
  assert.equal(slug('Mékayu'), 'mekayu')
  assert.equal(slug('"Big Mama" Tagawa'), 'big-mama-tagawa')
  assert.equal(slug('K. Hoshiba'), 'k-hoshiba')
  assert.equal(slug('5ban Graphics'), '5ban-graphics')
})

test("l'avatar preferisce le illustrazioni piene più recenti", () => {
  const carte = [
    { rarity: 'Common', data: '2025/01/01', id: 'a-1', immagine: 'recente-comune' },
    { rarity: 'Illustration Rare', data: '2023/01/01', id: 'b-1', immagine: 'ir-vecchia' },
    { rarity: 'Special Illustration Rare', data: '2024/01/01', id: 'c-1', immagine: 'sir' },
  ]
  assert.equal(sceltaAvatar(carte), 'sir')
  assert.equal(sceltaAvatar(carte.slice(0, 1)), 'recente-comune')
})

test("l'avatar riconosce le rarità di TCGdex, scritte in minuscolo", () => {
  const carte = [
    { rarity: 'Common', data: '2025-01-01', id: 'a-1', immagine: 'recente-comune' },
    { rarity: 'Special illustration rare', data: '2024-01-01', id: 'c-1', immagine: 'sir' },
  ]
  assert.equal(sceltaAvatar(carte), 'sir')
})

test("senza candidati con immagine l'avatar è null", () => {
  assert.equal(sceltaAvatar([]), null)
})

test('dividi toglie i prefissi Illus. e Direc. e le parti vuote', () => {
  assert.deepEqual(dividi('Illus. & Direc. The Pokémon Company Art Team'), ['The Pokémon Company Art Team'])
})

test('N/A non è un artista', () => {
  assert.deepEqual(dividi('N/A'), [])
})

test('un alias può dividere due nomi scritti senza separatore', () => {
  assert.deepEqual(dividi('Ken Sugimori Yusuke Ohmura'), ['Ken Sugimori', 'Yusuke Ohmura'])
  assert.deepEqual(dividi('Shinji Higuchi + Noriko Takaya 樋口 真嗣 + 高屋 法子'), ['Shinji Higuchi', 'Noriko Takaya'])
})
