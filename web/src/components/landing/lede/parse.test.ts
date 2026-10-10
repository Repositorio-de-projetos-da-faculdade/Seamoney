import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bindGlyphs, parseLede } from './parse.ts'

// The copy in dict.ts is written with these marks; a glyph must keep the punctuation that follows it attached.
test('splits words, starred words and glyphs, keeping the source spacing', () => {
  assert.deepEqual(parseLede('number {memo} travels *inside it*, {check}.'), [
    { type: 'word', text: 'number', em: false },
    { type: 'space' },
    { type: 'glyph', name: 'memo' },
    { type: 'space' },
    { type: 'word', text: 'travels', em: false },
    { type: 'space' },
    { type: 'word', text: 'inside', em: true },
    { type: 'space' },
    { type: 'word', text: 'it', em: true },
    { type: 'word', text: ',', em: false },
    { type: 'space' },
    { type: 'glyph', name: 'check' },
    { type: 'word', text: '.', em: false },
  ])
})


test('binds a glyph to the word before it and the punctuation after it', () => {
  assert.deepEqual(bindGlyphs(parseLede('reconciles itself {check}.')), [
    { type: 'word', text: 'reconciles', em: false },
    { type: 'space' },
    {
      type: 'bound',
      pieces: [{ type: 'word', text: 'itself', em: false }, { type: 'space' }, { type: 'glyph', name: 'check' }, { type: 'word', text: '.', em: false }],
    },
  ])
})
