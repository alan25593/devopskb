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
  { id: 'clarive',    label: 'Clarive',    hex: 'FFFFFF',         svgPath: 'M 4 2 h 16 a 2 2 0 0 1 2 2 v 16 a 2 2 0 0 1 -2 2 H 4 a 2 2 0 0 1 -2 -2 V 4 a 2 2 0 0 1 2 -2 z M 12 4 a 8 8 0 1 0 0 16 a 8 8 0 1 0 0 -16 z M 15 16.33 A 5 5 0 1 1 15 7.67 V 10.35 A 3 3 0 1 0 15 13.65 Z' },
]

export function getCategoryHex(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.hex ?? '4ade80'
}
