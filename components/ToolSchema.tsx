import React from 'react'

interface ToolSchemaProps {
  name: string
  description: string
  url: string
}

export default function ToolSchema({ name, description, url }: ToolSchemaProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': name,
    'description': description,
    'url': `https://kb.wiresops.com${url}`,
    'operatingSystem': 'All',
    'applicationCategory': 'DeveloperApplication',
    'browserRequirements': 'Requires JavaScript. Requires HTML5.',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD'
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
