import { NextRequest, NextResponse } from 'next/server'
import tls from 'tls'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const host = searchParams.get('host')

  if (!host) {
    return NextResponse.json({ error: 'Host is required' }, { status: 400 })
  }

  return new Promise<NextResponse>((resolve) => {
    // Para prevenir colgar la request eternamente
    const timeout = setTimeout(() => {
      if (socket) {
        socket.destroy()
      }
      resolve(NextResponse.json({ error: 'Connection timeout' }, { status: 408 }))
    }, 5000)

    const socket = tls.connect(443, host, {
      servername: host,
      rejectUnauthorized: false // Queremos inspeccionar incluso certificados inválidos
    }, () => {
      clearTimeout(timeout)
      const cert = socket.getPeerCertificate(true) // true para chain completa
      socket.end()

      if (!cert || Object.keys(cert).length === 0) {
        resolve(NextResponse.json({ error: 'No certificate found' }, { status: 404 }))
        return
      }

      // Traversing the certificate chain
      const chain = []
      let currentCert = cert
      const seen = new Set()

      while (currentCert && Object.keys(currentCert).length > 0) {
        if (seen.has(currentCert.fingerprint)) break
        seen.add(currentCert.fingerprint)

        chain.push({
          subject: currentCert.subject,
          issuer: currentCert.issuer,
          valid_from: currentCert.valid_from,
          valid_to: currentCert.valid_to,
          subjectaltname: currentCert.subjectaltname,
          infoAccess: currentCert.infoAccess,
          fingerprint: currentCert.fingerprint,
          fingerprint256: currentCert.fingerprint256,
          serialNumber: currentCert.serialNumber
        })

        if (currentCert.issuerCertificate && currentCert.fingerprint === currentCert.issuerCertificate.fingerprint) {
          break // Es Root CA (self-signed)
        }
        currentCert = currentCert.issuerCertificate
      }

      resolve(NextResponse.json({ chain }))
    })

    socket.on('error', (err) => {
      clearTimeout(timeout)
      resolve(NextResponse.json({ error: err.message || 'TLS connection failed' }, { status: 400 }))
    })
  })
}

