'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

interface RgbColor {
  r: number
  g: number
  b: number
  a: number
}

interface HslColor {
  h: number
  s: number
  l: number
  a: number
}

interface PresetColor {
  name: string
  hex: string
  desc: string
}

const PRESET_GROUPS: { group: string; colors: PresetColor[] }[] = [
  {
    group: 'WiresOps Brand',
    colors: [
      { name: 'Tiffany Teal', hex: '#2EC4B6', desc: 'Color corporativo principal' },
      { name: 'Electric Cyan', hex: '#38E8FF', desc: 'Acento logo y glow neón' },
      { name: 'Violet Theme', hex: '#9747FF', desc: 'Acento secundario y PWA' },
      { name: 'Dark Navy BG', hex: '#0D1117', desc: 'Fondo dark terminal' },
      { name: 'Surface Dark', hex: '#161B22', desc: 'Cards y superficies' },
      { name: 'Border Slate', hex: '#30363D', desc: 'Bordes y separadores' },
    ],
  },
  {
    group: 'Clientes WiresOps',
    colors: [
      { name: 'Dr. Durand Dorado', hex: '#C9A84C', desc: 'Breit & Asoc. acento' },
      { name: 'Dr. Durand Crema', hex: '#FAF7F2', desc: 'Fondo papel editorial' },
      { name: 'Dr. Durand Tinta', hex: '#17120B', desc: 'Texto tinta oscura' },
      { name: 'Greici Grace Gold', hex: '#7D6545', desc: 'Dorado boutique' },
      { name: 'Greici Grace Slate', hex: '#5E6974', desc: 'Gris neutro contrastante' },
      { name: 'Iván Diego Ladrillo', hex: '#A4522F', desc: 'Acento arquitectónico' },
      { name: 'Iván Diego Papel', hex: '#F3F1EC', desc: 'Fondo plano limpio' },
      { name: 'Iván Diego Tinta', hex: '#161616', desc: 'Tinta monocromática' },
      { name: 'Torta Galesa Dragón', hex: '#B3201F', desc: 'Rojo Ddraig tradicional' },
      { name: 'Torta Galesa Oro', hex: '#F7C52B', desc: 'Amarillo estilo pop' },
      { name: 'Torta Galesa Naranja', hex: '#E2552D', desc: 'Acento enérgico' },
      { name: 'Torta Galesa Choco', hex: '#2C1E18', desc: 'Fondo chocolate noche' },
    ],
  },
  {
    group: 'DevOps & Cloud Brands',
    colors: [
      { name: 'Kubernetes', hex: '#326CE5', desc: 'K8s Blue' },
      { name: 'Docker', hex: '#2496ED', desc: 'Docker Whale' },
      { name: 'Grafana', hex: '#F46800', desc: 'Grafana Orange' },
      { name: 'Prometheus', hex: '#E6522C', desc: 'Prometheus Flame' },
      { name: 'Terraform', hex: '#844FBA', desc: 'HashiCorp Purple' },
      { name: 'GitLab', hex: '#FC6D26', desc: 'GitLab Tanuki' },
      { name: 'Jenkins', hex: '#D24939', desc: 'Jenkins Butler' },
      { name: 'Cloudflare', hex: '#F38020', desc: 'Cloudflare Edge' },
      { name: 'AWS', hex: '#FF9900', desc: 'Amazon Web Services' },
      { name: 'Linux', hex: '#FCC624', desc: 'Linux Tux Yellow' },
    ],
  },
  {
    group: 'Tailwind Essentials',
    colors: [
      { name: 'Emerald 500', hex: '#10B981', desc: 'Verde terminal' },
      { name: 'Cyan 500', hex: '#06B6D4', desc: 'Cyan moderno' },
      { name: 'Blue 500', hex: '#3B82F6', desc: 'Azul UI estándar' },
      { name: 'Indigo 500', hex: '#6366F1', desc: 'Índigo digital' },
      { name: 'Violet 500', hex: '#8B5CF6', desc: 'Violeta UI' },
      { name: 'Rose 500', hex: '#F43F5E', desc: 'Rojo suave' },
      { name: 'Amber 500', hex: '#F59E0B', desc: 'Ámbar advertencia' },
      { name: 'Slate 900', hex: '#0F172A', desc: 'Fondo profundo' },
    ],
  },
]

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  lime: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  silver: '#c0c0c0',
  gray: '#808080',
  maroon: '#800000',
  olive: '#808000',
  green: '#008000',
  purple: '#800080',
  teal: '#008080',
  navy: '#000080',
  orange: '#ffa500',
  gold: '#ffd700',
  coral: '#ff7f50',
  tomato: '#ff6347',
  crimson: '#dc143c',
  darkcyan: '#008b8b',
  lightseagreen: '#20b2aa',
  turquoise: '#40e0d0',
  darkturquoise: '#00ced1',
  mediumturquoise: '#48d1cc',
  cadetblue: '#5f9ea0',
  steelblue: '#4682b4',
  deepskyblue: '#00bfff',
  dodgerblue: '#1e90ff',
  cornflowerblue: '#6495ed',
  royalblue: '#4169e1',
  slateblue: '#6a5acd',
  mediumpurple: '#9370db',
  rebeccapurple: '#663399',
  darkviolet: '#9400d3',
  indigo: '#4b0082',
  mediumvioletred: '#c71585',
  deeppink: '#ff1493',
  hotpink: '#ff69b4',
  lightcoral: '#f08080',
  salmon: '#fa8072',
  darkorange: '#ff8c00',
  darkkhaki: '#bdb76b',
  springgreen: '#00ff7f',
  mediumspringgreen: '#00fa9a',
  seagreen: '#2e8b57',
  forestgreen: '#228b22',
  darkslategray: '#2f4f4f',
  slategray: '#708090',
  lightslategray: '#778899',
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

