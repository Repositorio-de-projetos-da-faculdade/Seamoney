import * as THREE from 'three'

// Procedural textures for container steel: corrugated sides with a matching normal map, doors with locking bars,
// and roofs. Greyscale on purpose: each container gets its colour from the instance colour.

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, g: c.getContext('2d')! }
}

function tex(c: HTMLCanvasElement, color = true) {
  const t = new THREE.CanvasTexture(c)
  if (color) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Trapezoidal corrugation profile, 0 (valley) to 1 (crest), over one period. */
const profile = (p: number) => {
  const f = p - Math.floor(p)
  if (f < 0.3) return 0
  if (f < 0.42) return (f - 0.3) / 0.12
  if (f < 0.88) return 1
  return 1 - (f - 0.88) / 0.12
}

const RIBS = 46

/** Side of a 40 ft box: corrugation shading, rails, corner posts and some grime. */
export function sideTextures() {
  const W = 1024
  const H = 256
  const { c, g } = canvas(W, H)
  const n = canvas(W, H)
  const img = n.g.createImageData(W, H)
  for (let x = 0; x < W; x++) {
    const p = (x / W) * RIBS
    const h = profile(p)
    const dh = (profile(p + 0.01) - profile(p - 0.01)) / 0.02
    const nx = -dh * 0.08
    const len = Math.hypot(nx, 1)
    g.fillStyle = `rgb(${190 + h * 50},${190 + h * 50},${190 + h * 50})`
    g.fillRect(x, 0, 1, H)
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = 128
      img.data[i + 2] = (1 / len) * 0.5 * 255 + 127
      img.data[i + 3] = 255
    }
  }
  n.g.putImageData(img, 0, 0)
  // top and bottom rails, corner posts
  g.fillStyle = '#6d6d6d'
  g.fillRect(0, 0, W, 12)
  g.fillRect(0, H - 14, W, 14)
  g.fillRect(0, 0, 14, H)
  g.fillRect(W - 14, 0, 14, H)
  // grime gathering at the bottom, a few streaks
  const grime = g.createLinearGradient(0, H * 0.55, 0, H)
  grime.addColorStop(0, 'rgba(40,30,20,0)')
  grime.addColorStop(1, 'rgba(40,30,20,0.35)')
  g.fillStyle = grime
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 18; i++) {
    g.fillStyle = `rgba(60,40,25,${0.08 + Math.random() * 0.12})`
    g.fillRect(Math.random() * W, 12, 2 + Math.random() * 4, 40 + Math.random() * 120)
  }
  // a stencilled code block, top right, as on real boxes
  g.fillStyle = 'rgba(245,245,245,0.85)'
  g.font = '600 20px "Geist Mono Variable", monospace'
  g.fillText('SMNU 204511 3', W - 230, 46)
  g.fillText('45G1', W - 230, 72)
  return { map: tex(c), normalMap: tex(n.c, false) }
}

/** Door end: two leaves, four vertical locking bars, hinges and handles. */
export function doorTexture() {
  const { c, g } = canvas(256, 256)
  g.fillStyle = '#c4c4c4'
  g.fillRect(0, 0, 256, 256)
  for (let y = 18; y < 240; y += 22) {
    g.fillStyle = 'rgba(0,0,0,0.14)'
    g.fillRect(14, y, 228, 6)
  }
  g.fillStyle = '#5c5c5c'
  g.fillRect(0, 0, 256, 14)
  g.fillRect(0, 242, 256, 14)
  g.fillRect(0, 0, 14, 256)
  g.fillRect(242, 0, 14, 256)
  g.fillRect(126, 14, 4, 228)
  g.fillStyle = '#8a8a8a'
  for (const x of [42, 92, 164, 214]) g.fillRect(x, 14, 6, 228)
  g.fillStyle = '#3c3c3c'
  for (const x of [38, 88, 160, 210]) g.fillRect(x, 120, 14, 8)
  return tex(c)
}

/** Roof: shallow ribs and weathering. */
export function roofTexture() {
  const { c, g } = canvas(512, 128)
  g.fillStyle = '#b6b6b6'
  g.fillRect(0, 0, 512, 128)
  for (let x = 0; x < 512; x += 16) {
    g.fillStyle = 'rgba(0,0,0,0.1)'
    g.fillRect(x, 0, 6, 128)
  }
  // faint weathering streaks along the roof, not blotches
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(70,55,40,${0.03 + Math.random() * 0.06})`
    g.fillRect(Math.random() * 512, Math.random() * 128, 30 + Math.random() * 120, 3 + Math.random() * 6)
  }
  return tex(c)
}
