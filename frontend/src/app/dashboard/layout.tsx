'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard',              label: 'Overview',     icon: '📊' },
  { href: '/dashboard/queue',        label: 'Wash Queue',   icon: '🚿' },
  { href: '/dashboard/approvals',    label: 'Approvals',    icon: '✅' },
  { href: '/dashboard/vehicles',     label: 'Vehicles',     icon: '🚗' },
  { href: '/dashboard/customers',    label: 'Customers',    icon: '👥' },
  { href: '/dashboard/workers',      label: 'Workers',      icon: '👷' },
  { href: '/dashboard/appointments', label: 'Appointments', icon: '📅' },
  { href: '/dashboard/packages',     label: 'Packages',     icon: '🧴' },
  { href: '/dashboard/summary',      label: 'Daily Summary',icon: '💰' },
  { href: '/dashboard/reports',      label: 'Reports',      icon: '📋' },
  { href: '/dashboard/settings',     label: 'Settings',     icon: '⚙️'  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
router.push('/login-page')  }

  const sidebar = (
    <div style={{ width: 220, background: '#0c1a2e', borderRight: '0.5px solid rgba(56,189,248,0.12)', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '0.5px solid rgba(56,189,248,0.1)' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700 }}><span style={{ color: '#38bdf8' }}>Clean</span><span style={{ color: '#e8f4fd' }}>Pass</span></div>
        <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.35)', marginTop: 3, letterSpacing: 0.5 }}>Wash Station Dashboard</div>
      </div>
      <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 1.25rem', textDecoration: 'none', background: active ? 'rgba(56,189,248,0.12)' : 'transparent', borderRight: active ? '3px solid #38bdf8' : '3px solid transparent', color: active ? '#38bdf8' : 'rgba(232,244,253,0.55)', fontSize: 14, fontWeight: active ? 600 : 400, transition: 'all 0.15s' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '1rem 1.25rem', borderTop: '0.5px solid rgba(56,189,248,0.1)' }}>
        <button onClick={logout} style={{ width: '100%', background: 'transparent', border: '0.5px solid rgba(232,244,253,0.15)', borderRadius: 8, padding: '9px', fontSize: 13, color: 'rgba(232,244,253,0.4)', cursor: 'pointer' }}>Sign out</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f2035', overflow: 'hidden' }}>
      <div style={{ display: 'none' }} className="sidebar-desktop">{sidebar}</div>
      <style>{`.sidebar-desktop{display:flex!important;flex-direction:column}@media(max-width:768px){.sidebar-desktop{display:none!important}.mobile-btn{display:flex!important}}`}</style>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)' }} onClick={() => setOpen(false)} />}
      {open && <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }}>{sidebar}</div>}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'none', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#0c1a2e', borderBottom: '0.5px solid rgba(56,189,248,0.12)' }} className="mobile-btn">
          <button onClick={() => setOpen(true)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>☰</button>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700 }}><span style={{ color: '#38bdf8' }}>Clean</span><span style={{ color: '#e8f4fd' }}>Pass</span></div>
        </div>
        <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>{children}</main>
      </div>
    </div>
  )
}
