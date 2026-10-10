import { MARK } from '@/lib/brand-paths'

/**
 * Hand-built vector scene: a container ship at dusk, with the Seamoney mark on its funnel, quay cranes behind it,
 * a distant port and the reflection of everything on the water. It stands in for the photography of the mockup and
 * keeps the whole product on-brand, resolution independent and light (no image downloads). All motion is CSS
 * (see globals.css) and stops for people who ask for reduced motion.
 *
 * The scene is drawn once in a 1700x680 box; `variant` only changes which part of it is shown.
 */
type Variant = 'hero' | 'full' | 'bow' | 'wide'

const W = 1700
const VIEW: Record<Variant, string> = {
  hero: `0 0 ${W} 680`,
  full: '940 252 770 380', // the whole ship and cranes, for small screens
  bow: '960 262 740 380',
  wide: '960 300 740 170',
}

// The ship is drawn at x=338..1204 and then scaled to 85% about its waterline and moved to the right edge,
// so the text of the hero can sit on the open water to its left.
const SCALE = 0.85
const WATERLINE = 556
const RIG = `translate(${(1690 - 1204 * SCALE).toFixed(1)} ${(WATERLINE * (1 - SCALE)).toFixed(1)}) scale(${SCALE})`
const DECK = 504
const HORIZON = 440

function lcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const PALETTE = ['#b8413c', '#d58a2e', '#1d9c8c', '#2b6a9e', '#d9e2e8', '#e0b53c', '#274b6d', '#7d3b34', '#4f8a6b', '#8794a3', '#c9573f', '#2e8fa3']
const TIERS = [7, 7, 7, 6, 7, 6, 6, 5, 5, 4, 3, 2]
const BAY_GAP = 7

interface Box {
  x: number
  y: number
  w: number
  h: number
  c: string
}

function buildContainers(): Box[] {
  const rnd = lcg(20261010)
  const boxes: Box[] = []
  TIERS.forEach((tiers, col) => {
    const x = 500 + col * 47.5 + Math.floor(col / 4) * BAY_GAP
    for (let t = 0; t < tiers; t++) {
      boxes.push({ x, y: DECK - (t + 1) * 15, w: 46, h: 14.2, c: PALETTE[Math.floor(rnd() * PALETTE.length)] })
    }
  })
  return boxes
}
const BOXES = buildContainers()

function buildFarPort() {
  const rnd = lcg(77)
  const stacks: { x: number; w: number; h: number; lit: boolean }[] = []
  let x = 30
  while (x < 800) {
    const w = 18 + rnd() * 30
    stacks.push({ x, w, h: 6 + Math.floor(rnd() * 4) * 4, lit: rnd() > 0.7 })
    x += w + 4 + rnd() * 10
  }
  return stacks
}
const FAR_PORT = buildFarPort()
const PORT_LIGHTS = FAR_PORT.filter((s) => s.lit).map((s) => s.x + s.w / 2)

/** A gently rolling line, long enough to slide one period without a visible seam. */
function wave(y: number, amp: number, period: number, phase = 0) {
  const parts = [`M${-period * 2 + phase} ${y}`]
  for (let x = -period * 2 + phase; x < W + period * 2; x += period) {
    parts.push(`q${period / 4} ${-amp} ${period / 2} 0 t${period / 2} 0`)
  }
  return parts.join(' ')
}

const WAVES = [
  { y: 458, amp: 1.5, period: 38, o: 0.16, dur: 22 },
  { y: 474, amp: 2, period: 54, o: 0.14, dur: 19 },
  { y: 494, amp: 2.5, period: 72, o: 0.16, dur: 17 },
  { y: 520, amp: 3.5, period: 96, o: 0.15, dur: 15 },
  { y: 580, amp: 4.5, period: 130, o: 0.17, dur: 13 },
  { y: 612, amp: 6, period: 170, o: 0.15, dur: 11 },
  { y: 646, amp: 8, period: 220, o: 0.14, dur: 9 },
]

