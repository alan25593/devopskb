'use client'

import { useState, useRef, useEffect } from 'react'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function ImageToolkit() {
  const [tab, setTab] = useState<'webp' | 'favicons'>('webp')
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('imagen')
  const [origSize, setOrigSize] = useState(0)
  const [origDims, setOrigDims] = useState({ w: 0, h: 0 })

  // Optimizer settings
  const [format, setFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp')
  const [quality, setQuality] = useState(82)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [outUrl, setOutUrl] = useState<string | null>(null)
  const [outSize, setOutSize] = useState(0)
  const [outDims, setOutDims] = useState({ w: 0, h: 0 })

  // Favicon settings
  const [favBg, setFavBg] = useState('#0D1117')
  const [favTransparent, setFavTransparent] = useState(true)
  const [favPadding, setFavPadding] = useState(10)
  const [favRadius, setFavRadius] = useState(20)

  const imgRef = useRef<HTMLImageElement | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOrigSize(file.size)
    setFileName(file.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setSourceUrl(dataUrl)
      const img = new Image()
      img.onload = () => {
        imgRef.current = img
        setOrigDims({ w: img.width, h: img.height })
        setMaxWidth(img.width)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const img = imgRef.current
    if (!img || !sourceUrl) return

    const targetW = Math.min(origDims.w, Math.max(16, maxWidth || origDims.w))
    const scale = targetW / (origDims.w || 1)
    const targetH = Math.round(origDims.h * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, targetW, targetH)

    canvas.toBlob(
      blob => {
        if (!blob) return
        setOutSize(blob.size)
        setOutDims({ w: targetW, h: targetH })
        const url = URL.createObjectURL(blob)
        setOutUrl(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      },
      format,
      quality / 100
    )
  }, [sourceUrl, origDims, format, quality, maxWidth])

  const downloadFaviconSize = (size: number, downloadName: string) => {
    const img = imgRef.current
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!favTransparent) {
      const r = (favRadius / 100) * (size / 2)
      ctx.fillStyle = favBg
      ctx.beginPath()
      ctx.roundRect(0, 0, size, size, r)
      ctx.fill()
    }

    const padPx = (favPadding / 100) * size
    const drawSize = size - padPx * 2
    ctx.drawImage(img, padPx, padPx, drawSize, drawSize)

    const link = document.createElement('a')
    link.download = downloadName
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const savingsPct =
    origSize > 0 && outSize > 0 ? Math.round(((origSize - outSize) / origSize) * 100) : 0

  const ext = format === 'image/webp' ? 'webp' : format === 'image/jpeg' ? 'jpg' : 'png'

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-gray-900 border border-gray-800 p-2 rounded-xl">
        <button
          type="button"
          onClick={() => setTab('webp')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'webp'
              ? 'bg-green-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          Compresor & Conversor WebP / PNG / JPG
        </button>
        <button
          type="button"
          onClick={() => setTab('favicons')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === 'favicons'
              ? 'bg-green-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          Generador de Pack de Favicons (16x16 a 512x512)
        </button>
      </div>

      {/* File Dropzone */}
      <label className="block w-full p-6 border-2 border-dashed border-gray-700 hover:border-green-500 rounded-xl bg-gray-900/60 text-center cursor-pointer transition-colors">
        <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
        <p className="text-sm font-semibold text-gray-200">
          {sourceUrl
            ? `Archivo cargado: ${fileName} (${origDims.w}×${origDims.h}px — ${formatBytes(origSize)})`
            : 'Hacé clic para seleccionar una imagen (PNG, JPG, SVG, WebP)'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Todo el procesamiento ocurre localmente mediante HTML5 Canvas sin subir archivos a ningún servidor.
        </p>
      </label>

      {sourceUrl && tab === 'webp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Ajustes de Optimización
            </h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Formato de Salida</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as 'image/webp' | 'image/jpeg' | 'image/png')}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100"
              >
                <option value="image/webp">WebP (Recomendado para Web / SEO)</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG (Lossless)</option>
              </select>
            </div>

            {format !== 'image/png' && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Calidad</span>
                  <span className="font-mono text-green-400">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={e => setQuality(parseInt(e.target.value, 10))}
                  className="w-full accent-green-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Ancho máximo (px)</label>
              <input
                type="number"
                value={maxWidth}
                onChange={e => setMaxWidth(parseInt(e.target.value, 10) || origDims.w)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
              />
            </div>

            <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Peso original:</span>
                <span className="font-mono text-gray-200">{formatBytes(origSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Peso optimizado ({outDims.w}×{outDims.h}):</span>
                <span className="font-mono font-bold text-green-400">{formatBytes(outSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reducción:</span>
                <span className={`font-mono font-bold ${savingsPct > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  {savingsPct > 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`}
                </span>
              </div>
            </div>

            {outUrl && (
              <a
                href={outUrl}
                download={`${fileName}.${ext}`}
                className="block w-full text-center py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                ⬇ Descargar {fileName}.{ext}
              </a>
            )}
          </div>

          <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-center min-h-[300px]">
            {outUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={outUrl}
                alt="Vista previa optimizada"
                className="max-h-80 max-w-full rounded-lg border border-gray-800 object-contain"
              />
            )}
          </div>
        </div>
      )}

      {sourceUrl && tab === 'favicons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Estilo del Icono
            </h2>

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={favTransparent}
                onChange={e => setFavTransparent(e.target.checked)}
                className="accent-green-500"
              />
              Fondo Transparente
            </label>

            {!favTransparent && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Color de fondo:</span>
                <input
                  type="color"
                  value={favBg}
                  onChange={e => setFavBg(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent"
                />
                <span className="font-mono text-xs text-gray-200">{favBg}</span>
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Margen interno (Padding)</span>
                <span className="font-mono text-gray-200">{favPadding}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={favPadding}
                onChange={e => setFavPadding(parseInt(e.target.value, 10))}
                className="w-full accent-green-500"
              />
            </div>

            {!favTransparent && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Bordes redondeados</span>
                  <span className="font-mono text-gray-200">{favRadius}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={favRadius}
                  onChange={e => setFavRadius(parseInt(e.target.value, 10))}
                  className="w-full accent-green-500"
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Descargar Pack de Favicons para Next.js / Web
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { size: 16, name: 'favicon-16x16.png', desc: 'Pestaña del navegador (16×16)' },
                { size: 32, name: 'favicon-32x32.png', desc: 'Pestaña Retina (32×32)' },
                { size: 180, name: 'apple-touch-icon.png', desc: 'iOS / Safari Home Screen (180×180)' },
                { size: 192, name: 'android-chrome-192x192.png', desc: 'PWA Android Icon (192×192)' },
                { size: 512, name: 'android-chrome-512x512.png', desc: 'PWA Splash Icon (512×512)' },
              ].map(item => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => downloadFaviconSize(item.size, item.name)}
                  className="p-3 bg-gray-950 hover:bg-gray-800 border border-gray-800 hover:border-green-600/70 rounded-xl text-left transition-all"
                >
                  <div className="text-xs font-mono font-bold text-green-400">{item.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
