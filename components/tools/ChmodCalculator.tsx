'use client'

import { useState, useMemo } from 'react'

interface PermSet {
  r: boolean
  w: boolean
  x: boolean
}

const PRESETS = [
  { label: '600 — Clave privada SSH (id_ed25519)', octal: '0600', desc: 'Solo dueño lee/escribe' },
  { label: '644 — Archivo público / config web', octal: '0644', desc: 'Dueño edita, resto lee' },
  { label: '700 — Directorio privado (~/.ssh)', octal: '0700', desc: 'Acceso total exclusivo al dueño' },
  { label: '755 — Script ejecutable / Directorio web', octal: '0755', desc: 'Dueño total, resto lee y ejecuta' },
  { label: '2775 — Directorio compartido de grupo (SGID)', octal: '2775', desc: 'Hereda grupo en archivos nuevos' },
  { label: '1777 — Directorio /tmp (Sticky Bit)', octal: '1777', desc: 'Todos escriben, solo dueño borra' },
]

function digitToPerm(d: number): PermSet {
  return {
    r: (d & 4) !== 0,
    w: (d & 2) !== 0,
    x: (d & 1) !== 0,
  }
}

function permToDigit(p: PermSet): number {
  return (p.r ? 4 : 0) + (p.w ? 2 : 0) + (p.x ? 1 : 0)
}

