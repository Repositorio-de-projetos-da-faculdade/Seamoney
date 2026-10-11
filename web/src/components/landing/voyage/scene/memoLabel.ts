import * as THREE from 'three'
import type { MemoByte } from '@/lib/memo'
import { FONTS } from './livery'

// The roof of a memo container, read from above: the character it carries, its byte in hex and its position
// in the memo. Redrawn whenever the visitor issues another order code.

type Ctx = CanvasRenderingContext2D & { letterSpacing: string }

export const DATA_COLORS = ['#24e4b4', '#46ded6', '#7eedcf', '#16c99b']
export const PAD_COLORS = ['#13324f', '#183b5d', '#0f2b45']

export const memoColor = (b: MemoByte, i: number) =>
  b.padding ? PAD_COLORS[(i * 7) % PAD_COLORS.length] : DATA_COLORS[parseInt(b.hex, 16) % DATA_COLORS.length]

export function labelCanvas() {
  const c = document.createElement('canvas')
  c.width = 640
  c.height = 256
  const g = c.getContext('2d') as Ctx
  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 16
  return { g, texture }
}

export function drawLabel(g: Ctx, byte: MemoByte, index: number) {
  const W = g.canvas.width
  const H = g.canvas.height
  g.fillStyle = memoColor(byte, index)
  g.fillRect(0, 0, W, H)
  // roof ribs and the frame
  for (let x = 0; x < W; x += 20) {
    g.fillStyle = 'rgba(0,0,0,0.06)'
    g.fillRect(x, 0, 8, H)
  }
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  g.lineWidth = 10
  g.strokeRect(5, 5, W - 10, H - 10)

  const ink = byte.padding ? 'rgba(213,230,238,0.5)' : '#00203b'
  g.fillStyle = ink
  g.textBaseline = 'middle'
  g.letterSpacing = '0px'
  g.font = `600 26px ${FONTS.data}`
  g.textAlign = 'left'
  g.globalAlpha = 0.6
  g.fillText(String(index).padStart(2, '0'), 26, 36)
  g.globalAlpha = 1

  if (byte.padding) {
    g.font = `500 70px ${FONTS.data}`
    g.textAlign = 'center'
    g.fillText('00', W / 2, H / 2 + 6)
    return
  }
  const glyph = byte.char === ' ' ? '␣' : byte.char
  if (glyph) {
    g.font = `800 190px ${FONTS.display}`
    g.textAlign = 'left'
    g.fillText(glyph, 70, H / 2 + 14)
  }
  g.font = `700 64px ${FONTS.data}`
  g.textAlign = 'right'
  g.fillText(byte.hex.toUpperCase(), W - 34, H / 2 + 10)
}
