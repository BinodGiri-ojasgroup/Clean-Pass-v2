'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api' // 👈 Import the centralized API client

interface Stats { 
  totalVehicles: number; 
  totalWashes: number; 
  totalRedemptions: number; 
  pendingRequests: number; 
  todayWashes: number; 
  unpaidWashes: number; 
  upcomingAppts: number; 
  revenue30d: number; 
  days7: {date:string;count:number}[] 
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 🚨 Updated: Uses the centralized 'api' client and the correct backend route '/summary/'
        // The JWT interceptor automatically attaches the Bearer token from localStorage
        const response = await api.get('/summary/')
        
        if (response.data.success) {
          setStats(response.data.data) 
        } else {
          setError(response.data.error || 'Failed to parse dashboard data.')
        }
      } catch (err: any) {
        console.error('Dashboard fetch error:', err)
        
        // Handle 401 Unauthorized (Fallback if the interceptor fails to refresh the token)
        if (err.response?.status === 401) {
           setError('Session expired. Redirecting to login...')
           setTimeout(() => window.location.href = '/login-page', 2000)
        } else {
           setError('Unable to link with backend system.')
        }
      }
    }

    fetchStats()
  }, [])

  const theme = '#38bdf8'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '1.25rem 1.5rem' }

  if (error) return <div style={{ color: '#f87171', padding: '3rem', textAlign: 'center' }}>⚠️ {error}</div>
  if (!stats) return <div style={{ color: 'rgba(232,244,253,0.3)', padding: '3rem', textAlign: 'center' }}>Loading…</div>

  const maxDay = Math.max(...stats.days7.map(d => d.count), 1)
  async function handleLogout() {
    try {
      // 1. Tell the backend we are logging out (optional, but good for tracking)
      await api.post('/auth/logout/')
    } catch (err) {
      console.error("Logout API failed, but continuing to clear tokens...")
    } finally {
      // 2. CRITICAL: Clear tokens from localStorage
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      
      // 3. Redirect to login page
      window.location.href = '/login-page'
    }
  }
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Overview</h1>
        <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>Your wash station at a glance</p>
      </div>

      {stats.pendingRequests > 0 && (
        <Link href="/dashboard/approvals" style={{ textDecoration: 'none', display: 'block', marginBottom: '1.5rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 12, padding: '14px 18px', color: theme, fontWeight: 600, fontSize: 14 }}>
          ✅ {stats.pendingRequests} pending wash request{stats.pendingRequests !== 1 ? 's' : ''} — tap to approve →
        </Link>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total vehicles', value: stats.totalVehicles, icon: '🚗', color: theme },
          { label: 'Active washes', value: stats.totalWashes, icon: '🧴', color: '#34d399' },
          { label: 'Free washes earned', value: stats.totalRedemptions, icon: '🎁', color: '#f59e0b' },
          { label: 'Today\'s washes', value: stats.todayWashes, icon: '📅', color: '#a78bfa' },
          { label: 'Unpaid washes', value: stats.unpaidWashes, icon: '💳', color: '#f87171' },
          { label: 'Revenue (30d)', value: `NPR ${stats.revenue30d.toLocaleString()}`, icon: '💰', color: '#34d399', wide: true },
        ].map(s => (
          <div key={s.label} style={{ ...card, gridColumn: (s as { wide?: boolean }).wide ? 'span 2' : 'span 1' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(232,244,253,0.5)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Washes — last 7 days</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
          {stats.days7.map(d => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: theme, borderRadius: '3px 3px 0 0', height: `${Math.max(4, (d.count / maxDay) * 60)}px`, opacity: 0.8 }} />
              <div style={{ fontSize: 9, color: 'rgba(232,244,253,0.3)' }}>{d.date}</div>
              <div style={{ fontSize: 11, color: theme, fontWeight: 600 }}>{d.count}</div>
            </div>
          ))}
        </div>
      </div>

      {stats.upcomingAppts > 0 && (
        <Link href="/dashboard/appointments" style={{ textDecoration: 'none', display: 'block', marginTop: '1rem', ...card, color: '#a78bfa', fontSize: 14 }}>
          📅 {stats.upcomingAppts} upcoming appointment{stats.upcomingAppts !== 1 ? 's' : ''} →
        </Link>
      )}
    </div>
  )
}