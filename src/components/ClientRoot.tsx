'use client'

import dynamic from 'next/dynamic'

const AppShell = dynamic(
  () => import('@/components/AppShell').then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', minHeight: '100vh',
        alignItems: 'center', justifyContent: 'center',
        background: '#080E1A',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #1F3A6E, #2E5FA3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: 18,
            margin: '0 auto 16px',
          }}>WB</div>
          <p style={{ color: '#6B7E99', fontSize: 14 }}>Loading SEO Report Generator v6...</p>
        </div>
      </div>
    ),
  }
)

export function ClientRoot() {
  return <AppShell />
}
