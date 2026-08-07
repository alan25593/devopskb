'use client'

import { useState, useRef, useEffect } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

export default function QRGenerator() {
  const [value, setValue] = useState('https://knowdb.app')
  const [size, setSize] = useState(256)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [transparent, setTransparent] = useState(false)
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [includeMargin, setIncludeMargin] = useState(false)
  const [renderAs, setRenderAs] = useState<'canvas' | 'svg'>('canvas')

  const handleDownloadPNG = () => {
    if (renderAs === 'canvas') {
      const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement
      if (canvas) {
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = 'qrcode.png'
        link.href = url
        link.click()
      }
    } else {
       setRenderAs('canvas')
       setTimeout(() => {
          const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement
          if (canvas) {
            const url = canvas.toDataURL('image/png')
            const link = document.createElement('a')
            link.download = 'qrcode.png'
            link.href = url
            link.click()
          }
       }, 50)
    }
  }

  const handleDownloadSVG = () => {
    if (renderAs === 'svg') {
      const svg = document.getElementById('qr-svg')
      if (svg) {
        const serializer = new XMLSerializer()
        let source = serializer.serializeToString(svg)
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source)
        const link = document.createElement('a')
        link.download = 'qrcode.svg'
        link.href = url
        link.click()
      }
    } else {
        setRenderAs('svg')
        setTimeout(() => {
            const svg = document.getElementById('qr-svg')
            if (svg) {
                const serializer = new XMLSerializer()
                let source = serializer.serializeToString(svg)
                if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
                    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
                }
                source = '<?xml version="1.0" standalone="no"?>\r\n' + source
                const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source)
                const link = document.createElement('a')
                link.download = 'qrcode.svg'
                link.href = url
                link.click()
            }
        }, 50)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <div>
          <label htmlFor="qr-content" className="block text-sm font-medium text-gray-300 mb-1">
            Contenido (Texto o URL)
          </label>
          <textarea
            id="qr-content"
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-100 focus:outline-none focus:border-green-500 font-mono text-sm"
            placeholder="Ingresá texto o una URL..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Color del código (Frente)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-10 h-10 p-1 bg-gray-900 border border-gray-700 rounded cursor-pointer"
              />
              <span className="text-gray-400 font-mono text-sm">{fgColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Color de fondo
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                disabled={transparent}
                className="w-10 h-10 p-1 bg-gray-900 border border-gray-700 rounded cursor-pointer disabled:opacity-50"
              />
              <span className="text-gray-400 font-mono text-sm">{transparent ? 'Transparente' : bgColor}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
              className="rounded bg-gray-900 border-gray-700 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 h-4 w-4"
            />
            Fondo Transparente
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMargin}
              onChange={(e) => setIncludeMargin(e.target.checked)}
              className="rounded bg-gray-900 border-gray-700 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 h-4 w-4"
            />
            Incluir Margen (Quiet Zone)
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nivel de Corrección
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-gray-100 focus:outline-none focus:border-green-500 text-sm"
            >
              <option value="L">Low (L) - 7%</option>
              <option value="M">Medium (M) - 15%</option>
              <option value="Q">Quartile (Q) - 25%</option>
              <option value="H">High (H) - 30%</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tamaño (px)
            </label>
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              min={64}
              max={1024}
              step={16}
              className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-gray-100 focus:outline-none focus:border-green-500 text-sm"
            />
          </div>
        </div>
        
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Previsualización
            </label>
            <div className="flex gap-2">
                <button
                    onClick={() => setRenderAs('canvas')}
                    className={`px-3 py-1.5 text-xs rounded-md border ${renderAs === 'canvas' ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}
                >
                    Modo Canvas (PNG)
                </button>
                <button
                    onClick={() => setRenderAs('svg')}
                    className={`px-3 py-1.5 text-xs rounded-md border ${renderAs === 'svg' ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}
                >
                    Modo Vector (SVG)
                </button>
            </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 w-full flex flex-col items-center justify-center min-h-[350px]">
          {value ? (
            <div className="bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjY2NjIiAvPgo8cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjY2NjIiAvPjwvc3ZnPg==')] inline-block rounded-md overflow-hidden">
                {renderAs === 'canvas' ? (
                <QRCodeCanvas
                    id="qr-canvas"
                    value={value}
                    size={size}
                    bgColor={transparent ? 'rgba(0,0,0,0)' : bgColor}
                    fgColor={fgColor}
                    level={level}
                    includeMargin={includeMargin}
                />
                ) : (
                <QRCodeSVG
                    id="qr-svg"
                    value={value}
                    size={size}
                    bgColor={transparent ? 'rgba(0,0,0,0)' : bgColor}
                    fgColor={fgColor}
                    level={level}
                    includeMargin={includeMargin}
                />
                )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center">Ingresá texto para generar el QR</p>
          )}
        </div>
        
        <div className="flex flex-col gap-2 w-full mt-4">
            <button
            onClick={handleDownloadPNG}
            disabled={!value}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar PNG
            </button>
            <button
            onClick={handleDownloadSVG}
            disabled={!value}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar SVG
            </button>
        </div>
      </div>
    </div>
  )
}
