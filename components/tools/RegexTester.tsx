'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type TokenColor = 'anchor' | 'charclass' | 'quantifier' | 'group' | 'literal' | 'alternation' | 'escape'
type LangKey = 'js' | 'python' | 'go' | 'php' | 'ruby' | 'java'
type Tab = 'tester' | 'code' | 'builder' | 'patterns'

interface ExplainToken {
  raw: string
  label: string
  detail: string
  color: TokenColor
}

interface MatchResult {
  text: string
  index: number
  end: number
  groups: (string | undefined)[]
  namedGroups: Record<string, string>
}

// ─── Explainer ───────────────────────────────────────────────────────────────

const ESC_MAP: Record<string, [string, string, TokenColor]> = {
  d: ['dígito',     'Cualquier dígito del 0 al 9',                        'charclass'],
  D: ['no dígito',  'Cualquier carácter que NO sea dígito',               'charclass'],
  w: ['palabra',    'Letra, número o guion bajo [a-zA-Z0-9_]',            'charclass'],
  W: ['no palabra', 'Cualquier carácter que NO sea letra, número ni _',   'charclass'],
  s: ['espacio',    'Espacio en blanco (espacio, tab, salto de línea)',    'charclass'],
  S: ['no espacio', 'Cualquier carácter que NO sea espacio en blanco',    'charclass'],
  b: ['límite',     'Límite entre un carácter de palabra y uno que no lo es', 'anchor'],
  B: ['no límite',  'Posición que NO es límite de palabra',               'anchor'],
  n: ['\\n',        'Carácter de salto de línea',                         'escape'],
  t: ['\\t',        'Carácter de tabulación',                             'escape'],
  r: ['\\r',        'Retorno de carro',                                   'escape'],
}

function explainPattern(pattern: string): ExplainToken[] {
  const tokens: ExplainToken[] = []
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]

    if (ch === '|') { tokens.push({ raw: '|', label: 'o', detail: 'Alternativa: coincide con lo de la izquierda O lo de la derecha', color: 'alternation' }); i++; continue }
    if (ch === '^') { tokens.push({ raw: '^', label: 'inicio', detail: 'Inicio del texto (o de la línea con flag m)', color: 'anchor' }); i++; continue }
    if (ch === '$') { tokens.push({ raw: '$', label: 'fin',    detail: 'Fin del texto (o de la línea con flag m)',    color: 'anchor' }); i++; continue }
    if (ch === '.') { tokens.push({ raw: '.', label: 'cualquier', detail: 'Cualquier carácter excepto salto de línea (con flag s: todos)', color: 'charclass' }); i++; continue }

    if (ch === '\\') {
      const next = pattern[i + 1]; i += 2
      if (next && ESC_MAP[next]) {
        const [label, detail, color] = ESC_MAP[next]
        tokens.push({ raw: `\\${next}`, label, detail, color })
      } else if (next) {
        tokens.push({ raw: `\\${next}`, label: `"${next}"`, detail: `Carácter literal "${next}"`, color: 'escape' })
      }
      continue
    }

    if (ch === '[') {
      let j = i + 1
      const negated = pattern[j] === '^'
      if (negated) j++
      while (j < pattern.length && pattern[j] !== ']') { if (pattern[j] === '\\') j++; j++ }
      const inner = pattern.slice(i + 1 + (negated ? 1 : 0), j)
      const raw = pattern.slice(i, j + 1); i = j + 1
      tokens.push({ raw, label: negated ? `excluir [${inner}]` : `uno de [${inner}]`, detail: negated ? `Cualquier carácter EXCEPTO: ${inner}` : `Un carácter de: ${inner}`, color: 'charclass' })
      continue
    }

    if (ch === '(') {
      let raw = '(', label = 'grupo', detail = 'Grupo de captura — su contenido se puede recuperar', adv = 1
      if (pattern[i + 1] === '?') {
        const p2 = pattern[i + 2]
        if (p2 === ':')  { raw = '(?:';  label = 'sin captura';      detail = 'Agrupa sin capturar';                             adv = 3 }
        else if (p2 === '=') { raw = '(?=';  label = 'lookahead +';      detail = 'Lo que sigue debe coincidir (sin consumirlo)';  adv = 3 }
        else if (p2 === '!') { raw = '(?!';  label = 'lookahead −';      detail = 'Lo que sigue NO debe coincidir';               adv = 3 }
        else if (p2 === '<') {
          if (pattern[i + 3] === '=')      { raw = '(?<='; label = 'lookbehind +'; detail = 'Lo anterior debe coincidir';         adv = 4 }
          else if (pattern[i + 3] === '!') { raw = '(?<!'; label = 'lookbehind −'; detail = 'Lo anterior NO debe coincidir';      adv = 4 }
          else {
            let k = i + 3; while (k < pattern.length && pattern[k] !== '>') k++
            const name = pattern.slice(i + 3, k); raw = pattern.slice(i, k + 1)
            label = `grupo "${name}"`; detail = `Grupo de captura con nombre "${name}"`; adv = k - i + 1
          }
        }
      }
      i += adv; tokens.push({ raw, label, detail, color: 'group' }); continue
    }

    if (ch === ')') { tokens.push({ raw: ')', label: 'cierra grupo', detail: 'Cierra el grupo abierto anteriormente', color: 'group' }); i++; continue }

    if ('*+?'.includes(ch)) {
      const lazy = pattern[i + 1] === '?' ? '?' : ''
      const raw = ch + lazy; i += 1 + (lazy ? 1 : 0)
      const B: Record<string, string> = { '*': 'cero o más', '+': 'uno o más', '?': 'opcional' }
      const D: Record<string, string> = { '*': 'El elemento anterior, cero o más veces', '+': 'El elemento anterior, una o más veces', '?': 'El elemento anterior, cero o una vez' }
      tokens.push({ raw, label: B[ch] + (lazy ? ' (lazy)' : ''), detail: (D[ch] || '') + (lazy ? '. Captura lo mínimo posible.' : '. Captura lo máximo posible.'), color: 'quantifier' })
      continue
    }

    if (ch === '{') {
      let j = i + 1; while (j < pattern.length && pattern[j] !== '}') j++
      const content = pattern.slice(i + 1, j)
      const lazy = pattern[j + 1] === '?'
      const raw = `{${content}}${lazy ? '?' : ''}`; i = j + 1 + (lazy ? 1 : 0)
      const [a, b] = content.split(',')
      const label = b === undefined ? `×${a}` : b === '' ? `≥${a}` : `${a}–${b}`
      tokens.push({ raw, label: label + (lazy ? ' lazy' : ''), detail: b === undefined ? `Exactamente ${a} veces` : b === '' ? `Al menos ${a} veces` : `Entre ${a} y ${b} veces`, color: 'quantifier' })
      continue
    }

    tokens.push({ raw: ch, label: `"${ch}"`, detail: `Carácter literal "${ch}"`, color: 'literal' }); i++
  }

  return tokens
}

