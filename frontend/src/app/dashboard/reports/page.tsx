'use client'
import { useEffect, useState } from 'react'

interface Stats { washes: number; revenue: number; unpaid: number; redemptions: number }

export default function ReportsPage() {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/reports?days=${days}`)
    const data = await res.json()
    if (data.success) setStats(data.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [days])

  async function downloadCSV() {
    const res = await fetch(`/api/reports?format=csv&days=${days}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'cleanpass-report.csv'; a.click()
  }

  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '1.5rem' }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Reports</h1>
          <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>Wash history and revenue</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#0c1a2e', color: '#e8f4fd', outline: 'none' }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button onClick={downloadCSV} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇ CSV</button>
        </div>
      </div>

      {loading || !stats ? <div style={{ color: 'rgba(232,244,253,0.3)', textAlign: 'center', padding: '3rem' }}>Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total washes', value: stats.washes, icon: '🧴', color: '#38bdf8' },
            { label: 'Revenue (paid)', value: `NPR ${stats.revenue.toLocaleString()}`, icon: '💰', color: '#34d399' },
            { label: 'Unpaid amount', value: `NPR ${stats.unpaid.toLocaleString()}`, icon: '💳', color: '#f87171' },
            { label: 'Free washes given', value: stats.redemptions, icon: '🎁', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Export options</div>
        <p style={{ fontSize: 13, color: 'rgba(232,244,253,0.4)', margin: '0 0 1rem', lineHeight: 1.7 }}>
          Download a full CSV with all washes for the selected period. Includes date, plate number, vehicle type, customer, package, price, paid status, and redemptions.
        </p>
        <button onClick={downloadCSV} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇ Download CSV report ({days} days)</button>
      </div>
    </div>
  )
}