function Crane({ x, reach, hoist, hang }: { x: number; reach: number; hoist: number; hang: boolean }) {
  const boom = 298
  const tip = x + reach
  const back = x - 140
  const truss: string[] = []
  for (let px = back; px < tip - 14; px += 22) {
    truss.push(`M${px} ${boom + 14}L${px + 11} ${boom}L${px + 22} ${boom + 14}`)
  }
  return (
    <g>
      {/* legs and portal */}
      <path d={`M${x - 22} ${boom + 14}V${DECK + 20}M${x + 22} ${boom + 14}V${DECK + 20}`} stroke="#c07a1a" strokeWidth="6" />
      <path d={`M${x - 22} 360H${x + 22}M${x - 22} ${boom + 70}L${x + 22} 360M${x + 22} ${boom + 70}L${x - 22} 360`} stroke="#8a5410" strokeWidth="2.2" fill="none" />
      {/* boom */}
      <rect x={back} y={boom} width={tip - back} height="14" fill="#d58a1f" />
      <rect x={back} y={boom} width={tip - back} height="3" fill="#f2b24a" opacity=".8" />
      <path d={truss.join('')} stroke="#8a5410" strokeWidth="2" fill="none" />
      {/* A-frame and stays */}
      <path d={`M${x - 30} ${boom}L${x - 4} 244L${x + 24} ${boom}`} stroke="#d58a1f" strokeWidth="5" fill="none" strokeLinejoin="round" />
      <path d={`M${x - 4} 244L${tip} ${boom + 2}M${x - 4} 244L${back} ${boom + 2}`} stroke="#6b4210" strokeWidth="1.6" fill="none" />
      {/* trolley, cables, spreader (and a hanging box) */}
      <rect x={x + hoist - 9} y={boom + 14} width="18" height="9" fill="#5b3a0c" />
      <path d={`M${x + hoist - 14} ${boom + 23}V${hang ? 352 : 330}M${x + hoist + 14} ${boom + 23}V${hang ? 352 : 330}`} stroke="#2a1b06" strokeWidth="1.2" />
      <rect x={x + hoist - 26} y={hang ? 350 : 328} width="52" height="5" fill="#1b2a38" />
      {hang ? <rect x={x + hoist - 24} y="355" width="48" height="14" fill="#2e8fa3" /> : null}
      {/* warning lights */}
      <circle cx={tip} cy={boom - 4} r="3" className="beacon" fill="#ff5a4d" />
      <circle cx={x - 4} cy="240" r="3" className="beacon" fill="#ff5a4d" style={{ animationDelay: '0.9s' }} />
    </g>
  )
}

function Windows({ x, y, floors, cols, seed }: { x: number; y: number; floors: number; cols: number; seed: number }) {
  const rnd = lcg(seed)
  const out: React.ReactNode[] = []
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const lit = rnd() > 0.35
      out.push(<rect key={`${f}-${c}`} x={x + c * 11.5} y={y + f * 15.5} width="6.5" height="5" rx="1" fill={lit ? '#ffe3a1' : '#1d3a55'} opacity={lit ? 0.95 : 0.9} />)
    }
  }
  return <g>{out}</g>
}

