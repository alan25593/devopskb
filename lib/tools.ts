export interface Tool {
  id: string
  label: string
  description: string
  href: string
  iconPath: string
  group: string
  badges?: string[]
  status?: 'Stable' | 'Beta' | 'Nuevo'
}

export const TOOLS: Tool[] = [
  {
    id: 'subnet',
    label: 'Subnet Calculator',
    description: 'Calculá red, broadcast, rango de hosts y máscara a partir de una IP/CIDR.',
    href: '/tools/subnet',
    iconPath: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
    group: 'Networking',
    badges: ['Offline', 'Browser Only', 'Instantáneo'],
    status: 'Stable'
  },
  {
    id: 'cidr',
    label: 'CIDR Visualizer',
    description: 'Visualizá un bloque de red grande segmentado en subredes más pequeñas de forma jerárquica.',
    href: '/tools/cidr',
    iconPath: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    group: 'Networking',
    badges: ['Offline', 'Browser Only'],
    status: 'Nuevo'
  },
  {
    id: 'dns',
    label: 'DNS Toolkit',
    description: 'Consultá registros DNS (A, AAAA, MX, TXT, CNAME) y Reverse IP de forma rápida.',
    href: '/tools/dns',
    iconPath: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    group: 'Networking',
    badges: ['Hybrid'],
    status: 'Stable'
  },
  {
    id: 'k8s-analyzer',
    label: 'Kubernetes Manifest Analyzer',
    description: 'Detectá recursos faltantes, imágenes `latest`, configuraciones inseguras y errores comunes.',
    href: '/tools/k8s-analyzer',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    group: 'Kubernetes',
    badges: ['Browser Only', 'Offline'],
    status: 'Stable'
  },
  {
    id: 'k8s-resources',
    label: 'Kubernetes Resource Calculator',
    description: 'Calculá el consumo total de CPU y memoria a partir de Deployments, StatefulSets o DaemonSets.',
    href: '/tools/k8s-resources',
    iconPath: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    group: 'Kubernetes',
    badges: ['Browser Only', 'Offline'],
    status: 'Nuevo'
  },
  {
    id: 'rbac',
    label: 'RBAC Viewer',
    description: 'Visualizá permisos, Roles, ClusterRoles y Bindings en una matriz fácil de interpretar.',
    href: '/tools/rbac',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    group: 'Kubernetes',
    badges: ['Offline', 'Browser Only'],
    status: 'Beta'
  },
  {
    id: 'netpol',
    label: 'NetworkPolicy Visualizer',
    description: 'Convertí NetworkPolicies de K8s en un diagrama visual de flujos permitidos de Ingress y Egress.',
    href: '/tools/netpol',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    group: 'Kubernetes',
    badges: ['Offline', 'Browser Only'],
    status: 'Nuevo'
  },
  {
    id: 'jwt',
    label: 'JWT Decoder',
    description: 'Decodificá un token JWT y visualizá header, payload y estado de expiración.',
    href: '/tools/jwt',
    iconPath: 'M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z',
    group: 'Seguridad & Crypto',
    badges: ['Browser Only', 'Offline'],
    status: 'Stable'
  },
  {
    id: 'hash',
    label: 'Encoding & Hash Toolkit',
    description: 'Generá Hashes (MD5, SHA) de forma local. Codificá y decodificá Base64 y URL Encode de manera instantánea y segura.',
    href: '/tools/hash',
    iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    group: 'Seguridad & Crypto',
    badges: ['Instantáneo', 'Offline', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'certificate',
    label: 'Certificate Inspector',
    description: 'Analizá certificados SSL/TLS desde una URL o pegando el texto PEM. Chequeá SANs, issuer y expiración.',
    href: '/tools/certificate',
    iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    group: 'Seguridad & Crypto',
    badges: ['Hybrid'],
    status: 'Stable'
  },
  {
    id: 'yaml',
    label: 'YAML Validator',
    description: 'Validá y formateá manifiestos de Kubernetes, Docker Compose o GitHub Actions con detección de errores por línea.',
    href: '/tools/yaml',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    group: 'Data & Dev',
    badges: ['Browser Only', 'Offline'],
    status: 'Stable'
  },
  {
    id: 'json',
    label: 'JSON Formatter',
    description: 'Expandí JSON minificado con indentación limpia o comprimilo a una línea. Se formatea automáticamente al pegar.',
    href: '/tools/json',
    iconPath: 'M4 6h16M4 12h16M4 18h7',
    group: 'Data & Dev',
    badges: ['Offline', 'Instantáneo', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'regex',
    label: 'Regex Tester',
    description: 'Construí, testá y entendé expresiones regulares. Librería de patrones comunes, builder visual y explicación token por token.',
    href: '/tools/regex',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    group: 'Data & Dev',
    badges: ['Offline', 'Browser Only'],
    status: 'Stable'
  },
  {

    id: 'promql',
    label: 'PromQL Builder',
    description: 'Construí consultas PromQL complejas de forma visual paso a paso sin pelear con la sintaxis.',
    href: '/tools/promql',
    iconPath: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    group: 'Data & Dev',
    badges: ['Browser Only', 'Offline'],
    status: 'Nuevo'
  },
  {
    id: 'cron',
    label: 'Cron Explainer',
    description: 'Pegá una expresión cron y obtené una explicación en español con las próximas ejecuciones.',
    href: '/tools/cron',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    group: 'Utilidades',
    badges: ['Offline', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'timestamp',
    label: 'Timestamp Converter',
    description: 'Convertí timestamps (Epoch, ISO8601, RFC3339) entre UTC y Local. Actualización en tiempo real.',
    href: '/tools/timestamp',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    group: 'Utilidades',
    badges: ['Offline', 'Instantáneo', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'password',
    label: 'Password Generator',
    description: 'Generá contraseñas seguras o passphrases con alto nivel de entropía. Soporte para generación múltiple y reglas personalizadas.',
export interface Tool {
  id: string
  label: string
  description: string
  href: string
  iconPath: string
  group: string
  badges?: string[]
  status?: 'Stable' | 'Beta' | 'Nuevo'
}

export const TOOLS: Tool[] = [
  {
    id: 'subnet',
    label: 'Subnet Calculator',
    description: 'Calculá red, broadcast, rango de hosts y máscara a partir de una IP/CIDR.',
    href: '/tools/subnet',
    iconPath: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
    group: 'Networking',
    badges: ['Offline', 'Browser Only', 'Instantáneo'],
    status: 'Stable'
  },
  {
    id: 'cidr',
    label: 'CIDR Visualizer',
    description: 'Visualizá un bloque de red grande segmentado en subredes más pequeñas de forma jerárquica.',
    href: '/tools/cidr',
    iconPath: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    group: 'Networking',
    badges: ['Offline', 'Browser Only'],
    status: 'Nuevo'
  },
  {
    id: 'dns',
    label: 'DNS Toolkit',
    description: 'Consultá registros DNS (A, AAAA, MX, TXT, CNAME) y Reverse IP de forma rápida.',
    href: '/tools/dns',
    iconPath: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    group: 'Networking',
    badges: ['Hybrid'],
    status: 'Stable'
  },
  {
    id: 'k8s-analyzer',
    label: 'Kubernetes Manifest Analyzer',
    description: 'Detectá recursos faltantes, imágenes `latest`, configuraciones inseguras y errores comunes.',
    href: '/tools/k8s-analyzer',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    group: 'Kubernetes',
    badges: ['Browser Only', 'Offline'],
    status: 'Stable'
  },
  {
    id: 'k8s-resources',
    label: 'Kubernetes Resource Calculator',
    description: 'Calculá el consumo total de CPU y memoria a partir de Deployments, StatefulSets o DaemonSets.',
    href: '/tools/k8s-resources',
    iconPath: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    group: 'Kubernetes',
    badges: ['Browser Only', 'Offline'],
    status: 'Nuevo'
  },
  {
    id: 'rbac',
    label: 'RBAC Viewer',
    description: 'Visualizá permisos, Roles, ClusterRoles y Bindings en una matriz fácil de interpretar.',
    href: '/tools/rbac',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    group: 'Kubernetes',
    badges: ['Offline', 'Browser Only'],
    status: 'Beta'
  },
  {
    id: 'netpol',
    label: 'NetworkPolicy Visualizer',
    description: 'Convertí NetworkPolicies de K8s en un diagrama visual de flujos permitidos de Ingress y Egress.',
    href: '/tools/netpol',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    group: 'Kubernetes',
    badges: ['Offline', 'Browser Only'],
    status: 'Nuevo'
  },
  {
    id: 'jwt',
    label: 'JWT Decoder',
    description: 'Decodificá un token JWT y visualizá header, payload y estado de expiración.',
    href: '/tools/jwt',
    iconPath: 'M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z',
    group: 'Seguridad & Crypto',
    badges: ['Browser Only', 'Offline'],
    status: 'Stable'
  },
  {
    id: 'hash',
    label: 'Encoding & Hash Toolkit',
    description: 'Generá Hashes (MD5, SHA) de forma local. Codificá y decodificá Base64 y URL Encode de manera instantánea y segura.',
    href: '/tools/hash',
    iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    group: 'Seguridad & Crypto',
    badges: ['Instantáneo', 'Offline', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'certificate',
    label: 'Certificate Inspector',
    description: 'Analizá certificados SSL/TLS desde una URL o pegando el texto PEM. Chequeá SANs, issuer y expiración.',
    href: '/tools/certificate',
    iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    group: 'Seguridad & Crypto',
    badges: ['Hybrid'],
    status: 'Stable'
  },
  {
    id: 'yaml',
    label: 'YAML Validator',
    description: 'Validá y formateá manifiestos de Kubernetes, Docker Compose o GitHub Actions con detección de errores por línea.',
    href: '/tools/yaml',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    group: 'Data & Dev',
    badges: ['Browser Only', 'Offline'],
    status: 'Stable'
  },
  {
    id: 'json',
    label: 'JSON Formatter',
    description: 'Expandí JSON minificado con indentación limpia o comprimilo a una línea. Se formatea automáticamente al pegar.',
    href: '/tools/json',
    iconPath: 'M4 6h16M4 12h16M4 18h7',
    group: 'Data & Dev',
    badges: ['Offline', 'Instantáneo', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'regex',
    label: 'Regex Tester',
    description: 'Construí, testá y entendé expresiones regulares. Librería de patrones comunes, builder visual y explicación token por token.',
    href: '/tools/regex',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    group: 'Data & Dev',
    badges: ['Offline', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'promql',
    label: 'PromQL Builder',
    description: 'Construí consultas PromQL complejas de forma visual paso a paso sin pelear con la sintaxis.',
    href: '/tools/promql',
    iconPath: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    group: 'Data & Dev',
    badges: ['Browser Only', 'Offline'],
    status: 'Nuevo'
  },
  {
    id: 'cron',
    label: 'Cron Explainer',
    description: 'Pegá una expresión cron y obtené una explicación en español con las próximas ejecuciones.',
    href: '/tools/cron',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    group: 'Utilidades',
    badges: ['Offline', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'timestamp',
    label: 'Timestamp Converter',
    description: 'Convertí timestamps (Epoch, ISO8601, RFC3339) entre UTC y Local. Actualización en tiempo real.',
    href: '/tools/timestamp',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    group: 'Utilidades',
    badges: ['Offline', 'Instantáneo', 'Browser Only'],
    status: 'Stable'
  },
  {
    id: 'password',
    label: 'Password Generator',
    description: 'Generá contraseñas seguras o passphrases con alto nivel de entropía. Soporte para generación múltiple y reglas personalizadas.',
    href: '/tools/password',
    iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    group: 'Seguridad & Crypto',
    badges: ['Offline', 'Browser Only', 'Instantáneo'],
    status: 'Nuevo'
  },
  {
    id: 'qr',
    label: 'QR Generator',
    description: 'Generá códigos QR vectoriales al instante, sin enviar datos. Personalizá colores, sacá el fondo y descargalos como PNG o SVG.',
    href: '/tools/qr',
    iconPath: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h1.5v1.5H15zM18.5 15H21v1.5h-2.5zM15 18.5h1.5V21H15zM18.5 18.5H21V21h-2.5z',
    group: 'Utilidades',
    badges: ['Offline', 'Browser Only', 'Instantáneo'],
    status: 'Nuevo'
  }
]
