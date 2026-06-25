'use client'
import { useState, useEffect, useRef, use } from 'react'

interface TrackData {
  found: boolean; plateNo: string
  shop?: { name: string; themeColor: string | null; phone: string | null }
  vehicle?: { make: string | null; color: string | null }
  vehicleType?: { name: string; icon: string; washGoal: number }
  customer?: { name: string | null }
  activeWash?: { status: string; packageName: string | null; workerName: string | null; startedAt: string | null; createdAt: string } | null
  queuePosition?: number | null
  recentWashes?: { id: string; createdAt: string; packageName: string | null; paid: boolean; paymentMethod: string | null; redeemed: boolean }[]
  activeStamps?: number
  washGoal?: number
  isRewardReady?: boolean
}

const PAY_LABEL: Record<string, string> = { cash: 'Cash', esewa: 'eSewa', khalti: 'Khalti', credit: 'Credit (unpaid)', free: 'Free wash' }

export default function TrackPage({ params }: { params: Promise<{ plateNo: string }> }) {
  const { plateNo: rawPlate } = use(params)
  const plateNo = decodeURIComponent(rawPlate).toUpperCase().replace(/([A-Z]+)(\d+)([A-Z]+)(\d+)/, '$1 $2 $3 $4')
  const [data, setData] = useState<TrackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const prevStatus = useRef<string | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  function playDone() {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      const ctx = audioRef.current; if (ctx.state === 'suspended') ctx.resume()
      ;[523, 659, 784, 1046].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination); o.frequency.value = f; o.type = 'sine'
        g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.15)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3)
        o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.35)
      })
    } catch { /**/ }
  }

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/public/track?plateNo=${encodeURIComponent(plateNo)}`)
      const json = await res.json()
      if (json.success) {
        const newStatus = json.data.activeWash?.status || null
        if (prevStatus.current && prevStatus.current !== 'done' && (newStatus === 'done' || !newStatus)) playDone()
        prevStatus.current = newStatus
        setData(json.data)
      }
      setLoading(false)
    }
    fetch_()
    const t = setInterval(() => { fetch_(); setTick(n => n + 1) }, 6000)
    return () => clearInterval(t)
  }, [plateNo])

  const theme = data?.shop?.themeColor || '#0ea5e9'
  const status = data?.activeWash?.status

  function timeAgo(d: string) {
    const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (min < 1) return 'just now'
    if (min < 60) return `${min} min ago`
    return `${Math.floor(min / 60)}h ${min % 60}m ago`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            <span style={{ color: theme }}>Clean</span><span style={{ color: '#e8f4fd' }}>Pass</span>
          </div>
          <div style={{ background: `${theme}15`, border: `1px solid ${theme}40`, borderRadius: 10, padding: '8px 20px', display: 'inline-block', fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: theme, letterSpacing: 2 }}>
            {plateNo}
          </div>
          {data?.vehicleType && (
            <div style={{ color: 'rgba(232,244,253,0.4)', fontSize: 12, marginTop: 8 }}>
              {data.vehicleType.icon} {data.vehicleType.name}
              {data.vehicle?.color && ` · ${data.vehicle.color}`}
              {data.vehicle?.make && ` ${data.vehicle.make}`}
            </div>
          )}
          {data?.shop && <div style={{ color: 'rgba(232,244,253,0.35)', fontSize: 12, marginTop: 3 }}>📍 {data.shop.name}</div>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(232,244,253,0.3)' }}>
            <div className="pulse" style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
            <div>Looking up your vehicle…</div>
          </div>
        ) : !data?.found ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 18, padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
            <h2 style={{ color: '#e8f4fd', fontSize: 18, margin: '0 0 8px' }}>Vehicle not found</h2>
            <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, margin: 0 }}>
              Plate <strong style={{ fontFamily: 'monospace', color: theme }}>{plateNo}</strong> has no record yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* MAIN STATUS CARD */}
            {!status || status === 'done' ? (
              // No active wash
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 18, padding: '1.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
                <h2 style={{ color: '#4ade80', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>No active wash</h2>
                <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, margin: 0 }}>
                  {data.recentWashes && data.recentWashes.length > 0 ? 'Last wash completed. Vehicle is ready.' : 'No wash history yet for this vehicle.'}
                </p>
              </div>
            ) : status === 'queued' ? (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 18, padding: '1.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 10 }}>⏳</div>
                <h2 style={{ color: '#f59e0b', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>In Queue</h2>
                <p style={{ color: 'rgba(232,244,253,0.5)', fontSize: 14, margin: '0 0 16px' }}>Waiting to be washed</p>
                {data.queuePosition && (
                  <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '1.25rem', marginBottom: 12 }}>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 60, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>#{data.queuePosition}</div>
                    <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginTop: 6 }}>in queue</div>
                    <div style={{ fontSize: 13, color: '#f59e0b', marginTop: 4, fontWeight: 600 }}>
                      Est. {data.queuePosition * 10}–{data.queuePosition * 15} min wait
                    </div>
                  </div>
                )}
                {data.activeWash?.packageName && <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.4)' }}>🧴 {data.activeWash.packageName}</div>}
              </div>
            ) : status === 'washing' ? (
              <div style={{ background: `${theme}10`, border: `1px solid ${theme}35`, borderRadius: 18, padding: '1.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 10 }}>🚿</div>
                <h2 style={{ color: theme, fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Being Washed Now!</h2>
                <p style={{ color: 'rgba(232,244,253,0.5)', fontSize: 14, margin: '0 0 16px' }}>Your vehicle is being cleaned right now</p>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', background: theme, borderRadius: 4, animation: 'wp 2s ease-in-out infinite' }} />
                  <style>{`@keyframes wp{0%{width:10%}50%{width:90%}100%{width:10%}}`}</style>
                </div>
                {data.activeWash?.workerName && <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 4 }}>👷 {data.activeWash.workerName}</div>}
                {data.activeWash?.packageName && <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.4)' }}>🧴 {data.activeWash.packageName}</div>}
                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px', fontSize: 12, color: 'rgba(232,244,253,0.35)' }}>
                  This page will automatically show "Done!" when your vehicle is ready
                </div>
              </div>
            ) : null}

            {/* Loyalty card */}
            {data.washGoal && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.15)', borderRadius: 14, padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.6)', fontWeight: 500 }}>🎯 Loyalty Card</div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: theme, fontWeight: 700 }}>{Math.min(data.activeStamps || 0, data.washGoal)}/{data.washGoal} washes</div>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: data.washGoal }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < (data.activeStamps || 0) ? (data.isRewardReady ? '#22c55e' : theme) : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
                {data.isRewardReady
                  ? <div style={{ fontSize: 12, color: '#4ade80', marginTop: 6, fontWeight: 600 }}>🎁 Free wash ready! Show to staff.</div>
                  : <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.3)', marginTop: 5 }}>{(data.washGoal || 0) - (data.activeStamps || 0)} more washes for a free wash</div>}
              </div>
            )}

            {/* Recent history */}
            {data.recentWashes && data.recentWashes.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.1)', borderRadius: 14, padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Recent washes</div>
                {data.recentWashes.map(w => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: w.redeemed ? 'rgba(34,197,94,0.12)' : w.paid ? `${theme}15` : 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                      {w.redeemed ? '🎁' : w.paid ? '✦' : '💳'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: w.redeemed ? '#4ade80' : w.paid ? theme : '#f87171', fontWeight: 500 }}>
                        {w.redeemed ? 'Free wash' : `${w.packageName || 'Wash'} · ${PAY_LABEL[w.paymentMethod || 'cash'] || w.paymentMethod}`}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(232,244,253,0.3)' }}>{timeAgo(w.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Auto-refresh indicator */}
            <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(232,244,253,0.2)' }}>
              🔄 Auto-refreshes every 6 seconds {tick > 0 ? `· ${tick} updates` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