function hexToRgb(hex: string): RgbColor | null {
  let cleaned = hex.trim().replace(/^#/, '')
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('') + 'ff'
  } else if (cleaned.length === 4) {
    cleaned = cleaned.split('').map(c => c + c).join('')
  } else if (cleaned.length === 6) {
    cleaned = cleaned + 'ff'
  } else if (cleaned.length !== 8) {
    return null
  }

  const num = parseInt(cleaned, 16)
  if (isNaN(num)) return null

  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: Math.round(((num & 255) / 255) * 100) / 100,
  }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function rgbToHexAlpha({ r, g, b, a }: RgbColor): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  const alphaHex = toHex(Math.round(clamp(a, 0, 1) * 255))
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`.toUpperCase()
}

function rgbToHsl({ r, g, b, a }: RgbColor): HslColor {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6
        break
      case gNorm:
        h = ((bNorm - rNorm) / delta + 2) / 6
        break
      case bNorm:
        h = ((rNorm - gNorm) / delta + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a,
  }
}

function hslToRgb({ h, s, l, a }: HslColor): RgbColor {
  const hNorm = (h % 360 + 360) % 360 / 360
  const sNorm = clamp(s, 0, 100) / 100
  const lNorm = clamp(l, 0, 100) / 100

  if (sNorm === 0) {
    const val = Math.round(lNorm * 255)
    return { r: val, g: val, b: val, a }
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tNorm = t
    if (tNorm < 0) tNorm += 1
    if (tNorm > 1) tNorm -= 1
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm
    if (tNorm < 1 / 2) return q
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6
    return p
  }

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
  const p = 2 * lNorm - q

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
    a,
  }
}

function rgbToHsv({ r, g, b }: RgbColor): { h: number; s: number; v: number } {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rNorm) h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6
    else if (max === gNorm) h = ((bNorm - rNorm) / delta + 2) / 6
    else h = ((rNorm - gNorm) / delta + 4) / 6
  }

  const s = max === 0 ? 0 : delta / max

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(max * 100),
  }
}

function rgbToCmyk({ r, g, b }: RgbColor): { c: number; m: number; y: number; k: number } {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const k = 1 - Math.max(rNorm, gNorm, bNorm)
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 }
  }

  const c = (1 - rNorm - k) / (1 - k)
  const m = (1 - gNorm - k) / (1 - k)
  const y = (1 - bNorm - k) / (1 - k)

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  }
}

function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

function findClosestColorName(r: number, g: number, b: number): { name: string; hex: string; exact: boolean } {
  let closestName = 'Custom'
  let closestHex = ''
  let minDistance = Infinity

  for (const [name, hex] of Object.entries(NAMED_COLORS)) {
    const rgb = hexToRgb(hex)
    if (!rgb) continue
    // Euclidean distance in RGB color space
    const dist = Math.sqrt(
      Math.pow(r - rgb.r, 2) + Math.pow(g - rgb.g, 2) + Math.pow(b - rgb.b, 2)
    )
    if (dist < minDistance) {
      minDistance = dist
      closestName = name
      closestHex = hex
    }
  }

  return {
    name: closestName,
    hex: closestHex,
    exact: minDistance < 5,
  }
}

export default function ColorPicker() {
  // Default to WiresOps Brand color #2EC4B6
  const [rgb, setRgb] = useState<RgbColor>({ r: 46, g: 196, b: 182, a: 1 })
  const [hexInput, setHexInput] = useState('#2EC4B6')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'presets' | 'harmonies' | 'shades' | 'contrast'>('presets')
  const [history, setHistory] = useState<string[]>(['#2EC4B6', '#38E8FF', '#9747FF', '#0D1117'])
  const [hasEyeDropper, setHasEyeDropper] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      setHasEyeDropper(true)
    }
  }, [])

  const hexValue = useMemo(() => rgbToHex(rgb), [rgb])
  const hexAlphaValue = useMemo(() => rgbToHexAlpha(rgb), [rgb])
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb])
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb])
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb])

  const luminance = useMemo(() => getLuminance(rgb.r, rgb.g, rgb.b), [rgb])
  const whiteContrast = useMemo(() => getContrastRatio(luminance, 1), [luminance])
  const blackContrast = useMemo(() => getContrastRatio(luminance, 0), [luminance])
  const closestColor = useMemo(() => findClosestColorName(rgb.r, rgb.g, rgb.b), [rgb])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => {
      setCopiedKey(current => (current === key ? null : current))
    }, 1800)
  }

  const addToHistory = (hex: string) => {
    setHistory(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== hex.toLowerCase())
      return [hex, ...filtered].slice(0, 12)
    })
  }

  const applyColor = (newRgb: RgbColor, updateHexText: boolean = true) => {
    setRgb(newRgb)
    const newHex = rgbToHex(newRgb)
    if (updateHexText) {
      setHexInput(newHex)
    }
    addToHistory(newHex)
  }

  const handleHexInputChange = (val: string) => {
    setHexInput(val)
    const parsed = hexToRgb(val)
    if (parsed) {
      setRgb(parsed)
      addToHistory(rgbToHex(parsed))
    }
  }

  const handleRgbChannelChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const updated = { ...rgb, [channel]: clamp(val, 0, 255) }
    applyColor(updated)
  }

  const handleHslChannelChange = (channel: 'h' | 's' | 'l', val: number) => {
    const updatedHsl = {
      ...hsl,
      [channel]: channel === 'h' ? clamp(val, 0, 360) : clamp(val, 0, 100),
    }
    const updatedRgb = hslToRgb(updatedHsl)
    applyColor(updatedRgb)
  }

  const handleAlphaChange = (val: number) => {
    const updated = { ...rgb, a: clamp(val, 0, 1) }
    setRgb(updated)
  }

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = hexToRgb(e.target.value)
    if (parsed) {
      applyColor({ ...parsed, a: rgb.a })
    }
  }

  const handleEyeDropper = async () => {
    if (typeof window === 'undefined') return
    try {
      const EyeDropperClass = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
      if (EyeDropperClass) {
        const dropper = new EyeDropperClass()
        const result = await dropper.open()
        if (result?.sRGBHex) {
          const parsed = hexToRgb(result.sRGBHex)
          if (parsed) {
            applyColor({ ...parsed, a: rgb.a })
          }
        }
      }
    } catch {
      // User canceled eyedropper or unsupported
    }
  }

  // Shades generator (from 5% to 95% lightness)
  const shades = useMemo(() => {
    const stops = [95, 85, 75, 65, 55, 45, 35, 25, 15, 8]
    return stops.map(l => {
      const color = hslToRgb({ h: hsl.h, s: hsl.s, l, a: 1 })
      return {
        lightness: l,
        hex: rgbToHex(color),
        rgb: color,
      }
    })
  }, [hsl.h, hsl.s])

  // Harmonies generator
  const harmonies = useMemo(() => {
    const getHslColor = (hOffset: number) => {
      const newH = (hsl.h + hOffset + 360) % 360
      const c = hslToRgb({ h: newH, s: hsl.s, l: hsl.l, a: 1 })
      return { h: newH, hex: rgbToHex(c), rgb: c }
    }

    return {
      complementary: getHslColor(180),
      analogous1: getHslColor(-30),
      analogous2: getHslColor(30),
      triadic1: getHslColor(120),
      triadic2: getHslColor(240),
      split1: getHslColor(150),
      split2: getHslColor(210),
    }
  }, [hsl])

  const formats = [
    { key: 'hex', label: 'HEX', value: hexValue },
    { key: 'hex-lower', label: 'HEX (minúscula)', value: hexValue.toLowerCase() },
    { key: 'hex-alpha', label: 'HEX con Alpha', value: hexAlphaValue },
    { key: 'rgb', label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
    { key: 'rgba', label: 'RGBA', value: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})` },
    { key: 'hsl', label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
    { key: 'hsla', label: 'HSLA', value: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${rgb.a})` },
    { key: 'hsv', label: 'HSV / HSB', value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
    { key: 'cmyk', label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
    { key: 'tailwind-bg', label: 'Tailwind (Fondo)', value: `bg-[${hexValue}]` },
    { key: 'tailwind-text', label: 'Tailwind (Texto)', value: `text-[${hexValue}]` },
    { key: 'css-var', label: 'CSS Variable', value: `--color-brand: ${hexValue};` },
  ]

  const optimalTextColor = whiteContrast >= 4.5 ? '#FFFFFF' : '#000000'

  return (
    <div className="space-y-8">
      {/* Top Banner / Color Visualizer Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:p-6 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Live Color Swatch & Quick Action */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div
              className="relative w-full h-44 md:h-52 rounded-xl border border-gray-700/80 shadow-inner flex flex-col justify-between p-4 transition-colors duration-200 overflow-hidden"
              style={{
                backgroundColor: hexValue,
                color: optimalTextColor,
              }}
            >
              {/* Checkerboard background for alpha transparency preview */}
              {rgb.a < 1 && (
                <div
                  className="absolute inset-0 -z-10 opacity-30"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  }}
                />
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md backdrop-blur-md bg-black/40 text-white border border-white/10">
                  {hexValue}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded backdrop-blur-md bg-black/40 text-white/90 border border-white/10">
                  {Math.round(rgb.a * 100)}% opacidad
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold tracking-wide capitalize drop-shadow-sm">
                  {closestColor.exact ? closestColor.name : `Cercano a ${closestColor.name}`}
                </p>
                <p className="text-xs opacity-85 font-mono">
                  rgb({rgb.r}, {rgb.g}, {rgb.b})
                </p>
              </div>
            </div>

            {/* Input Picker Bar */}
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer flex-shrink-0 group">
                <input
                  type="color"
                  value={hexValue}
                  onChange={handleNativeColorChange}
                  className="sr-only"
                />
                <div
                  className="w-11 h-11 rounded-lg border-2 border-gray-700 group-hover:border-green-500 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: hexValue }}
                  title="Abrir selector nativo del sistema"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={optimalTextColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m4.93 4.93 4.24 4.24"></path>
                    <path d="m14.83 9.17 4.24-4.24"></path>
                    <path d="m14.83 14.83 4.24 4.24"></path>
                    <path d="m9.17 14.83-4.24 4.24"></path>
                  </svg>
                </div>
              </label>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={hexInput}
                  onChange={e => handleHexInputChange(e.target.value)}
                  placeholder="#2EC4B6 o nombre"
                  className="w-full bg-gray-950 border border-gray-700 focus:border-green-500 rounded-lg py-2.5 px-3 text-sm font-mono text-gray-100 placeholder:text-gray-500 outline-none transition-colors"
                />
              </div>

              {hasEyeDropper && (
                <button
                  type="button"
                  onClick={handleEyeDropper}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-green-500 text-gray-200 text-xs font-medium rounded-lg transition-colors"
                  title="Pipeta: Seleccionar color de cualquier parte de la pantalla"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2 22 1-1h3l9-9"></path>
                    <path d="M3 21v-3l9-9"></path>
                    <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"></path>
                  </svg>
                  <span className="hidden sm:inline">Pipeta</span>
                </button>
              )}
            </div>

            {/* Quick Recent History */}
            {history.length > 0 && (
              <div className="pt-2 border-t border-gray-800/80 flex items-center gap-2">
                <span className="text-[11px] text-gray-500 font-medium">Recientes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {history.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleHexInputChange(col)}
                      className="w-6 h-6 rounded-md border border-gray-700 hover:scale-110 transition-transform shadow-sm"
                      style={{ backgroundColor: col }}
                      title={`Usar ${col}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sliders & Fine Tuning (RGB / HSL / Alpha) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Ajuste Fino de Canales
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* RGB Channels */}
                <div className="space-y-3 bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">Canales RGB (0 - 255)</span>
                  
                  {/* R */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-red-400 w-4">R</span>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={rgb.r}
                      onChange={e => handleRgbChannelChange('r', parseInt(e.target.value, 10))}
                      className="flex-1 accent-red-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={rgb.r}
                      onChange={e => handleRgbChannelChange('r', parseInt(e.target.value, 10) || 0)}
                      className="w-12 bg-gray-900 border border-gray-700 text-center font-mono text-xs py-1 rounded text-gray-200"
                    />
                  </div>

                  {/* G */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-green-400 w-4">G</span>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={rgb.g}
                      onChange={e => handleRgbChannelChange('g', parseInt(e.target.value, 10))}
                      className="flex-1 accent-green-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={rgb.g}
                      onChange={e => handleRgbChannelChange('g', parseInt(e.target.value, 10) || 0)}
                      className="w-12 bg-gray-900 border border-gray-700 text-center font-mono text-xs py-1 rounded text-gray-200"
                    />
                  </div>

                  {/* B */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-blue-400 w-4">B</span>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={rgb.b}
                      onChange={e => handleRgbChannelChange('b', parseInt(e.target.value, 10))}
                      className="flex-1 accent-blue-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={rgb.b}
                      onChange={e => handleRgbChannelChange('b', parseInt(e.target.value, 10) || 0)}
                      className="w-12 bg-gray-900 border border-gray-700 text-center font-mono text-xs py-1 rounded text-gray-200"
                    />
                  </div>
                </div>

                {/* HSL Channels */}
                <div className="space-y-3 bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">Canales HSL</span>
                  
                  {/* H */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-yellow-400 w-4">H</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={hsl.h}
                      onChange={e => handleHslChannelChange('h', parseInt(e.target.value, 10))}
                      className="flex-1 h-1.5 rounded-lg cursor-pointer"
                      style={{
                        background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                      }}
                    />
                    <span className="w-12 text-center font-mono text-xs text-gray-300">{hsl.h}°</span>
                  </div>

                  {/* S */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-purple-400 w-4">S</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={hsl.s}
                      onChange={e => handleHslChannelChange('s', parseInt(e.target.value, 10))}
                      className="flex-1 accent-purple-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-12 text-center font-mono text-xs text-gray-300">{hsl.s}%</span>
                  </div>

                  {/* L */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-gray-300 w-4">L</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={hsl.l}
                      onChange={e => handleHslChannelChange('l', parseInt(e.target.value, 10))}
                      className="flex-1 accent-gray-400 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                    />
                    <span className="w-12 text-center font-mono text-xs text-gray-300">{hsl.l}%</span>
                  </div>
                </div>
              </div>

              {/* Alpha Channel */}
              <div className="mt-3 bg-gray-950/60 p-3 rounded-lg border border-gray-800 flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-gray-400 w-16">Opacidad</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={rgb.a}
                  onChange={e => handleAlphaChange(parseFloat(e.target.value))}
                  className="flex-1 accent-green-400 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                />
                <span className="w-12 text-right font-mono text-xs text-gray-300">
                  {Math.round(rgb.a * 100)}%
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Output Formats Grid (Click to copy) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            Formatos & Códigos de Salida
            <span className="text-xs text-gray-500 font-normal">
              (Hacé clic en cualquier tarjeta para copiar)
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {formats.map(fmt => {
            const isCopied = copiedKey === fmt.key
            return (
              <button
                key={fmt.key}
                type="button"
                onClick={() => copyToClipboard(fmt.value, fmt.key)}
                className="group relative flex flex-col items-start p-3.5 bg-gray-900 border border-gray-800 hover:border-green-600/70 rounded-xl transition-all text-left hover:shadow-md hover:bg-gray-850"
              >
                <div className="w-full flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {fmt.label}
                  </span>
                  <span className={`text-[11px] font-medium transition-colors ${isCopied ? 'text-green-400 font-bold' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {isCopied ? '¡Copiado!' : 'Copiar'}
                  </span>
                </div>
                <div className="w-full font-mono text-sm text-gray-100 font-medium truncate select-all">
                  {fmt.value}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Tabs Section: Presets, Harmonies, Shades, WCAG Accessibility */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'presets'
                ? 'border-green-500 text-green-400 bg-gray-900/60'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Paletas Predefinidas (WiresOps & Clientes)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('harmonies')}
            className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'harmonies'
                ? 'border-green-500 text-green-400 bg-gray-900/60'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            Armonías del Color
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shades')}
            className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'shades'
                ? 'border-green-500 text-green-400 bg-gray-900/60'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Escala de Tonos & Sombras
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contrast')}
            className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'contrast'
                ? 'border-green-500 text-green-400 bg-gray-900/60'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Contraste & Accesibilidad WCAG
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 md:p-6">
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-8">
              {PRESET_GROUPS.map(group => (
                <div key={group.group}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {group.group}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {group.colors.map(preset => {
                      const isCurrent = hexValue.toUpperCase() === preset.hex.toUpperCase()
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleHexInputChange(preset.hex)}
                          className={`group p-2.5 rounded-lg border text-left transition-all ${
                            isCurrent
                              ? 'border-green-500 bg-gray-800 ring-2 ring-green-500/30'
                              : 'border-gray-800 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-800/50'
                          }`}
                        >
                          <div
                            className="w-full h-12 rounded-md mb-2 shadow-sm border border-black/20 flex items-center justify-center"
                            style={{ backgroundColor: preset.hex }}
                          >
                            {isCurrent && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={optimalTextColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-gray-200 truncate">
                            {preset.name}
                          </div>
                          <div className="text-[11px] font-mono text-gray-400 truncate">
                            {preset.hex}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">
                            {preset.desc}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: HARMONIES */}
          {activeTab === 'harmonies' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-400">
                Armonías calculadas a partir del tono base actual (<span className="font-mono text-gray-200">{hexValue}</span>). Hacé clic en cualquier swatch para cargarlo como color principal.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Base & Complementario */}
                <div className="bg-gray-950/60 border border-gray-800 p-4 rounded-xl">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">
                    Complementario (180°)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleHexInputChange(hexValue)}
                      className="flex-1 p-2 rounded-lg border border-gray-700 text-center"
                    >
                      <div className="h-14 rounded-md mb-2" style={{ backgroundColor: hexValue }} />
                      <span className="text-[11px] font-mono text-gray-300">Base</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHexInputChange(harmonies.complementary.hex)}
                      className="flex-1 p-2 rounded-lg border border-gray-700 hover:border-green-500 text-center transition-colors"
                    >
                      <div className="h-14 rounded-md mb-2 shadow-sm" style={{ backgroundColor: harmonies.complementary.hex }} />
                      <span className="text-[11px] font-mono text-gray-300">{harmonies.complementary.hex}</span>
                    </button>
                  </div>
                </div>

                {/* Análogos */}
                <div className="bg-gray-950/60 border border-gray-800 p-4 rounded-xl">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">
                    Análogos (±30°)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleHexInputChange(harmonies.analogous1.hex)}
                      className="flex-1 p-2 rounded-lg border border-gray-700 hover:border-green-500 text-center transition-colors"
                    >
                      <div className="h-14 rounded-md mb-2" style={{ backgroundColor: harmonies.analogous1.hex }} />
                      <span className="text-[11px] font-mono text-gray-300">{harmonies.analogous1.hex}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHexInputChange(harmonies.analogous2.hex)}
                      className="flex-1 p-2 rounded-lg border border-gray-700 hover:border-green-500 text-center transition-colors"
                    >
                      <div className="h-14 rounded-md mb-2" style={{ backgroundColor: harmonies.analogous2.hex }} />
                      <span className="text-[11px] font-mono text-gray-300">{harmonies.analogous2.hex}</span>
                    </button>
                  </div>
                </div>

                {/* Triádicos */}
                <div className="bg-gray-950/60 border border-gray-800 p-4 rounded-xl">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">
                    Triádicos (120° / 240°)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleHexInputChange(harmonies.triadic1.hex)}
                      className="flex-1 p-2 rounded-lg border border-gray-700 hover:border-green-500 text-center transition-colors"
                    >
                      <div className="h-14 rounded-md mb-2" style={{ backgroundColor: harmonies.triadic1.hex }} />
                      <span className="text-[11px] font-mono text-gray-300">{harmonies.triadic1.hex}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHexInputChange(harmonies.triadic2.hex)}
                      className="flex-1 p-2 rounded-lg border border-gray-700 hover:border-green-500 text-center transition-colors"
                    >
                      <div className="h-14 rounded-md mb-2" style={{ backgroundColor: harmonies.triadic2.hex }} />
                      <span className="text-[11px] font-mono text-gray-300">{harmonies.triadic2.hex}</span>
                    </button>
                  </div>
                </div>

                {/* Split Complementario */}
                <div className="bg-gray-950/60 border border-gray-800 p-4 rounded-xl">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">
                    Split-Complementario (150° / 210°)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleHexInputChange(harmonies.split1.hex)}
                      className="flex-1 p-2 rounded-lg border border-gray-700 hover:border-green-500 text-center transition-colors"
                    >
                      <div className="h-14 rounded-md mb-2" style={{ backgroundColor: harmonies.split1.hex }} />
                      <span className="text-[11px] font-mono text-gray-300">{harmonies.split1.hex}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHexInputChange(harmonies.split2.hex)}
                      className="flex-1 p-2 rounded-lg border border-gray-700 hover:border-green-500 text-center transition-colors"
                    >
                      <div className="h-14 rounded-md mb-2" style={{ backgroundColor: harmonies.split2.hex }} />
                      <span className="text-[11px] font-mono text-gray-300">{harmonies.split2.hex}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHADES */}
          {activeTab === 'shades' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Generador de escala monocromática (tints y shades) para construir temas UI compatibles con Tailwind.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {shades.map((shade, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleHexInputChange(shade.hex)}
                    className="p-2 bg-gray-950/80 rounded-lg border border-gray-800 hover:border-green-500 text-center transition-all group"
                  >
                    <div
                      className="w-full h-16 rounded-md mb-2 border border-black/20 shadow-sm"
                      style={{ backgroundColor: shade.hex }}
                    />
                    <div className="text-[10px] font-semibold text-gray-400">
                      {1000 - (idx + 1) * 100 > 0 ? 1000 - (idx + 1) * 100 : 50}
                    </div>
                    <div className="text-[11px] font-mono text-gray-300 group-hover:text-green-400 truncate">
                      {shade.hex}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: WCAG CONTRAST */}
          {activeTab === 'contrast' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-400">
                Evaluación del ratio de contraste según las normas de accesibilidad <strong>WCAG 2.1</strong> (Requisitos mínimos: AA 4.5:1 para texto normal, 3:1 para títulos o texto grande).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* vs White */}
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-200">Sobre Blanco (#FFFFFF)</span>
                    <span className="font-mono text-lg font-bold text-gray-100">
                      {whiteContrast}:1
                    </span>
                  </div>

                  <div
                    className="p-4 rounded-lg border border-gray-300 text-center transition-colors"
                    style={{ backgroundColor: '#ffffff', color: hexValue }}
                  >
                    <p className="font-bold text-base">Texto con este color sobre fondo blanco</p>
                    <p className="text-xs mt-1">Lorem ipsum dolor sit amet de muestra</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded border flex items-center justify-between ${whiteContrast >= 4.5 ? 'border-green-800 bg-green-950/30 text-green-400' : 'border-red-800 bg-red-950/30 text-red-400'}`}>
                      <span>AA Normal (4.5:1)</span>
                      <span className="font-bold">{whiteContrast >= 4.5 ? '✓ PASA' : '✕ FALLA'}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center justify-between ${whiteContrast >= 3.0 ? 'border-green-800 bg-green-950/30 text-green-400' : 'border-red-800 bg-red-950/30 text-red-400'}`}>
                      <span>AA Grande (3.0:1)</span>
                      <span className="font-bold">{whiteContrast >= 3.0 ? '✓ PASA' : '✕ FALLA'}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center justify-between ${whiteContrast >= 7.0 ? 'border-green-800 bg-green-950/30 text-green-400' : 'border-red-800 bg-red-950/30 text-red-400'}`}>
                      <span>AAA Normal (7.0:1)</span>
                      <span className="font-bold">{whiteContrast >= 7.0 ? '✓ PASA' : '✕ FALLA'}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center justify-between ${whiteContrast >= 4.5 ? 'border-green-800 bg-green-950/30 text-green-400' : 'border-red-800 bg-red-950/30 text-red-400'}`}>
                      <span>AAA Grande (4.5:1)</span>
                      <span className="font-bold">{whiteContrast >= 4.5 ? '✓ PASA' : '✕ FALLA'}</span>
                    </div>
                  </div>
                </div>

                {/* vs Black */}
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-200">Sobre Negro (#000000)</span>
                    <span className="font-mono text-lg font-bold text-gray-100">
                      {blackContrast}:1
                    </span>
                  </div>

                  <div
                    className="p-4 rounded-lg border border-gray-800 text-center transition-colors"
                    style={{ backgroundColor: '#000000', color: hexValue }}
                  >
                    <p className="font-bold text-base">Texto con este color sobre fondo negro</p>
                    <p className="text-xs mt-1">Lorem ipsum dolor sit amet de muestra</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded border flex items-center justify-between ${blackContrast >= 4.5 ? 'border-green-800 bg-green-950/30 text-green-400' : 'border-red-800 bg-red-950/30 text-red-400'}`}>
                      <span>AA Normal (4.5:1)</span>
                      <span className="font-bold">{blackContrast >= 4.5 ? '✓ PASA' : '✕ FALLA'}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center justify-between ${blackContrast >= 3.0 ? 'border-green-800 bg-green-950/30 text-green-400' : 'border-red-800 bg-red-950/30 text-red-400'}`}>
                      <span>AA Grande (3.0:1)</span>
                      <span className="font-bold">{blackContrast >= 3.0 ? '✓ PASA' : '✕ FALLA'}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center justify-between ${blackContrast >= 7.0 ? 'border-green-800 bg-green-950/30 text-green-400' : 'border-red-800 bg-red-950/30 text-red-400'}`}>
                      <span>AAA Normal (7.0:1)</span>
                      <span className="font-bold">{blackContrast >= 7.0 ? '✓ PASA' : '✕ FALLA'}</span>
                    </div>
                    <div className={`p-2 rounded border flex items-center justify-between ${blackContrast >= 4.5 ? 'border-green-800 bg-green-950/30 text-green-400' : 'border-red-800 bg-red-950/30 text-red-400'}`}>
                      <span>AAA Grande (4.5:1)</span>
                      <span className="font-bold">{blackContrast >= 4.5 ? '✓ PASA' : '✕ FALLA'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
