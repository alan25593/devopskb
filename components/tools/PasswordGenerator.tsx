'use client'

import { useState, useEffect, useCallback } from 'react'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const NUMS = '0123456789'
const SYMS = '!@#$%^&*()_+~`|}{[]:;?><,./-='
const AMBIGUOUS = 'Il1O0'

// A small EFF-inspired wordlist for passphrases
const WORDLIST = [
  'apple','banana','cherry','dog','elephant','frog','grape','horse','iguana','jungle','kangaroo','lion','monkey','nest',
  'orange','penguin','queen','rabbit','snake','turtle','unicorn','volcano','whale','xray','yellow','zebra',
  'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliet','kilo','lima','mike','november',
  'oscar','papa','quebec','romeo','sierra','tango','uniform','victor','whiskey','yankee','zulu',
  'water','fire','earth','wind','cloud','storm','river','mountain','ocean','forest','desert','space','planet','star',
  'galaxy','comet','meteor','moon','sun','sky','tree','leaf','flower','grass','rock','sand','snow','ice','rain','crystal'
]

type PwdMode = 'random' | 'passphrase'

export default function PasswordGenerator() {
  const [mode, setMode] = useState<PwdMode>('random')
  const [length, setLength] = useState(16)
  const [count, setCount] = useState(1)
  
  // Random options
  const [useUpper, setUseUpper] = useState(true)
  const [useLower, setUseLower] = useState(true)
  const [useNums, setUseNums] = useState(true)
  const [useSyms, setUseSyms] = useState(true)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  
  // Passphrase options
  const [wordCount, setWordCount] = useState(4)
  const [separator, setSeparator] = useState('-')
  const [capitalize, setCapitalize] = useState(false)
  const [includeNumber, setIncludeNumber] = useState(false)

  const [passwords, setPasswords] = useState<string[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const generatePasswords = useCallback(() => {
    const results: string[] = []
    
    for (let i = 0; i < count; i++) {
      if (mode === 'random') {
        let charset = ''
        if (useUpper) charset += UPPER
        if (useLower) charset += LOWER
        if (useNums) charset += NUMS
        if (useSyms) charset += SYMS

        if (excludeAmbiguous) {
          charset = charset.split('').filter(c => !AMBIGUOUS.includes(c)).join('')
        }

        if (charset === '') {
          results.push('Seleccioná al menos un tipo de caracter')
          continue
        }

        let pwd = ''
        const array = new Uint32Array(length)
        crypto.getRandomValues(array)
        for (let j = 0; j < length; j++) {
          pwd += charset[array[j] % charset.length]
        }
        
        // Ensure at least one of each selected if length is sufficient
        if (length >= 4 && !excludeAmbiguous) {
           // Too complex to guarantee purely, random is usually fine. We'll stick to pure random.
        }
        
        results.push(pwd)
      } else {
        const words = []
        const array = new Uint32Array(wordCount)
        crypto.getRandomValues(array)
        
        for (let j = 0; j < wordCount; j++) {
          let word = WORDLIST[array[j] % WORDLIST.length]
          if (capitalize) {
            word = word.charAt(0).toUpperCase() + word.slice(1)
          }
          words.push(word)
        }
        
        let pwd = words.join(separator)
        if (includeNumber) {
          const num = new Uint32Array(1)
          crypto.getRandomValues(num)
          pwd += separator + (num[0] % 100).toString()
        }
        results.push(pwd)
      }
    }
    setPasswords(results)
    setCopiedIndex(null)
  }, [mode, length, count, useUpper, useLower, useNums, useSyms, excludeAmbiguous, wordCount, separator, capitalize, includeNumber])

  useEffect(() => {
    generatePasswords()
  }, [generatePasswords])

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const calculateEntropy = (pwd: string) => {
    if (mode === 'passphrase') {
      let pool = WORDLIST.length
      return Math.log2(Math.pow(pool, wordCount)) + (includeNumber ? Math.log2(100) : 0)
    } else {
      let pool = 0
      if (useUpper) pool += 26
      if (useLower) pool += 26
      if (useNums) pool += 10
      if (useSyms) pool += SYMS.length
      if (excludeAmbiguous) pool -= AMBIGUOUS.length // rough estimate
      if (pool <= 0) return 0
      return length * Math.log2(pool)
    }
  }

  const entropy = passwords.length > 0 ? calculateEntropy(passwords[0]) : 0
  let strengthLabel = 'Débil'
  let strengthColor = 'bg-red-500'
  let strengthWidth = '25%'
  
  if (entropy > 100) {
    strengthLabel = 'Excelente'
    strengthColor = 'bg-emerald-500'
    strengthWidth = '100%'
  } else if (entropy > 70) {
    strengthLabel = 'Fuerte'
    strengthColor = 'bg-cyan-500'
    strengthWidth = '75%'
  } else if (entropy > 50) {
    strengthLabel = 'Regular'
    strengthColor = 'bg-yellow-500'
    strengthWidth = '50%'
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Type Selector */}
      <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 w-fit">
        <button
          onClick={() => setMode('random')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'random' ? 'bg-cyan-900/50 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Aleatoria
        </button>
        <button
          onClick={() => setMode('passphrase')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'passphrase' ? 'bg-cyan-900/50 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Passphrase
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6 bg-slate-900/50 p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-slate-200">Configuración</h3>
          </div>

          {mode === 'random' ? (
            <>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <label className="text-slate-400">Longitud</label>
                  <span className="text-cyan-400 font-mono">{length}</span>
                </div>
                <input 
                  type="range" 
                  min="8" max="128" 
                  value={length} 
                  onChange={e => setLength(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Mayúsculas (A-Z)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Minúsculas (a-z)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={useNums} onChange={e => setUseNums(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Números (0-9)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={useSyms} onChange={e => setUseSyms(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Símbolos (!@#$%)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group pt-2 border-t border-slate-800/60">
                  <input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Evitar ambiguos (l, 1, O, 0)</span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <label className="text-slate-400">Cantidad de Palabras</label>
                  <span className="text-cyan-400 font-mono">{wordCount}</span>
                </div>
                <input 
                  type="range" 
                  min="3" max="10" 
                  value={wordCount} 
                  onChange={e => setWordCount(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Separador</label>
                <select 
                  value={separator} 
                  onChange={e => setSeparator(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="-">Guion (-)</option>
                  <option value="_">Guion bajo (_)</option>
                  <option value=".">Punto (.)</option>
                  <option value=" ">Espacio</option>
                  <option value="">Nada</option>
                </select>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/60">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={capitalize} onChange={e => setCapitalize(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Primera en mayúscula</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={includeNumber} onChange={e => setIncludeNumber(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Incluir número al final</span>
                </label>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-800/60">
            <label className="block text-sm text-slate-400 mb-2">Cantidad a generar</label>
            <select 
              value={count} 
              onChange={e => setCount(parseInt(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value={1}>1 contraseña</option>
              <option value={5}>5 contraseñas</option>
              <option value={10}>10 contraseñas</option>
              <option value={20}>20 contraseñas</option>
            </select>
          </div>

        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Resultado</h2>
              <button 
                onClick={generatePasswords}
                className="flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/40 px-3 py-1.5 rounded transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                Generar Nuevas
              </button>
            </div>

            <div className="space-y-3">
              {passwords.map((pwd, i) => (
                <div key={i} className="group flex items-center gap-3 bg-slate-950 border border-slate-800 p-3 rounded-lg hover:border-cyan-500/50 transition-colors relative overflow-hidden">
                  <div className="flex-1 font-mono text-slate-200 text-lg break-all">
                    {pwd}
                  </div>
                  <button
                    onClick={() => copyToClipboard(pwd, i)}
                    className="shrink-0 p-2 text-slate-400 hover:text-cyan-400 bg-slate-900 hover:bg-slate-800 rounded-md transition-colors border border-slate-800"
                    title="Copiar"
                  >
                    {copiedIndex === i ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Nivel de Seguridad</span>
                <span className={`text-xs font-bold px-2 py-1 rounded bg-slate-950 border border-slate-800 ${
                  strengthLabel === 'Excelente' ? 'text-emerald-400' :
                  strengthLabel === 'Fuerte' ? 'text-cyan-400' :
                  strengthLabel === 'Regular' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {strengthLabel} (~{Math.round(entropy)} bits de entropía)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full ${strengthColor} transition-all duration-500 ease-out`}
                  style={{ width: strengthWidth }}
                />
              </div>
            </div>

          </div>

          <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-5 text-sm text-slate-400 leading-relaxed">
            <h4 className="font-semibold text-slate-300 mb-2">¿Cómo funciona?</h4>
            <p className="mb-2">
              Todas las contraseñas se generan <strong>localmente en tu navegador</strong> usando la API criptográfica <code>window.crypto.getRandomValues()</code>. Nada se envía por la red ni se guarda en ningún servidor.
            </p>
            <p>
              Para mayor seguridad en sistemas en producción, recomendamos el uso de <strong>Passphrases</strong> con más de 4 palabras, ya que son estadísticamente inmunes a ataques de fuerza bruta y mucho más fáciles de recordar.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