export default function ChmodCalculator() {
  const [owner, setOwner] = useState<PermSet>({ r: true, w: true, x: true })
  const [group, setGroup] = useState<PermSet>({ r: true, w: false, x: true })
  const [others, setOthers] = useState<PermSet>({ r: true, w: false, x: true })
  const [suid, setSuid] = useState(false)
  const [sgid, setSgid] = useState(false)
  const [sticky, setSticky] = useState(false)
  const [isDir, setIsDir] = useState(false)
  const [recursive, setRecursive] = useState(false)
  const [targetPath, setTargetPath] = useState('/var/www/app')
  const [ownerUser, setOwnerUser] = useState('www-data:www-data')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const specialDigit = (suid ? 4 : 0) + (sgid ? 2 : 0) + (sticky ? 1 : 0)
  const ownerDigit = permToDigit(owner)
  const groupDigit = permToDigit(group)
  const othersDigit = permToDigit(others)

  const octalShort = `${specialDigit > 0 ? specialDigit : ''}${ownerDigit}${groupDigit}${othersDigit}`
  const octalFull = `${specialDigit}${ownerDigit}${groupDigit}${othersDigit}`

  const symbolic = useMemo(() => {
    const prefix = isDir ? 'd' : '-'
    const oX = suid ? (owner.x ? 's' : 'S') : owner.x ? 'x' : '-'
    const gX = sgid ? (group.x ? 's' : 'S') : group.x ? 'x' : '-'
    const tX = sticky ? (others.x ? 't' : 'T') : others.x ? 'x' : '-'

    return (
      prefix +
      (owner.r ? 'r' : '-') +
      (owner.w ? 'w' : '-') +
      oX +
      (group.r ? 'r' : '-') +
      (group.w ? 'w' : '-') +
      gX +
      (others.r ? 'r' : '-') +
      (others.w ? 'w' : '-') +
      tX
    )
  }, [owner, group, others, suid, sgid, sticky, isDir])

  const applyOctalString = (val: string) => {
    const clean = val.trim().replace(/[^0-7]/g, '')
    if (clean.length === 3) {
      setSuid(false)
      setSgid(false)
      setSticky(false)
      setOwner(digitToPerm(parseInt(clean[0], 10)))
      setGroup(digitToPerm(parseInt(clean[1], 10)))
      setOthers(digitToPerm(parseInt(clean[2], 10)))
    } else if (clean.length === 4) {
      const sp = parseInt(clean[0], 10)
      setSuid((sp & 4) !== 0)
      setSgid((sp & 2) !== 0)
      setSticky((sp & 1) !== 0)
      setOwner(digitToPerm(parseInt(clean[1], 10)))
      setGroup(digitToPerm(parseInt(clean[2], 10)))
      setOthers(digitToPerm(parseInt(clean[3], 10)))
    }
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1600)
  }

  const chmodCmd = `chmod ${recursive ? '-R ' : ''}${octalShort} ${targetPath || './archivo'}`
  const chownCmd = `chown ${recursive ? '-R ' : ''}${ownerUser || 'root:root'} ${targetPath || './archivo'}`
  const findBestPracticeCmd = `find ${targetPath || '/var/www/app'} -type d -exec chmod 755 {} + && find ${targetPath || '/var/www/app'} -type f -exec chmod 644 {} +`

  const isWorldWritable = others.w && !sticky

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Presets Clásicos de Linux & DevOps
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRESETS.map(p => (
            <button
              key={p.octal}
              type="button"
              onClick={() => applyOctalString(p.octal)}
              className="text-left p-2.5 rounded-lg bg-gray-950/70 hover:bg-gray-800 border border-gray-800 hover:border-green-600/60 transition-all"
            >
              <div className="text-xs font-semibold text-gray-200">{p.label}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Matrix & Live Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Matriz de Permisos
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase">
                  <th className="py-2">Rol</th>
                  <th className="py-2 text-center">Lectura (4)</th>
                  <th className="py-2 text-center">Escritura (2)</th>
                  <th className="py-2 text-center">Ejecución (1)</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70">
                {[
                  { label: 'Owner (Usuario / u)', state: owner, setter: setOwner, digit: ownerDigit },
                  { label: 'Group (Grupo / g)', state: group, setter: setGroup, digit: groupDigit },
                  { label: 'Others (Otros / o)', state: others, setter: setOthers, digit: othersDigit },
                ].map(row => (
                  <tr key={row.label}>
                    <td className="py-3 font-medium text-gray-200">{row.label}</td>
                    {(['r', 'w', 'x'] as const).map(bit => (
                      <td key={bit} className="py-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.state[bit]}
                          onChange={e => row.setter({ ...row.state, [bit]: e.target.checked })}
                          className="w-4 h-4 accent-green-500 rounded cursor-pointer"
                        />
                      </td>
                    ))}
                    <td className="py-3 text-right font-mono font-bold text-green-400">{row.digit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Special Bits */}
          <div className="pt-3 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-gray-300">
            <label className="flex items-center gap-2 p-2 rounded bg-gray-950/60 border border-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={suid}
                onChange={e => setSuid(e.target.checked)}
                className="accent-purple-500"
              />
              <span>SUID (4000)</span>
            </label>
            <label className="flex items-center gap-2 p-2 rounded bg-gray-950/60 border border-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={sgid}
                onChange={e => setSgid(e.target.checked)}
                className="accent-purple-500"
              />
              <span>SGID (2000)</span>
            </label>
            <label className="flex items-center gap-2 p-2 rounded bg-gray-950/60 border border-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={sticky}
                onChange={e => setSticky(e.target.checked)}
                className="accent-purple-500"
              />
              <span>Sticky (1000)</span>
            </label>
            <label className="flex items-center gap-2 p-2 rounded bg-gray-950/60 border border-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isDir}
                onChange={e => setIsDir(e.target.checked)}
                className="accent-cyan-500"
              />
              <span>Directorio (d)</span>
            </label>
          </div>
        </div>

        {/* Right Side: Octal & Symbolic Representations */}
        <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-center">
              <span className="text-[11px] font-semibold text-gray-400 uppercase block mb-1">
                Octal
              </span>
              <input
                type="text"
                maxLength={4}
                value={octalShort}
                onChange={e => applyOctalString(e.target.value)}
                className="w-full bg-transparent text-center font-mono text-3xl font-bold text-green-400 outline-none"
              />
              <span className="text-[11px] font-mono text-gray-500">Completo: {octalFull}</span>
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-gray-400 uppercase block mb-1">
                Simbólico (ls -l)
              </span>
              <div className="font-mono text-xl font-bold text-cyan-400 tracking-wider">
                {symbolic}
              </div>
              <span className="text-[11px] text-gray-500 mt-1">
                u={owner.r ? 'r' : ''}{owner.w ? 'w' : ''}{owner.x ? 'x' : ''}, g={group.r ? 'r' : ''}{group.w ? 'w' : ''}{group.x ? 'x' : ''}, o={others.r ? 'r' : ''}{others.w ? 'w' : ''}{others.x ? 'x' : ''}
              </span>
            </div>
          </div>

          {isWorldWritable && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-300">
              <strong>⚠️ Riesgo de Seguridad:</strong> El permiso de escritura para <em>Others</em> ({octalShort}) permite que cualquier usuario del sistema modifique o reemplace el archivo. Evitá usar <code className="text-red-200">777</code> o <code className="text-red-200">666</code> en producción.
            </div>
          )}

          {/* Path & User customization */}
          <div className="space-y-3 pt-2 border-t border-gray-800">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Ruta destino</label>
                <input
                  type="text"
                  value={targetPath}
                  onChange={e => setTargetPath(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs font-mono text-gray-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Usuario:Grupo</label>
                <input
                  type="text"
                  value={ownerUser}
                  onChange={e => setOwnerUser(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs font-mono text-gray-200"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={recursive}
                onChange={e => setRecursive(e.target.checked)}
                className="accent-green-500"
              />
              Aplicar recursivamente (<code className="text-green-400">-R</code>)
            </label>
          </div>
        </div>
      </div>

      {/* Ready-to-copy Commands */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {[
          { key: 'chmod', label: 'Comando chmod', cmd: chmodCmd },
          { key: 'chown', label: 'Comando chown', cmd: chownCmd },
          { key: 'find', label: 'Buenas prácticas (Dirs 755 + Files 644)', cmd: findBestPracticeCmd },
        ].map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => copyText(item.cmd, item.key)}
            className="text-left p-3.5 bg-gray-900 border border-gray-800 hover:border-green-600/70 rounded-xl transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">{item.label}</span>
              <span className="text-[11px] text-green-400 font-medium">
                {copiedKey === item.key ? '¡Copiado!' : 'Copiar'}
              </span>
            </div>
            <div className="font-mono text-xs text-gray-100 truncate">{item.cmd}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
