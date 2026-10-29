import { siDocker, siGit, siJenkins, siKubernetes, siLinux, siTerraform } from 'simple-icons'

export interface Category {
  id: string
  label: string
  hex: string
  svgPath: string
  description: string
}

const siWindowsHex = '0078D4'
const siWindowsPath = 'M0 0h11.5v11.5H0V0zm12.5 0H24v11.5H12.5V0zM0 12.5h11.5V24H0V12.5zm12.5 0H24V24H12.5V12.5z'

export const CATEGORIES: Category[] = [
  { id: 'docker',     label: 'Docker',     hex: siDocker.hex,     svgPath: siDocker.path,
    description: 'Imágenes, Dockerfile, Compose, redes, volúmenes, daemon.json, Traefik, monitoreo, registry privado y troubleshooting de contenedores en producción.' },
  { id: 'git',        label: 'Git',        hex: siGit.hex,        svgPath: siGit.path,
    description: 'Git del día a día a avanzado: ramas y fusión, remotos, hooks, tags y releases, LFS, commits firmados, worktrees, submódulos y GitOps.' },
  { id: 'jenkins',    label: 'Jenkins',    hex: siJenkins.hex,    svgPath: siJenkins.path,
    description: 'Pipelines declarativos y scripted, Shared Libraries, agentes, credenciales, Artifactory y SonarQube, orquestación de despliegues, backup/DRP y troubleshooting.' },
  { id: 'kubernetes', label: 'Kubernetes', hex: siKubernetes.hex, svgPath: siKubernetes.path,
    description: 'Kubernetes de 100 a 400: workloads, networking, storage, seguridad, observabilidad, operación de clusters y troubleshooting.' },
  { id: 'linux',      label: 'Linux',      hex: siLinux.hex,      svgPath: siLinux.path,
    description: 'Administración Linux: permisos, systemd, shell scripting, SSH, redes y DNS, discos y LVM, logs, hardening, certificados y tuning del kernel.' },
  { id: 'terraform',  label: 'Terraform',  hex: siTerraform.hex,  svgPath: siTerraform.path,
    description: 'Terraform y Terragrunt: HCL, módulos, state, entornos, AWS y OCI, cloud-init, testing, policy as code, DRP y troubleshooting.' },
  { id: 'windows',    label: 'Windows',    hex: siWindowsHex,     svgPath: siWindowsPath,
    description: 'Windows Server con PowerShell: NTFS, servicios, firewall, Active Directory, IIS, WinRM, Hyper-V, SMB, WMI/CIM, certificados y tareas programadas.' },
  { id: 'clarive',    label: 'Clarive',    hex: 'FFFFFF',         svgPath: 'M 4 2 h 16 a 2 2 0 0 1 2 2 v 16 a 2 2 0 0 1 -2 2 H 4 a 2 2 0 0 1 -2 -2 V 4 a 2 2 0 0 1 2 -2 z M 12 4 a 8 8 0 1 0 0 16 a 8 8 0 1 0 0 -16 z M 15 16.33 A 5 5 0 1 1 15 7.67 V 10.35 A 3 3 0 1 0 15 13.65 Z',
    description: 'Clarive: arquitectura, reglas de eventos, CI personalizados, consultas MongoDB, scripts Perl y procedimientos operativos.' },
]

export function getCategoryHex(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.hex ?? '4ade80'
}

// Learning tracks keyed by the first digit of the slug's numeric prefix (101-..., 201-...)
const TRACKS: Record<string, Record<string, string>> = {
  kubernetes: {
    '1': '100 · Fundamentos',
    '2': '200 · Administración (CKA)',
    '3': '300 · Aplicaciones (CKAD)',
    '4': '400 · Seguridad (CKS)',
  },
}

export interface ArticleGroup<T> {
  label: string | null
  items: T[]
}

export function groupByTrack<T extends { slug: string }>(categoryId: string, items: T[]): ArticleGroup<T>[] {
  const tracks = TRACKS[categoryId]
  if (!tracks) return [{ label: null, items }]

  const groups: ArticleGroup<T>[] = []
  for (const item of items) {
    const label = tracks[/^(\d)\d\d/.exec(item.slug)?.[1] ?? ''] ?? 'Otros'
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

export function getCategoryLabel(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.label ?? id.charAt(0).toUpperCase() + id.slice(1)
}
