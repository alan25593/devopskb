'use client'

import { useState, useMemo } from 'react'

export default function OpensslSshBuilder() {
  const [tab, setTab] = useState<'csr' | 'convert' | 'ssh'>('csr')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // CSR / Cert state
  const [cn, setCn] = useState('wiresops.com')
  const [sans, setSans] = useState('wiresops.com, *.wiresops.com, kb.wiresops.com')
  const [org, setOrg] = useState('WiresOps LLC')
  const [country, setCountry] = useState('US')
  const [days, setDays] = useState(365)
  const [keyAlgo, setKeyAlgo] = useState<'rsa2048' | 'rsa4096' | 'ecdsa'>('rsa2048')

  // Convert state
  const [certBaseName, setCertBaseName] = useState('certificado')

  // SSH state
  const [sshComment, setSshComment] = useState('alan@wiresops.com')
  const [sshHost, setSshHost] = useState('bastion.wiresops.com')
  const [sshUser, setSshUser] = useState('ubuntu')
  const [sshPort, setSshPort] = useState(22)
  const [localPort, setLocalPort] = useState(5432)
  const [remoteTargetHost, setRemoteTargetHost] = useState('db.internal')
  const [remoteTargetPort, setRemoteTargetPort] = useState(5432)

  const copyCmd = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1600)
  }

  const sanFormatted = useMemo(() => {
    return sans
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => (/^\d+\.\d+\.\d+\.\d+$/.test(s) ? `IP:${s}` : `DNS:${s}`))
      .join(',')
  }, [sans])

  const keyFlag =
    keyAlgo === 'rsa4096'
      ? 'rsa:4096'
      : keyAlgo === 'ecdsa'
      ? 'ec -pkeyopt ec_paramgen_curve:prime256v1'
      : 'rsa:2048'

  const csrCmd = `openssl req -new -newkey ${keyFlag} -nodes \\
  -keyout ${cn}.key -out ${cn}.csr \\
  -subj "/C=${country}/O=${org}/CN=${cn}" \\
  -addext "subjectAltName=${sanFormatted || `DNS:${cn}`}"`

  const selfSignedCmd = `openssl req -x509 -newkey ${keyFlag} -nodes -days ${days} \\
  -keyout ${cn}.key -out ${cn}.crt \\
  -subj "/C=${country}/O=${org}/CN=${cn}" \\
  -addext "subjectAltName=${sanFormatted || `DNS:${cn}`}"`

  const inspectRemoteCmd = `echo | openssl s_client -servername ${cn} -connect ${cn}:443 2>/dev/null | openssl x509 -noout -dates -subject -issuer -ext subjectAltName`

  const verifyMatchCmd = `diff <(openssl x509 -noout -modulus -in ${cn}.crt | openssl md5) <(openssl rsa -noout -modulus -in ${cn}.key | openssl md5)`

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-gray-900 border border-gray-800 p-2 rounded-xl overflow-x-auto">
        {[
          { id: 'csr', label: '1. Generar CSR / Cert con SANs' },
          { id: 'convert', label: '2. Convertir PEM ⇄ PFX (.p12) / IIS' },
          { id: 'ssh', label: '3. SSH Keygen & Túneles Port Forwarding' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as 'csr' | 'convert' | 'ssh')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'csr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Datos del Certificado
            </h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Common Name (Dominio Principal)</label>
              <input
                type="text"
                value={cn}
                onChange={e => setCn(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                SANs (Dominios o IPs adicionales separados por coma)
              </label>
              <input
                type="text"
                value={sans}
                onChange={e => setSans(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Organización (O)</label>
                <input
                  type="text"
                  value={org}
                  onChange={e => setOrg(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">País (2 letras)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={country}
                  onChange={e => setCountry(e.target.value.toUpperCase())}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Algoritmo</label>
                <select
                  value={keyAlgo}
                  onChange={e => setKeyAlgo(e.target.value as 'rsa2048' | 'rsa4096' | 'ecdsa')}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100"
                >
                  <option value="rsa2048">RSA 2048 bits</option>
                  <option value="rsa4096">RSA 4096 bits</option>
                  <option value="ecdsa">ECDSA P-256</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Validez (días)</label>
                <input
                  type="number"
                  value={days}
                  onChange={e => setDays(parseInt(e.target.value, 10) || 365)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {[
              { key: 'csr', title: 'Generar Clave Privada (.key) + CSR (.csr) con SANs', cmd: csrCmd },
              { key: 'self', title: `Generar Certificado Autofirmado (${days} días) con SANs`, cmd: selfSignedCmd },
              { key: 'remote', title: 'Inspeccionar Certificado TLS en Vivo (Servidor Remoto)', cmd: inspectRemoteCmd },
              { key: 'match', title: 'Verificar que el .crt y el .key coincidan (Modulus MD5)', cmd: verifyMatchCmd },
            ].map(item => (
              <div key={item.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-300">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => copyCmd(item.cmd, item.key)}
                    className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-green-400 font-medium"
                  >
                    {copiedKey === item.key ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-green-300 overflow-x-auto">
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'convert' && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <label className="text-xs text-gray-400 font-semibold">Nombre base de los archivos:</label>
            <input
              type="text"
              value={certBaseName}
              onChange={e => setCertBaseName(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'pem2pfx',
                title: 'PEM (.crt + .key) ➔ PKCS#12 (.pfx para Windows IIS / Azure)',
                cmd: `openssl pkcs12 -export -out ${certBaseName}.pfx \\\n  -inkey ${certBaseName}.key -in ${certBaseName}.crt \\\n  -certfile ca-chain.crt`,
              },
              {
                key: 'pfx2crt',
                title: 'Extraer Certificado (.crt) desde un archivo .pfx',
                cmd: `openssl pkcs12 -in ${certBaseName}.pfx -clcerts -nokeys -out ${certBaseName}.crt`,
              },
              {
                key: 'pfx2key',
                title: 'Extraer Clave Privada (.key) sin contraseña desde un .pfx (para Nginx/K8s)',
                cmd: `openssl pkcs12 -in ${certBaseName}.pfx -nocerts -nodes -out ${certBaseName}.key`,
              },
              {
                key: 'der2pem',
                title: 'Convertir DER (.cer/.der binario) ➔ PEM (.crt texto)',
                cmd: `openssl x509 -inform der -in ${certBaseName}.cer -out ${certBaseName}.crt`,
              },
            ].map(item => (
              <div key={item.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-300">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => copyCmd(item.cmd, item.key)}
                    className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-green-400 font-medium"
                  >
                    {copiedKey === item.key ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-cyan-300 overflow-x-auto">
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'ssh' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Parámetros SSH & Bastion
            </h2>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Comentario / Email (ssh-keygen)</label>
              <input
                type="text"
                value={sshComment}
                onChange={e => setSshComment(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Usuario SSH</label>
                <input
                  type="text"
                  value={sshUser}
                  onChange={e => setSshUser(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Host Bastion</label>
                <input
                  type="text"
                  value={sshHost}
                  onChange={e => setSshHost(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Puerto SSH</label>
                <input
                  type="number"
                  value={sshPort}
                  onChange={e => setSshPort(parseInt(e.target.value, 10) || 22)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Puerto Local</label>
                <input
                  type="number"
                  value={localPort}
                  onChange={e => setLocalPort(parseInt(e.target.value, 10) || 5432)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Host Privado</label>
                <input
                  type="text"
                  value={remoteTargetHost}
                  onChange={e => setRemoteTargetHost(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Puerto Destino</label>
                <input
                  type="number"
                  value={remoteTargetPort}
                  onChange={e => setRemoteTargetPort(parseInt(e.target.value, 10) || 5432)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {[
              {
                key: 'ed25519',
                title: 'Generar Par de Claves SSH Ed25519 (Recomendado)',
                cmd: `ssh-keygen -t ed25519 -a 100 -C "${sshComment}" -f ~/.ssh/id_ed25519`,
              },
              {
                key: 'local-fwd',
                title: `Túnel Local (-L): Acceder en localhost:${localPort} a ${remoteTargetHost}:${remoteTargetPort} vía ${sshHost}`,
                cmd: `ssh -N -L ${localPort}:${remoteTargetHost}:${remoteTargetPort} -p ${sshPort} ${sshUser}@${sshHost}`,
              },
              {
                key: 'socks',
                title: 'Proxy Dinámico SOCKS5 (-D) en localhost:1080',
                cmd: `ssh -N -D 1080 -p ${sshPort} ${sshUser}@${sshHost}`,
              },
              {
                key: 'jump',
                title: 'Saltar por Bastion con ProxyJump (-J)',
                cmd: `ssh -J ${sshUser}@${sshHost}:${sshPort} ${sshUser}@${remoteTargetHost}`,
              },
            ].map(item => (
              <div key={item.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-300">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => copyCmd(item.cmd, item.key)}
                    className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-green-400 font-medium"
                  >
                    {copiedKey === item.key ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-green-300 overflow-x-auto">
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
