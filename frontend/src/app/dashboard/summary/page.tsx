'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Summary { 
  date: string
  totalWashes: number
  totalRevenue: number
  totalUnpaid: number
  redeemed: number
  byMethod: Record<string, { count: number; amount: number }>
  byWorker: { name: string; count: number; commission: number }[]
}

const METHOD_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  cash:   { label: 'Cash',    color: '#22c55e', emoji: '💵' },
  esewa:  { label: 'eSewa',   color: '#8b5cf6', emoji: '📱' },
  khalti: { label: 'Khalti',  color: '#a855f7', emoji: '📲' },
  credit: { label: 'Credit',  color: '#f87171', emoji: '💳' },
  free:   { label: 'Free wash', color: '#f59e0b', emoji: '🎁' },
}

export default function SummaryPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(d: string) {
    setLoading(true)
    setError(null)
    try {
      // 👇 Use centralized api client with trailing slash
      const res = await api.get(`/daily-summary/?date=${d}`)
      if (res.data.success) {
        setData(res.data.data)
      } else {
        setError('Failed to load summary data.')
      }
    } catch (err) {
      console.error('Failed to fetch daily summary:', err)
      setError('Unable to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    load(date) 
  }, [date])

  const card: React.CSSProperties = { 
    background: 'rgba(255,255,255,0.04)', 
    border: '0.5px solid rgba(56,189,248,0.12)', 
    borderRadius: 14, 
    padding: '1.25rem 1.5rem', 
    marginBottom: '1rem' 
  }

  const totalCollection = data 
    ? Object.entries(data.byMethod)
        .filter(([m]) => m !== 'credit' && m !== 'free')
        .reduce((s, [, v]) => s + v.amount, 0) 
    : 0

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
        ⚠️ {error}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Daily Summary</h1>
          <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>End-of-day payment breakdown</p>
        </div>
        <input 
          type="date" 
          value={date} 
          max={today} 
          onChange={e => setDate(e.target.value)}
          style={{ border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 14, background: '#0c1a2e', color: '#e8f4fd', outline: 'none' }} 
        />
      </div>

      {loading || !data ? (
        <div style={{ color: 'rgba(232,244,253,0.3)', textAlign: 'center', padding: '3rem' }}>Loading…</div>
      ) : (
        <>
          {/* Top stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { label: 'Total washes', value: data.totalWashes, color: '#38bdf8', emoji: '🚗' },
              { label: 'Cash collected', value: `NPR ${totalCollection.toLocaleString()}`, color: '#22c55e', emoji: '💰' },
              { label: 'Unpaid / credit', value: `NPR ${data.totalUnpaid.toLocaleString()}`, color: '#f87171', emoji: '💳' },
              { label: 'Free washes', value: data.redeemed, color: '#f59e0b', emoji: '🎁' },
            ].map(s => (
              <div key={s.label} style={card}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.emoji}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(232,244,253,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '1rem' }}>Payment breakdown</div>
            {Object.keys(data.byMethod).length === 0 ? (
              <div style={{ color: 'rgba(232,244,253,0.3)', fontSize: 14, textAlign: 'center', padding: '1rem' }}>No washes recorded for this day</div>
            ) : Object.entries(data.byMethod).map(([method, info]) => {
              const cfg = METHOD_CONFIG[method] || { label: method, color: '#38bdf8', emoji: '•' }
              const maxCount = Math.max(...Object.values(data.byMethod).map(v => v.count), 1)
              return (
                <div key={method} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(56,189,248,0.07)' }}>
                  <div style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{cfg.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: 12, color: 'rgba(232,244,253,0.5)' }}>{info.count} wash{info.count !== 1 ? 'es' : ''} · NPR {info.amount.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(info.count / maxCount) * 100}%`, background: cfg.color, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              )
            })}
            {/* Total line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '0.5px solid rgba(56,189,248,0.15)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#e8f4fd' }}>Total collected (excl. credit)</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', fontFamily: 'Georgia, serif' }}>NPR {totalCollection.toLocaleString()}</span>
            </div>
          </div>

          {/* Worker breakdown */}
          {data.byWorker.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(232,244,253,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '1rem' }}>Worker performance today</div>
              {data.byWorker.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid rgba(56,189,248,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{w.name.charAt(0)}</div>
                    <div style={{ fontSize: 14, color: '#e8f4fd', fontWeight: 500 }}>{w.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 600 }}>{w.count} washes</div>
                    {w.commission > 0 && <div style={{ fontSize: 11, color: '#f59e0b' }}>NPR {w.commission.toLocaleString()} commission</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Print button */}
          <button onClick={() => window.print()} style={{ background: 'transparent', border: '0.5px solid rgba(56,189,248,0.25)', borderRadius: 8, padding: '10px 20px', fontSize: 13, color: '#38bdf8', cursor: 'pointer' }}>
            🖨 Print summary
          </button>
        </>
      )}
    </div>
  )
}