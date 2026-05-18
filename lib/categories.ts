import { siDocker, siGit, siKubernetes, siLinux, siTerraform } from 'simple-icons'

export interface Category {
  id: string
  label: string
  hex: string
  svgPath: string
}

export const CATEGORIES: Category[] = [
  { id: 'docker',     label: 'Docker',     hex: siDocker.hex,     svgPath: siDocker.path     },
  { id: 'git',        label: 'Git',        hex: siGit.hex,        svgPath: siGit.path        },
  { id: 'kubernetes', label: 'Kubernetes', hex: siKubernetes.hex, svgPath: siKubernetes.path },
  { id: 'linux',      label: 'Linux',      hex: siLinux.hex,      svgPath: siLinux.path      },
  { id: 'terraform',  label: 'Terraform',  hex: siTerraform.hex,  svgPath: siTerraform.path  },
]

export function getCategoryHex(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.hex ?? '4ade80'
}
