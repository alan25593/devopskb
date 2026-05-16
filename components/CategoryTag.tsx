import { getCategoryHex } from '@/lib/categories'

interface Props {
  category: string
  className?: string
}

export default function CategoryTag({ category, className = '' }: Props) {
  const hex = getCategoryHex(category)
  return (
    <span
      className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ${className}`}
      style={{
        color: `#${hex}`,
        backgroundColor: `#${hex}18`,
        border: `1px solid #${hex}40`,
      }}
    >
      {category}
    </span>
  )
}
