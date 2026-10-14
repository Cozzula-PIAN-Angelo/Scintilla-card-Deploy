// Regole di genera-artisti.mjs: si eseguono con `node --test scripts/`
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dividi, pulisci, query, sceltaAvatar, slug } from './artisti-regole.mjs'

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

test('query con jolly al posto di accenti e virgolette', () => {
  assert.equal(query(['Mékayu']), 'artist:"M*kayu"')
  assert.equal(query(['"Big Mama" Tagawa']), 'artist:"*Big Mama* Tagawa"')
  assert.equal(query(['K. Hoshiba', 'K Hoshiba']), 'artist:"K. Hoshiba" OR artist:"K Hoshiba"')
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