// ─── Regex evaluation ────────────────────────────────────────────────────────

function evalRegex(pattern: string, flagStr: string, text: string): { valid: boolean; matches: MatchResult[]; error?: string } {
  if (!pattern) return { valid: true, matches: [] }
  try {
    const regex = new RegExp(pattern, flagStr)
    const matches: MatchResult[] = []
    if (flagStr.includes('g')) {
      let m: RegExpExecArray | null, safety = 0
      regex.lastIndex = 0
      while ((m = regex.exec(text)) !== null && safety++ < 500) {
        matches.push({ text: m[0], index: m.index, end: m.index + m[0].length, groups: Array.from(m).slice(1), namedGroups: (m.groups as Record<string, string>) ?? {} })
        if (m[0].length === 0) { regex.lastIndex++; if (regex.lastIndex > text.length) break }
      }
    } else {
      const m = regex.exec(text)
      if (m) matches.push({ text: m[0], index: m.index, end: m.index + m[0].length, groups: Array.from(m).slice(1), namedGroups: (m.groups as Record<string, string>) ?? {} })
    }
    return { valid: true, matches }
  } catch (e) {
    return { valid: false, matches: [], error: (e as Error).message }
  }
}

// ─── Code generation ─────────────────────────────────────────────────────────

function generateCode(pattern: string, flags: Record<string, boolean>, lang: LangKey): string {
  if (!pattern) return ''
  const { g, i, m, s } = flags
  const fstr = (g ? 'g' : '') + (i ? 'i' : '') + (m ? 'm' : '') + (s ? 's' : '')

  const dq = (p: string) => p.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const sq = (p: string) => p.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const rq = (p: string) => p.replace(/"/g, '\\"')        // Python raw string
  const gq = (p: string) => p.replace(/`/g, '` + "`" + `') // Go backtick

  switch (lang) {
    case 'js': return [
      `const regex = /${pattern}/${fstr};`,
      ``,
      `// Verificar`,
      `regex.test(text);  // → true/false`,
      ``,
      `// Primera coincidencia`,
      `const match = text.match(regex);`,
      `if (match) console.log(match[0], 'pos:', match.index);`,
      ``,
      `// Todas las coincidencias (flag g)`,
      `for (const m of text.matchAll(/${pattern}/${fstr || 'g'})) {`,
      `  console.log(m[0], 'pos:', m.index);`,
      ...(Object.keys({}).length ? [] : [`  if (m.groups) console.log(m.groups);`]),
      `}`,
    ].join('\n')

    case 'python': {
      const pyFlags = [...(i ? ['re.IGNORECASE'] : []), ...(m ? ['re.MULTILINE'] : []), ...(s ? ['re.DOTALL'] : [])]
      const flagArg = pyFlags.length ? `, ${pyFlags.join(' | ')}` : ''
      return [
        `import re`,
        ``,
        `pattern = re.compile(r"${rq(pattern)}"${flagArg})`,
        ``,
        `# Verificar`,
        `bool(pattern.search(text))`,
        ``,
        `# Todas las coincidencias`,
        `for match in pattern.finditer(text):`,
        `    print(match.group(), 'pos:', match.start())`,
        `    if match.groupdict():`,
        `        print('Grupos:', match.groupdict())`,
        ``,
        `# Lista de coincidencias`,
        `matches = pattern.findall(text)`,
      ].join('\n')
    }

    case 'go': {
      const inlineF = (i ? '(?i)' : '') + (m ? '(?m)' : '') + (s ? '(?s)' : '')
      return [
        `import (`,
        `\t"fmt"`,
        `\t"regexp"`,
        `)`,
        ``,
        `re := regexp.MustCompile(\`${gq(inlineF + pattern)}\`)`,
        ``,
        `// Verificar`,
        `re.MatchString(text)  // → bool`,
        ``,
        `// Primera coincidencia`,
        `match := re.FindString(text)`,
        `fmt.Println(match)`,
        ``,
        `// Todas las coincidencias`,
        `for i, m := range re.FindAllString(text, -1) {`,
        `\tfmt.Printf("#%d: %q\\n", i+1, m)`,
        `}`,
      ].join('\n')
    }

    case 'php': {
      const phpF = (i ? 'i' : '') + (m ? 'm' : '') + (s ? 's' : '')
      return [
        `$pattern = '/${sq(pattern)}/${phpF}';`,
        ``,
        `// Verificar`,
        `preg_match($pattern, $text);  // → 1 o 0`,
        ``,
        `// Todas las coincidencias`,
        `preg_match_all($pattern, $text, $matches);`,
        `print_r($matches[0]);`,
        ``,
        `// Con grupos nombrados`,
        `foreach ($matches[0] as $i => $m) {`,
        `    echo "#" . ($i + 1) . ": " . $m . "\\n";`,
        `}`,
        ``,
        `// Reemplazar`,
        `$result = preg_replace($pattern, 'reemplazo', $text);`,
      ].join('\n')
    }

    case 'ruby': {
      const rubyF = (i ? 'i' : '') + (m ? 'm' : '')
      return [
        `regex = /${pattern}/${rubyF}`,
        ``,
        `# Verificar`,
        `text =~ regex  # → posición o nil`,
        `text.match?(regex)  # → true/false`,
        ``,
        `# Primera coincidencia`,
        `m = text.match(regex)`,
        `puts m[0] if m`,
        ``,
        `# Todas las coincidencias`,
        `text.scan(regex).each_with_index do |m, i|`,
        `  puts "#\#{i+1}: \#{m}"`,
        `end`,
        ``,
        `# Reemplazar`,
        `text.gsub(regex, 'reemplazo')`,
      ].join('\n')
    }

    case 'java': {
      const javaFlags = [...(i ? ['Pattern.CASE_INSENSITIVE'] : []), ...(m ? ['Pattern.MULTILINE'] : []), ...(s ? ['Pattern.DOTALL'] : [])]
      const flagArg = javaFlags.length ? `, ${javaFlags.join(' | ')}` : ''
      return [
        `import java.util.regex.*;`,
        ``,
        `Pattern p = Pattern.compile("${dq(pattern)}"${flagArg});`,
        `Matcher m = p.matcher(text);`,
        ``,
        `// Verificar`,
        `p.matcher(text).find()  // → boolean`,
        ``,
        `// Todas las coincidencias`,
        `while (m.find()) {`,
        `    System.out.printf("#%d: \\"%s\\" pos: %d%n",`,
        `        m.start(), m.group(), m.start());`,
        `}`,
        ``,
        `// Reemplazar`,
        `String result = m.replaceAll("reemplazo");`,
      ].join('\n')
    }
  }
}

