export interface Tool {
  id: string
  label: string
  description: string
  href: string
  iconPath: string
}

export const TOOLS: Tool[] = [
  {
    id: 'subnet',
    label: 'Subnet Calculator',
    description: 'Calculá red, broadcast, rango de hosts y máscara a partir de una IP/CIDR.',
    href: '/tools/subnet',
    iconPath: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
  },
  {
    id: 'cron',
    label: 'Cron Explainer',
    description: 'Pegá una expresión cron y obtené una explicación en español con las próximas ejecuciones.',
    href: '/tools/cron',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  },
  {
    id: 'jwt',
    label: 'JWT Decoder',
    description: 'Decodificá un token JWT y visualizá header, payload y estado de expiración.',
    href: '/tools/jwt',
    iconPath: 'M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z',
  },
  {
    id: 'yaml',
    label: 'YAML Validator',
    description: 'Validá y formateá manifiestos de Kubernetes, Docker Compose o GitHub Actions con detección de errores por línea.',
    href: '/tools/yaml',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  },
  {
    id: 'json',
    label: 'JSON Formatter',
    description: 'Expandí JSON minificado con indentación limpia o comprimilo a una línea. Se formatea automáticamente al pegar.',
    href: '/tools/json',
    iconPath: 'M4 6h16M4 12h16M4 18h7',
  },
]
