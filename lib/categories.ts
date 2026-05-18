import { siDocker, siGit, siKubernetes, siLinux, siTerraform } from 'simple-icons'

export interface Category {
  id: string
  label: string
  hex: string
  svgPath: string
}

const siWindowsHex = '0078D4'
const siWindowsPath = 'M0 0h11.5v11.5H0V0zm12.5 0H24v11.5H12.5V0zM0 12.5h11.5V24H0V12.5zm12.5 0H24V24H12.5V12.5z'

export const CATEGORIES: Category[] = [
  { id: 'docker',     label: 'Docker',     hex: siDocker.hex,     svgPath: siDocker.path     },
  { id: 'git',        label: 'Git',        hex: siGit.hex,        svgPath: siGit.path        },
  { id: 'kubernetes', label: 'Kubernetes', hex: siKubernetes.hex, svgPath: siKubernetes.path },
  { id: 'linux',      label: 'Linux',      hex: siLinux.hex,      svgPath: siLinux.path      },
  { id: 'terraform',  label: 'Terraform',  hex: siTerraform.hex,  svgPath: siTerraform.path  },
  { id: 'windows',    label: 'Windows',    hex: siWindowsHex,     svgPath: siWindowsPath     },
]

export function getCategoryHex(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.hex ?? '4ade80'
}