// ─── Pattern library ─────────────────────────────────────────────────────────

const PATTERN_LIBRARY = [
  { cat: 'Web',    label: 'Email',          pattern: '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+',                                                       flags: 'gi', example: 'usuario@empresa.com' },
  { cat: 'Web',    label: 'URL HTTP',       pattern: 'https?:\\/\\/[\\w.-]+(?:\\.[\\w.-]+)+(?:\\/[^\\s]*)?',                                   flags: 'gi', example: 'https://example.com/path?q=1' },
  { cat: 'Web',    label: 'Dominio',        pattern: '\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}\\b',               flags: 'gi', example: 'www.example.com' },
  { cat: 'Red',    label: 'IPv4',           pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b', flags: 'g',  example: '192.168.1.1 — valida rangos' },
  { cat: 'Red',    label: 'IP privada',     pattern: '\\b(?:10\\.\\d{1,3}|172\\.(?:1[6-9]|2\\d|3[01])|192\\.168)\\.\\d{1,3}\\.\\d{1,3}\\b',   flags: 'g',  example: 'RFC 1918: 10.x, 172.16–31.x, 192.168.x' },
  { cat: 'Red',    label: 'MAC Address',    pattern: '(?:[0-9A-Fa-f]{2}[:\\-.]){5}[0-9A-Fa-f]{2}',                                             flags: 'gi', example: 'AA:BB:CC:DD:EE:FF' },
  { cat: 'Fecha',  label: 'DD/MM/YYYY',     pattern: '\\b(0?[1-9]|[12]\\d|3[01])[\\/\\-](0?[1-9]|1[0-2])[\\/\\-](\\d{4})\\b',                 flags: 'g',  example: '15/03/2024 o 5-3-2024' },
  { cat: 'Fecha',  label: 'ISO YYYY-MM-DD', pattern: '\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b',                                 flags: 'g',  example: '2024-03-15' },
  { cat: 'Fecha',  label: 'Hora HH:MM',     pattern: '\\b([01]?\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?\\b',                                     flags: 'g',  example: '14:30 o 09:05:00' },
  { cat: 'ID',     label: 'UUID',           pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',                          flags: 'gi', example: '550e8400-e29b-41d4-a716-446655440000' },
  { cat: 'ID',     label: 'Color HEX',      pattern: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b',                                                  flags: 'gi', example: '#FF5733 o #abc' },
  { cat: 'Número', label: 'Entero',         pattern: '-?\\b\\d+\\b',                                                                            flags: 'g',  example: '42, -7, 1000' },
  { cat: 'Número', label: 'Decimal',        pattern: '-?\\b\\d+\\.\\d+\\b',                                                                     flags: 'g',  example: '3.14, -2.5' },
  { cat: 'Número', label: 'Porcentaje',     pattern: '\\b\\d+(?:\\.\\d+)?%',                                                                    flags: 'g',  example: '75%, 99.9%' },
]

const PATTERN_CATS = ['Web', 'Red', 'Fecha', 'ID', 'Número']

// ─── Builder blocks ───────────────────────────────────────────────────────────

const CURSOR = '‸'

const BUILDER_CATS = [
  { label: 'Anclas', blocks: [
    { s: '^',             label: '^',       detail: 'Inicio del texto' },
    { s: '$',             label: '$',       detail: 'Fin del texto' },
    { s: '\\b',           label: '\\b',     detail: 'Límite de palabra' },
    { s: '\\B',           label: '\\B',     detail: 'No límite de palabra' },
  ]},
  { label: 'Caracteres', blocks: [
    { s: '\\d', label: '\\d', detail: 'Dígito (0-9)' },
    { s: '\\w', label: '\\w', detail: 'Letra, número o _' },
    { s: '\\s', label: '\\s', detail: 'Espacio en blanco' },
    { s: '\\D', label: '\\D', detail: 'No dígito' },
    { s: '\\W', label: '\\W', detail: 'No palabra' },
    { s: '\\S', label: '\\S', detail: 'No espacio' },
    { s: '.',   label: '.',   detail: 'Cualquier carácter' },
  ]},
  { label: 'Clases', blocks: [
    { s: '[a-z]',         label: '[a-z]',   detail: 'Letra minúscula' },
    { s: '[A-Z]',         label: '[A-Z]',   detail: 'Letra mayúscula' },
    { s: '[0-9]',         label: '[0-9]',   detail: 'Dígito' },
    { s: '[a-zA-Z]',      label: '[a-zA-Z]',detail: 'Letra (min o may)' },
    { s: `[${CURSOR}]`,   label: '[...]',   detail: 'Clase personalizada' },
    { s: `[^${CURSOR}]`,  label: '[^...]',  detail: 'Excluir caracteres' },
  ]},
  { label: 'Cuantificadores', blocks: [
    { s: '*',             label: '*',    detail: 'Cero o más (codicioso)' },
    { s: '+',             label: '+',    detail: 'Uno o más (codicioso)' },
    { s: '?',             label: '?',    detail: 'Opcional (0 o 1)' },
    { s: `{${CURSOR}}`,   label: '{n}',  detail: 'Exactamente n veces' },
    { s: `{${CURSOR},}`,  label: '{n,}', detail: 'Al menos n veces' },
    { s: `{${CURSOR},}`,  label: '{n,m}',detail: 'Entre n y m veces' },
    { s: '*?',            label: '*?',   detail: 'Cero o más (perezoso)' },
    { s: '+?',            label: '+?',   detail: 'Uno o más (perezoso)' },
  ]},
  { label: 'Grupos', blocks: [
    { s: `(${CURSOR})`,    label: '(...)',   detail: 'Grupo de captura' },
    { s: `(?:${CURSOR})`,  label: '(?:...)',detail: 'Grupo sin captura' },
    { s: `(?=${CURSOR})`,  label: '(?=...)',detail: 'Lookahead positivo' },
    { s: `(?!${CURSOR})`,  label: '(?!...)',detail: 'Lookahead negativo' },
    { s: `(?<=${CURSOR})`, label: '(?<=...)',detail: 'Lookbehind positivo' },
    { s: `(?<!${CURSOR})`, label: '(?<!...)',detail: 'Lookbehind negativo' },
    { s: '|',              label: '|',      detail: 'Alternativa (o)' },
  ]},
  { label: 'Escapes', blocks: [
    { s: '\\.', label: '\\.', detail: 'Punto literal' },
    { s: '\\*', label: '\\*', detail: 'Asterisco literal' },
    { s: '\\+', label: '\\+', detail: 'Más literal' },
    { s: '\\?', label: '\\?', detail: 'Interrogación literal' },
    { s: '\\(', label: '\\(', detail: 'Paréntesis literal' },
    { s: '\\[', label: '\\[', detail: 'Corchete literal' },
    { s: '\\n', label: '\\n', detail: 'Nueva línea' },
    { s: '\\t', label: '\\t', detail: 'Tabulación' },
  ]},
]

// ─── Token styles ─────────────────────────────────────────────────────────────

const TOKEN_STYLES: Record<TokenColor, string> = {
  anchor:      'bg-blue-900/40 border border-blue-700/60 text-blue-300',
  charclass:   'bg-green-900/40 border border-green-700/60 text-green-300',
  quantifier:  'bg-amber-900/40 border border-amber-700/60 text-amber-300',
  group:       'bg-purple-900/40 border border-purple-700/60 text-purple-300',
  literal:     'bg-gray-800/60 border border-gray-600/60 text-gray-300',
  alternation: 'bg-pink-900/40 border border-pink-700/60 text-pink-300',
  escape:      'bg-cyan-900/40 border border-cyan-700/60 text-cyan-300',
}

const LANG_LABELS: Record<LangKey, string> = {
  js: 'JavaScript', python: 'Python', go: 'Go', php: 'PHP', ruby: 'Ruby', java: 'Java',
}

const DEFAULT_TEXT = `usuario@empresa.com, admin@gmail.com
https://www.ejemplo.com/api?token=abc123
192.168.1.100 y 10.0.0.1, externa: 8.8.8.8
Fecha: 15/03/2024, ISO: 2024-03-15, Hora: 14:30
UUID: 550e8400-e29b-41d4-a716-446655440000
Color: #FF5733, #abc — Precio: 3.14 o -42`

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegexTester() {
  const [pattern, setPattern]       = useState('')
  const [flags, setFlags]           = useState({ g: true, i: false, m: false, s: false })
  const [testText, setTestText]     = useState(DEFAULT_TEXT)
  const [tab, setTab]               = useState<Tab>('tester')
  const [builderCat, setBuilderCat] = useState(0)
  const [patternCat, setPatternCat] = useState('Web')
  const [tooltip, setTooltip]       = useState<string | null>(null)
  const [replaceMode, setReplaceMode] = useState(false)
  const [replacement, setReplacement] = useState('')
  const [codeLang, setCodeLang]     = useState<LangKey>('js')
  const [linkCopied, setLinkCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const patternRef = useRef<HTMLInputElement>(null)

  const flagStr = useMemo(
    () => Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join(''),
    [flags],
  )

  // URL sync — read on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('p')
    const f = params.get('f')
    if (p) setPattern(p)
    if (f) setFlags({ g: f.includes('g'), i: f.includes('i'), m: f.includes('m'), s: f.includes('s') })
  }, [])

  // URL sync — write on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (pattern) params.set('p', pattern)
      const f = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('')
      if (f) params.set('f', f)
      const qs = params.toString()
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    }, 400)
    return () => clearTimeout(timer)
  }, [pattern, flags])

  const result      = useMemo(() => evalRegex(pattern, flagStr, testText), [pattern, flagStr, testText])
  const explanation = useMemo(() => (pattern ? explainPattern(pattern) : []), [pattern])
  const codeSnippet = useMemo(() => generateCode(pattern, flags, codeLang), [pattern, flags, codeLang])

  const replacedText = useMemo(() => {
    if (!replaceMode || !pattern || !result.valid) return null
    try { return testText.replace(new RegExp(pattern, flagStr), replacement) } catch { return null }
  }, [replaceMode, pattern, flagStr, testText, replacement, result.valid])

  const highlightedParts = useMemo(() => {
    if (!testText || result.matches.length === 0) return null
    const parts: { text: string; hi: boolean }[] = []
    let last = 0
    for (const m of result.matches) {
      if (m.text.length === 0) continue
      if (m.index > last) parts.push({ text: testText.slice(last, m.index), hi: false })
      parts.push({ text: m.text, hi: true })
      last = m.end
    }
    if (last < testText.length) parts.push({ text: testText.slice(last), hi: false })
    return parts
  }, [testText, result.matches])

  const insertAtCursor = useCallback((snippet: string) => {
    const markerIdx = snippet.indexOf(CURSOR)
    const text = snippet.replace(CURSOR, '')
    const cursorOffset = markerIdx >= 0 ? markerIdx : text.length
    const el = patternRef.current
    const start = el?.selectionStart ?? pattern.length
    const end   = el?.selectionEnd   ?? pattern.length
    setPattern(pattern.slice(0, start) + text + pattern.slice(end))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + cursorOffset, start + cursorOffset) })
  }, [pattern])

  const toggleFlag = (f: keyof typeof flags) => setFlags(prev => ({ ...prev, [f]: !prev[f] }))

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500)
  }

  const copyCode = async () => {
    if (!codeSnippet) return
    await navigator.clipboard.writeText(codeSnippet)
    setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500)
  }

  const patternBorder = !pattern
    ? 'border-gray-700 focus:border-gray-500'
    : result.valid ? 'border-green-800/60 focus:border-green-600' : 'border-red-700/70 focus:border-red-600'

  const TABS: [Tab, string][] = [['tester', 'Probar'], ['code', 'Código'], ['builder', 'Construir'], ['patterns', 'Patrones']]

  return (
    <div className="max-w-2xl space-y-4">

      {/* ── Pattern input ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Patrón</span>
          <div className="flex gap-1 ml-auto">
            {(['g', 'i', 'm', 's'] as const).map(f => (
              <button key={f} onClick={() => toggleFlag(f)}
                title={{ g: 'global — todas las coincidencias', i: 'case insensitive', m: 'multiline — ^ y $ por línea', s: 'dotAll — . incluye salto de línea' }[f]}
                className={`text-xs px-2 py-0.5 rounded border font-mono transition-colors ${flags[f] ? 'bg-green-900/40 border-green-700/60 text-green-300' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                {f}
              </button>
            ))}
            <button onClick={copyLink} title="Copiar link con el patrón actual"
              className="ml-1 text-xs px-2 py-0.5 rounded border font-mono transition-colors border-gray-700 text-gray-500 hover:text-gray-300">
              {linkCopied ? '✓ copiado' : '🔗'}
            </button>
          </div>
        </div>
        <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <span className="text-gray-500 pl-3 font-mono text-sm select-none">/</span>
          <input ref={patternRef} value={pattern} onChange={e => setPattern(e.target.value)}
            placeholder="escribe o construye tu regex..."
            className={`flex-1 bg-transparent px-2 py-3 text-gray-100 font-mono text-sm outline-none border-y border-transparent ${patternBorder}`}
            spellCheck={false} />
          <span className="text-gray-500 pr-3 font-mono text-sm select-none">/{flagStr}</span>
        </div>
        {pattern && !result.valid && <p className="mt-1.5 text-xs text-red-400 font-mono">{result.error}</p>}
        {pattern && <button onClick={() => setPattern('')} className="mt-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">Limpiar patrón</button>}
      </div>

      {/* ── Explanation strip ── */}
      {explanation.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Explicación del patrón</p>
          <div className="flex flex-wrap gap-1.5">
            {explanation.map((tok, i) => (
              <div key={i} className="relative">
                <button className={`px-2 py-0.5 rounded text-xs font-mono ${TOKEN_STYLES[tok.color]}`}
                  onMouseEnter={() => setTooltip(`${i}`)} onMouseLeave={() => setTooltip(null)}
                  onFocus={() => setTooltip(`${i}`)}       onBlur={() => setTooltip(null)}>
                  {tok.label}
                </button>
                {tooltip === `${i}` && (
                  <div className="absolute bottom-full left-0 mb-1.5 z-10 w-52 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 shadow-xl pointer-events-none">
                    <code className="text-yellow-300 font-mono">{tok.raw}</code>
                    <p className="mt-0.5 text-gray-400">{tok.detail}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Tester tab ── */}
      {tab === 'tester' && (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Texto de prueba</p>
            <textarea value={testText} onChange={e => setTestText(e.target.value)} rows={6} spellCheck={false}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono text-xs focus:outline-none focus:border-gray-500 resize-y" />
          </div>

          {pattern && result.valid && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${result.matches.length > 0 ? 'bg-green-900/20 border border-green-800/40 text-green-400' : 'bg-gray-800/60 border border-gray-700 text-gray-500'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {result.matches.length > 0
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              </svg>
              {result.matches.length > 0
                ? `${result.matches.length} coincidencia${result.matches.length !== 1 ? 's' : ''}`
                : 'Sin coincidencias'}
            </div>
          )}

          {highlightedParts && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Vista previa</p>
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 font-mono text-xs whitespace-pre-wrap break-all leading-relaxed">
                {highlightedParts.map((part, i) =>
                  part.hi
                    ? <mark key={i} className="bg-yellow-500/25 text-yellow-200 rounded-sm px-0.5">{part.text}</mark>
                    : <span key={i} className="text-gray-400">{part.text}</span>
                )}
              </div>
            </div>
          )}

          {result.matches.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Coincidencias</p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {result.matches.slice(0, 50).map((m, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 w-5 text-right shrink-0">{i + 1}</span>
                      <span className="text-yellow-300 break-all">{m.text || '(vacío)'}</span>
                      <span className="text-gray-600 ml-auto shrink-0">pos {m.index}</span>
                    </div>
                    {m.groups.some(g => g !== undefined) && (
                      <div className="mt-1.5 pl-8 flex flex-wrap gap-1.5">
                        {m.groups.map((g, gi) => g !== undefined && (
                          <span key={gi} className="bg-purple-900/30 border border-purple-700/40 text-purple-300 px-1.5 py-0.5 rounded text-xs">g{gi + 1}: {g || '(vacío)'}</span>
                        ))}
                        {Object.entries(m.namedGroups).map(([k, v]) => (
                          <span key={k} className="bg-blue-900/30 border border-blue-700/40 text-blue-300 px-1.5 py-0.5 rounded text-xs">{k}: {v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {result.matches.length > 50 && <p className="text-xs text-gray-600 text-center py-1">…y {result.matches.length - 50} más</p>}
              </div>
            </div>
          )}

          {/* ── Replace mode ── */}
          <div className="border-t border-gray-800 pt-3">
            <button onClick={() => setReplaceMode(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${replaceMode ? 'bg-blue-900/30 border-blue-700/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>
              {replaceMode ? '▾ Modo reemplazar' : '▸ Modo reemplazar'}
            </button>

            {replaceMode && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Reemplazo</p>
                  <input value={replacement} onChange={e => setReplacement(e.target.value)}
                    placeholder="ej: $1/$2  o  [$&]  o  $<nombre>"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 font-mono text-sm focus:outline-none focus:border-gray-500"
                    spellCheck={false} />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { token: '$&',        tip: 'Match completo' },
                      { token: '$1',        tip: 'Grupo 1' },
                      { token: '$2',        tip: 'Grupo 2' },
                      { token: '$`',        tip: 'Texto antes del match' },
                      { token: "$'",        tip: 'Texto después del match' },
                    ].map(({ token, tip }) => (
                      <button key={token}
                        onClick={() => setReplacement(r => r + token)}
                        title={tip}
                        className="text-xs px-2 py-0.5 rounded border border-cyan-800/60 bg-cyan-900/20 text-cyan-300 font-mono hover:bg-cyan-900/40 transition-colors">
                        {token}
                      </button>
                    ))}
                    <span className="text-xs text-gray-600 self-center">— click para insertar</span>
                  </div>
                </div>
                {replacedText !== null && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Resultado</p>
                    <div className="bg-gray-900 border border-blue-900/40 rounded-lg px-4 py-3 font-mono text-xs text-gray-200 whitespace-pre-wrap break-all leading-relaxed">
                      {replacedText}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Code tab ── */}
      {tab === 'code' && (
        <div className="space-y-3">
          {!pattern && (
            <p className="text-sm text-gray-500">Ingresá un patrón para ver el código generado.</p>
          )}

          {pattern && (
            <>
              {/* Language selector */}
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(LANG_LABELS) as LangKey[]).map(lang => (
                  <button key={lang} onClick={() => setCodeLang(lang)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${codeLang === lang ? 'bg-green-900/40 border border-green-700/60 text-green-300' : 'border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'}`}>
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>

              {/* Code block */}
              <div className="relative">
                <pre className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-4 font-mono text-xs text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">
                  {codeSnippet}
                </pre>
                <button onClick={copyCode}
                  className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded border transition-colors ${codeCopied ? 'border-green-700/60 text-green-400 bg-green-900/20' : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 bg-gray-900'}`}>
                  {codeCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Reemplazá <code className="text-gray-500">text</code> con tu variable. Algunos lenguajes pueden requerir ajustes de escaping.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Builder tab ── */}
      {tab === 'builder' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Click en un bloque para insertarlo en el patrón en la posición del cursor.</p>
          <div className="flex flex-wrap gap-1.5">
            {BUILDER_CATS.map((cat, idx) => (
              <button key={cat.label} onClick={() => setBuilderCat(idx)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${builderCat === idx ? 'bg-green-900/40 border border-green-700/60 text-green-300' : 'border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'}`}>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BUILDER_CATS[builderCat].blocks.map(block => (
              <button key={block.s + block.label} onClick={() => insertAtCursor(block.s)}
                className="flex flex-col items-start px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg hover:border-gray-500 hover:bg-gray-800 transition-colors text-left group">
                <code className="text-green-400 font-mono text-sm mb-1 group-hover:text-green-300">{block.label}</code>
                <span className="text-gray-500 text-xs leading-tight">{block.detail}</span>
              </button>
            ))}
          </div>
          {pattern && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Patrón actual</p>
              <code className="text-green-400 font-mono text-sm break-all">{pattern}</code>
            </div>
          )}
        </div>
      )}

      {/* ── Patterns tab ── */}
      {tab === 'patterns' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Click en "Usar" para cargar el patrón y sus flags.</p>
          <div className="flex flex-wrap gap-1.5">
            {PATTERN_CATS.map(cat => (
              <button key={cat} onClick={() => setPatternCat(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${patternCat === cat ? 'bg-green-900/40 border border-green-700/60 text-green-300' : 'border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {PATTERN_LIBRARY.filter(p => p.cat === patternCat).map(p => (
              <div key={p.label} className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 mb-0.5">{p.label}</p>
                    <code className="text-green-400 font-mono text-xs break-all">{p.pattern}</code>
                    <p className="text-gray-500 text-xs mt-1">{p.example}</p>
                  </div>
                  <button
                    onClick={() => { setPattern(p.pattern); setFlags(f => ({ ...f, g: p.flags.includes('g'), i: p.flags.includes('i') })); setTab('tester') }}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-green-700/60 text-green-400 hover:bg-green-900/20 transition-colors">
                    Usar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
