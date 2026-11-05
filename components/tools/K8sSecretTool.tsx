'use client'

import { useState, useMemo } from 'react'
import yaml from 'js-yaml'

const SAMPLE_SECRET = `apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: production
type: Opaque
data:
  DATABASE_URL: cG9zdGdyZXNxbDovL3dpcmVzb3BzOnN1cGVyc2VjcmV0QGRiLmludGVybmFsOjU0MzIvcHJvZA==
  JWT_SECRET: MjliNDRjOGYtNzhlMS00Y2Q1LWI5MmEtM2Y4ZTEwY2I5NDkx
  REDIS_PASSWORD: cmVkaXNfcGFzc3dvcmRfMjAyNg==`

function utf8ToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch {
    return ''
  }
}

function base64ToUtf8(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64.trim())))
  } catch {
    return '[Base64 binario o inválido]'
  }
}

export default function K8sSecretTool() {
  const [mode, setMode] = useState<'decode' | 'build'>('decode')
  const [yamlInput, setYamlInput] = useState(SAMPLE_SECRET)

  // Builder state
  const [secretName, setSecretName] = useState('app-secrets')
  const [namespace, setNamespace] = useState('production')
  const [secretType, setSecretType] = useState<'Opaque' | 'kubernetes.io/dockerconfigjson'>('Opaque')
  const [envText, setEnvText] = useState(
    `DATABASE_URL=postgresql://wiresops:secret@db:5432/app\nAPI_KEY=wops_live_98a7bc65d4321\nLOG_LEVEL=info`
  )
  const [dockerServer, setDockerServer] = useState('registry.wiresops.com')
  const [dockerUser, setDockerUser] = useState('ci-deployer')
  const [dockerPass, setDockerPass] = useState('glpat-xxxxxxxxxxxx')
  const [dockerEmail, setDockerEmail] = useState('devops@wiresops.com')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const decodedResult = useMemo(() => {
    try {
      const doc = yaml.load(yamlInput) as Record<string, unknown>
      if (!doc || typeof doc !== 'object') {
        return { entries: [], meta: null, error: 'YAML vacío o inválido' }
      }
      const meta = (doc.metadata as Record<string, string>) || {}
      const dataObj = (doc.data as Record<string, string>) || {}
      const stringDataObj = (doc.stringData as Record<string, string>) || {}

      const entries: { key: string; base64: string; plain: string }[] = []

      for (const [k, v] of Object.entries(dataObj)) {
        const strVal = String(v ?? '')
        entries.push({
          key: k,
          base64: strVal,
          plain: base64ToUtf8(strVal),
        })
      }

      for (const [k, v] of Object.entries(stringDataObj)) {
        const strVal = String(v ?? '')
        entries.push({
          key: k,
          base64: utf8ToBase64(strVal),
          plain: strVal,
        })
      }

      return {
        entries,
        meta: {
          name: meta.name || 'secret',
          namespace: meta.namespace || 'default',
          type: String(doc.type || 'Opaque'),
        },
        error: null,
      }
    } catch (e: unknown) {
      return {
        entries: [],
        meta: null,
        error: e instanceof Error ? e.message : 'Error al parsear YAML',
      }
    }
  }, [yamlInput])

  const builtYaml = useMemo(() => {
    const data: Record<string, string> = {}

    if (secretType === 'Opaque') {
      for (const rawLine of envText.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const k = line.slice(0, eq).trim()
        let v = line.slice(eq + 1).trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        if (k) data[k] = utf8ToBase64(v)
      }
    } else {
      const auth = utf8ToBase64(`${dockerUser}:${dockerPass}`)
      const dockerConfig = JSON.stringify({
        auths: {
          [dockerServer]: {
            username: dockerUser,
            password: dockerPass,
            email: dockerEmail,
            auth,
          },
        },
      })
      data['.dockerconfigjson'] = utf8ToBase64(dockerConfig)
    }

    const secretManifest = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName || 'my-secret',
        namespace: namespace || 'default',
      },
      type: secretType,
      data,
    }

    return yaml.dump(secretManifest, { indent: 2, lineWidth: 120, noRefs: true })
  }, [secretName, namespace, secretType, envText, dockerServer, dockerUser, dockerPass, dockerEmail])

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1600)
  }

  const exportAsDotenv = () => {
    const envLines = decodedResult.entries.map(e => `${e.key}=${e.plain}`).join('\n')
    copyText(envLines, 'dotenv')
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-gray-900 border border-gray-800 p-2 rounded-xl">
        <button
          type="button"
          onClick={() => setMode('decode')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            mode === 'decode'
              ? 'bg-green-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          Decodificar Secret YAML ➔ Texto Plano
        </button>
        <button
          type="button"
          onClick={() => setMode('build')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            mode === 'build'
              ? 'bg-green-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          Construir Secret YAML desde .env / Registry
        </button>
      </div>

      {mode === 'decode' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Manifiesto Kubernetes Secret (YAML)
            </label>
            <textarea
              value={yamlInput}
              onChange={e => setYamlInput(e.target.value)}
              rows={15}
              className="w-full bg-gray-900 border border-gray-800 focus:border-green-600 rounded-xl p-4 font-mono text-xs text-gray-200 outline-none resize-y"
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Valores Decodificados ({decodedResult.entries.length})
              </span>
              {decodedResult.entries.length > 0 && (
                <button
                  type="button"
                  onClick={exportAsDotenv}
                  className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-green-400 font-medium"
                >
                  {copiedKey === 'dotenv' ? '¡Copiado como .env!' : 'Copiar todo como .env'}
                </button>
              )}
            </div>

            {decodedResult.error ? (
              <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-xs font-mono text-red-300">
                {decodedResult.error}
              </div>
            ) : (
              <div className="space-y-2.5">
                {decodedResult.entries.map(item => (
                  <div
                    key={item.key}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-400">{item.key}</span>
                      <button
                        type="button"
                        onClick={() => copyText(item.plain, item.key)}
                        className="text-[11px] px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                      >
                        {copiedKey === item.key ? '¡Copiado!' : 'Copiar valor'}
                      </button>
                    </div>
                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-2.5 font-mono text-xs text-green-300 break-all">
                      {item.plain}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre del Secret</label>
                <input
                  type="text"
                  value={secretName}
                  onChange={e => setSecretName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Namespace</label>
                <input
                  type="text"
                  value={namespace}
                  onChange={e => setNamespace(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo de Secret</label>
              <select
                value={secretType}
                onChange={e => setSecretType(e.target.value as 'Opaque' | 'kubernetes.io/dockerconfigjson')}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100"
              >
                <option value="Opaque">Opaque (Variables de entorno / pares clave=valor)</option>
                <option value="kubernetes.io/dockerconfigjson">kubernetes.io/dockerconfigjson (ImagePullSecret)</option>
              </select>
            </div>

            {secretType === 'Opaque' ? (
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Variables en texto plano (formato KEY=VALUE)
                </label>
                <textarea
                  value={envText}
                  onChange={e => setEnvText(e.target.value)}
                  rows={8}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-gray-200 outline-none"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Registry Server</label>
                  <input
                    type="text"
                    value={dockerServer}
                    onChange={e => setDockerServer(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Usuario</label>
                    <input
                      type="text"
                      value={dockerUser}
                      onChange={e => setDockerUser(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Password / Token</label>
                    <input
                      type="text"
                      value={dockerPass}
                      onChange={e => setDockerPass(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <input
                    type="text"
                    value={dockerEmail}
                    onChange={e => setDockerEmail(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-100"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Manifiesto Secret Codificado en Base64
              </span>
              <button
                type="button"
                onClick={() => copyText(builtYaml, 'built')}
                className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-green-400 font-medium"
              >
                {copiedKey === 'built' ? '¡Copiado!' : 'Copiar YAML'}
              </button>
            </div>
            <pre className="flex-1 min-h-[320px] bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-xs text-green-300 overflow-auto">
              {builtYaml}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