export function ShipScene({ variant = 'hero', className }: { variant?: Variant; className?: string }) {
  const p = `ship-${variant}`
  const id = (n: string) => `${p}-${n}`
  const url = (n: string) => `url(#${id(n)})`
  const markScale = 22 / MARK.height

  return (
    <svg
      viewBox={VIEW[variant]}
      preserveAspectRatio={variant === 'hero' ? 'xMaxYMid slice' : 'xMidYMid slice'}
      className={className}
      role="img"
      aria-label="Container ship leaving port at dusk"
    >
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000b1a" />
          <stop offset="0.38" stopColor="#012447" />
          <stop offset="0.62" stopColor="#0a5677" />
          <stop offset="0.82" stopColor="#3a9cae" />
          <stop offset="1" stopColor="#a9e6df" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="0.72" cy="0.64" r="0.42">
          <stop offset="0" stopColor="#d5fff4" stopOpacity="0.6" />
          <stop offset="0.35" stopColor="#7ee3d4" stopOpacity="0.22" />
          <stop offset="1" stopColor="#7ee3d4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#58b6bf" />
          <stop offset="0.12" stopColor="#1d7088" />
          <stop offset="0.45" stopColor="#0a3c58" />
          <stop offset="1" stopColor="#021528" />
        </linearGradient>
        <linearGradient id={id('seaFront')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c4a66" stopOpacity="0.8" />
          <stop offset="0.35" stopColor="#06304b" stopOpacity="0.96" />
          <stop offset="1" stopColor="#021528" />
        </linearGradient>
        <linearGradient id={id('hull')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a4670" />
          <stop offset="0.5" stopColor="#0c2d4c" />
          <stop offset="1" stopColor="#051a2e" />
        </linearGradient>
        <linearGradient id={id('lightR')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000b1a" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#000b1a" stopOpacity="0" />
          <stop offset="1" stopColor="#bff6ff" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={id('stackLight')} gradientUnits="userSpaceOnUse" x1="498" y1="0" x2="1080" y2="0">
          <stop offset="0" stopColor="#000b1a" stopOpacity="0.42" />
          <stop offset="0.5" stopColor="#000b1a" stopOpacity="0.04" />
          <stop offset="1" stopColor="#bff6ff" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id('wake')} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('haze')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9e6df" stopOpacity="0" />
          <stop offset="1" stopColor="#a9e6df" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={id('reflFade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={id('reflMask')} maskUnits="userSpaceOnUse" x="0" y={WATERLINE} width={W} height="124">
          <rect x="0" y={WATERLINE} width={W} height="124" fill={url('reflFade')} />
        </mask>
        <pattern id={id('ribs')} width="3.4" height="14" patternUnits="userSpaceOnUse">
          <rect width="1.1" height="14" fill="#000" opacity=".2" />
        </pattern>
        <filter id={id('blur')} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={id('blurS')} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={id('ripple')} x="0" y={WATERLINE} width={W} height="124" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.07" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <filter id={id('grain')} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0" />
        </filter>
        <clipPath id={id('sceneClip')}>
          <rect width={W} height="680" />
        </clipPath>

        {/* the whole ship and its cranes, drawn once and shown twice (above the water and mirrored in it) */}
        <g id={id('rig')}>
          <g transform={RIG}>
            <Crane x={640} reach={190} hoist={70} hang />
            <Crane x={930} reach={170} hoist={40} hang={false} />

            <g className="ship-bob">
              {/* hull */}
              <path d={`M338 ${DECK}H1100C1140 ${DECK} 1172 490 1198 456L1204 452L1164 ${WATERLINE + 4}L1132 592H380L338 566Z`} fill={url('hull')} />
              <path d={`M338 ${DECK}H1100C1140 ${DECK} 1172 490 1198 456L1204 452L1164 ${WATERLINE + 4}L1132 592H380L338 566Z`} fill={url('lightR')} />
              <rect x="338" y={DECK + 2} width="826" height="9" fill="#2a5f8f" opacity=".45" />
              {/* boot-top stripe, rail and portholes */}
              <path d={`M345 ${WATERLINE - 11}H1166L1164 ${WATERLINE + 3}H348Z`} fill="#9d3a35" />
              <rect x="338" y={DECK} width="866" height="2.4" fill="#cfe6ee" opacity=".55" />
              <g fill="#ffe3a1" opacity=".85">
                {Array.from({ length: 9 }, (_, i) => (
                  <circle key={i} cx={362 + i * 12} cy={DECK + 22} r="2.2" />
                ))}
              </g>
              <text x="560" y={DECK + 38} fontSize="21" fontWeight="800" letterSpacing="6" fill="#fff" opacity=".88" style={{ fontFamily: 'var(--font-display)' }}>
                SEAMONEY
              </text>

              {/* containers */}
              <g>
                {BOXES.map((b, i) => (
                  <g key={i}>
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} />
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={url('ribs')} />
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={url('stackLight')} />
                    <rect x={b.x} y={b.y} width={b.w} height="1.3" fill="#fff" opacity=".28" />
                    <rect x={b.x} y={b.y + b.h - 1.6} width={b.w} height="1.6" fill="#000" opacity=".32" />
                  </g>
                ))}
              </g>

              {/* funnel with the brand mark */}
              <g>
                <path d="M350 440H394L398 504H346Z" fill="#0d2f4d" />
                <path d="M350 440H394L395 450H349Z" fill="#071c30" />
                <rect x="347" y="458" width="50" height="30" fill="#f3fbfa" />
                <g transform={`translate(${372 - (MARK.width * markScale) / 2} ${473 - 11}) scale(${markScale})`}>
                  <path d={MARK.green} fill="#14b8a0" fillRule="evenodd" />
                  <path d={MARK.white} fill="#0b2540" fillRule="evenodd" />
                </g>
              </g>

              {/* deckhouse, wheelhouse, mast */}
              <g>
                <rect x="394" y="410" width="88" height={DECK - 410} fill="#dfe8ee" />
                <rect x="394" y="410" width="88" height={DECK - 410} fill={url('lightR')} />
                <rect x="394" y="440" width="88" height="1.4" fill="#9db4c4" opacity=".7" />
                <rect x="394" y="472" width="88" height="1.4" fill="#9db4c4" opacity=".7" />
                <Windows x={402} y={420} floors={5} cols={7} seed={12} />
                <rect x="378" y="380" width="118" height="30" rx="2" fill="#f4f9fb" />
                <rect x="378" y="380" width="118" height="30" rx="2" fill={url('lightR')} />
                <rect x="384" y="388" width="106" height="12" fill="#0b2a47" />
                <rect x="384" y="388" width="106" height="12" fill="#ffd88a" opacity=".5" />
                <path d="M392 388V400M404 388V400M416 388V400M428 388V400M440 388V400M452 388V400M464 388V400M476 388V400" stroke="#f4f9fb" strokeWidth="1.6" opacity=".9" />
                <rect x="368" y="404" width="12" height="3" fill="#cfe0e8" />
                <rect x="494" y="404" width="12" height="3" fill="#cfe0e8" />
                <path d="M440 380V338M430 354H452M436 346H444" stroke="#cfe0e8" strokeWidth="2" fill="none" />
                <path d="M440 338L428 322M440 338L452 322" stroke="#9db4c4" strokeWidth="1.4" fill="none" />
                <ellipse cx="440" cy="368" rx="9" ry="2.4" fill="#1b2a38" className="radar" />
                <circle cx="440" cy="336" r="2.4" fill="#ff5a4d" className="beacon" />
              </g>

              {/* forecastle */}
              <g>
                <rect x="1086" y="486" width="86" height="18" fill="#0f3253" />
                <rect x="1086" y="486" width="86" height="2" fill="#cfe6ee" opacity=".55" />
                <path d="M1110 486V450M1110 458H1138" stroke="#cfe0e8" strokeWidth="2" fill="none" />
                <circle cx="1110" cy="448" r="2.2" fill="#7cffb0" />
                <circle cx="1190" cy="462" r="2" fill="#ff5a4d" />
              </g>
            </g>
          </g>
        </g>
      </defs>

      <g clipPath={url('sceneClip')}>
        {/* sky */}
        <rect width={W} height={HORIZON + 4} fill={url('sky')} />
        <rect width={W} height={HORIZON + 4} fill={url('glow')} />
        <g fill="#fff" className="stars" aria-hidden="true">
          {[
            [120, 60], [310, 120], [520, 44], [760, 98], [980, 52], [1180, 130], [1390, 70], [1500, 150], [60, 190], [650, 170], [1290, 38], [880, 160], [1620, 90], [1100, 40],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1.1} opacity={0.35 + (i % 4) * 0.12} style={{ animationDelay: `${(i % 6) * 0.7}s` }} />
          ))}
        </g>
        {/* clouds */}
        <g filter={url('blur')} className="clouds">
          <ellipse cx="420" cy="250" rx="320" ry="30" fill="#5fa6c4" opacity=".24" />
          <ellipse cx="1180" cy="200" rx="380" ry="34" fill="#7ec4d8" opacity=".2" />
          <ellipse cx="860" cy="350" rx="420" ry="24" fill="#bfe6ee" opacity=".22" />
          <ellipse cx="1480" cy="330" rx="300" ry="22" fill="#d3f4f0" opacity=".2" />
          <ellipse cx="180" cy="380" rx="260" ry="18" fill="#bfe6ee" opacity=".18" />
        </g>

        {/* distant coast + port */}
        <path d={`M0 ${HORIZON} V${HORIZON - 14} C120 ${HORIZON - 22} 220 ${HORIZON - 8} 330 ${HORIZON - 16} S560 ${HORIZON - 10} 800 ${HORIZON - 6} V${HORIZON}Z`} fill="#0a3a57" opacity=".85" />
        <g opacity=".9">
          {FAR_PORT.map((s, i) => (
            <rect key={i} x={s.x} y={HORIZON - s.h - 2} width={s.w} height={s.h} fill={i % 3 === 0 ? '#0a3050' : '#072c47'} />
          ))}
          {[110, 270, 430, 590, 750].map((cx, i) => (
            <g key={cx} stroke="#06263f" strokeWidth="2.2" fill="none">
              <path d={`M${cx} ${HORIZON}V${HORIZON - 34 - (i % 2) * 6}M${cx - 16} ${HORIZON - 30 - (i % 2) * 6}H${cx + 26}M${cx} ${HORIZON - 34 - (i % 2) * 6}L${cx + 24} ${HORIZON - 30 - (i % 2) * 6}`} />
              <circle cx={cx + 26} cy={HORIZON - 31 - (i % 2) * 6} r="1.8" fill="#ff5a4d" stroke="none" className="beacon" style={{ animationDelay: `${i * 0.6}s` }} />
            </g>
          ))}
          {PORT_LIGHTS.map((x, i) => (
            <circle key={i} cx={x} cy={HORIZON - 3} r="1.3" fill="#ffd98a" opacity=".8" />
          ))}
        </g>
        {/* a distant ship on the horizon */}
        <g opacity=".6" transform="translate(420 0)">
          <path d={`M0 ${HORIZON - 1}L8 ${HORIZON - 9}H92L104 ${HORIZON - 1}Z`} fill="#082f4a" />
          <rect x="12" y={HORIZON - 15} width="16" height="6" fill="#0a3a58" />
          <rect x="34" y={HORIZON - 14} width="52" height="5" fill="#11506f" />
          <rect x="60" y={HORIZON - 19} width="22" height="5" fill="#0a3a58" />
        </g>

        {/* sea */}
        <rect y={HORIZON} width={W} height={680 - HORIZON} fill={url('sea')} />
        <rect y={HORIZON - 40} width={W} height="60" fill={url('haze')} />
        {/* warm port lights shimmering on the water */}
        <g filter={url('blurS')} aria-hidden="true">
          {PORT_LIGHTS.map((x, i) => (
            <ellipse key={i} cx={x} cy={HORIZON + 10 + (i % 3) * 6} rx="1.6" ry={9 + (i % 3) * 4} fill="#ffd98a" opacity=".32" />
          ))}
        </g>
        <g filter={url('blurS')} className="glints" aria-hidden="true">
          {[
            [1180, 452, 150], [1210, 462, 190], [1150, 474, 130], [1200, 488, 230], [1120, 506, 170], [1220, 528, 210], [1160, 556, 120],
          ].map(([cx, cy, rx], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry="1.7" fill="#e9fffb" opacity={0.2 - i * 0.015} style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
        </g>
        {WAVES.map((w) => (
          <g key={w.y} className="wave" style={{ ['--wave-dist' as string]: `${w.period}px`, animationDuration: `${w.dur}s` }}>
            <path d={wave(w.y, w.amp, w.period)} fill="none" stroke="#e9fffb" strokeOpacity={w.o} strokeWidth="1.1" />
          </g>
        ))}

        {/* cranes and ship */}
        <use href={`#${id('rig')}`} />

        {/* foam, bow wave and wake */}
        <g transform={RIG}>
          <g className="foam" fill="none" stroke="#f2fffd" strokeLinecap="round">
            <path d={`M344 ${WATERLINE + 2}q40 -5 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t60 0`} strokeWidth="2" strokeOpacity=".32" strokeDasharray="30 14 8 18" />
          </g>
          <path d={`M1100 ${WATERLINE + 3}C1150 ${WATERLINE - 6} 1190 ${WATERLINE - 14} 1232 ${WATERLINE - 4}C1210 ${WATERLINE + 6} 1170 ${WATERLINE + 12} 1120 ${WATERLINE + 12}Z`} fill="#fff" opacity=".34" className="bow-wave" />
          <path d={`M1130 ${WATERLINE + 6}C1170 ${WATERLINE + 2} 1210 ${WATERLINE - 2} 1250 ${WATERLINE + 8}`} stroke="#fff" strokeWidth="2" strokeOpacity=".5" fill="none" />
          <rect x="-400" y={WATERLINE - 1} width="760" height="9" fill={url('wake')} opacity=".7" />
        </g>

        {/* water in front of the hull */}
        <path
          d={`M0 ${WATERLINE + 5}q60 -7 120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0t120 0V680H0Z`}
          fill={url('seaFront')}
          className="sea-front"
        />
        {/* reflection: everything above, mirrored, rippled and faded */}
        <g mask={url('reflMask')} opacity=".34" aria-hidden="true">
          <g filter={url('ripple')}>
            <use href={`#${id('rig')}`} transform={`translate(0 ${WATERLINE * 2}) scale(1 -1)`} />
          </g>
        </g>
        {WAVES.slice(4).map((w) => (
          <g key={`f${w.y}`} className="wave" style={{ ['--wave-dist' as string]: `${w.period}px`, animationDuration: `${w.dur}s` }}>
            <path d={wave(w.y + 16, w.amp + 1, w.period, 30)} fill="none" stroke="#bfeee9" strokeOpacity={w.o * 0.9} strokeWidth="1.3" />
          </g>
        ))}

        {/* finishing: vignette and grain */}
        <rect width={W} height="680" fill="#000b1a" opacity="0.16" />
        <rect width={W} height="680" filter={url('grain')} opacity="0.5" />
      </g>
    </svg>
  )
}
