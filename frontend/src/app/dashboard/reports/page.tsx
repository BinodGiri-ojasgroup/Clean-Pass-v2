'use client'
import { useEffect, useState } from 'react'
// 👇 CRITICAL: Import the centralized API client
import api from '@/lib/api' 

interface Stats { 
  washes: number; 
  revenue: number; 
  unpaid: number; 
  redemptions: number; 
}

export default function ReportsPage() {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true)
      setError(null)
      try {
        // 👇 1. Use 'api' client (not raw fetch)
        // 👇 2. Include the trailing slash '/reports/'
        const res = await api.get(`/reports/?days=${days}`)
        
        if (res.data.success) {
          setStats(res.data.data)
        } else {
          setError('Failed to load reports data.')
        }
      } catch (err) {
        // 👇 3. Catch the error so the app doesn't crash
        console.error('Failed to fetch reports:', err)
        setError('Unable to connect to the backend. Please ensure Django is running.')
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [days])

  // 📄 CSV Download Handler
  async function downloadCSV() {
    try {
      // 👇 Use 'api' client with responseType 'blob' for file download
      const res = await api.get(`/reports/?format=csv&days=${days}`, {
        responseType: 'blob' 
      })
      
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `cleanpass-report-${days}days.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV download failed:', err)
      alert('Failed to download CSV. Please try again.')
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading reports...</div>
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>⚠️ {error}</div>
  if (!stats) return null

  const card: React.CSSProperties = { 
    background: 'rgba(255,255,255,0.04)', 
    border: '0.5px solid rgba(56,189,248,0.12)', 
    borderRadius: 14, 
    padding: '1.75rem', 
    marginBottom: '1.5rem' 
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Financial Reports</h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(56,189,248,0.3)', background: '#0f2035', color: '#e8f4fd' }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          
          <button 
            onClick={downloadCSV}
            style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ⬇ Download CSV ({days} days)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={card}>
          <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 8 }}>Total Washes</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#38bdf8' }}>{stats.washes}</div>
        </div>
        
        <div style={card}>
          <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 8 }}>Total Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>NPR {stats.revenue.toLocaleString()}</div>
        </div>
        
        <div style={card}>
          <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 8 }}>Unpaid / Credit</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>NPR {stats.unpaid.toLocaleString()}</div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 8 }}>Free Washes Redeemed</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#a78bfa' }}>{stats.redemptions}</div>
        </div>
      </div>
    </div>
  )
}