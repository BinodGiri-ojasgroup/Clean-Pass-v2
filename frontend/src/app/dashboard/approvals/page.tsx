'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import api from '@/lib/api'

interface Request { id: string; phone: string; plateNo: string; createdAt: string; package?: { name: string; price: number; color: string } | null }
interface Package { id: string; name: string; price: number; color: string }
interface VehicleType { id: string; name: string; icon: string }

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [selectedPackages, setSelectedPackages] = useState<Record<string, string>>({})
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({})
  const prevCount = useRef(0)
  const audioRef = useRef<AudioContext | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)

  function playSound(type: 'new' | 'approve') {
    if (!soundEnabled || !audioRef.current) return
    const ctx = audioRef.current
    const notes = type === 'new' ? [[440, 0], [550, 0.2]] : [[523, 0], [659, 0.15], [784, 0.3]]
    notes.forEach(([f, d]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination); o.frequency.value = f; o.type = 'sine'
      g.gain.setValueAtTime(0.25, ctx.currentTime + d)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.25)
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.3)
    })
  }

  function enableSound() {
    if (!audioRef.current) audioRef.current = new AudioContext()
    if (audioRef.current.state === 'suspended') audioRef.current.resume()
    setSoundEnabled(true)
  }

  const fetchRequests = useCallback(async () => {
    const res = await api.get('/requests/')
    if (res.data.success) {
      if (res.data.data.requests.length > prevCount.current && prevCount.current > 0) playSound('new')
      prevCount.current = res.data.data.requests.length
      setRequests(res.data.data.requests)
      setPackages(res.data.data.packages)
    }
    setLoading(false)
  }, [soundEnabled])

  useEffect(() => {
    fetchRequests()
    const t = setInterval(fetchRequests, 4000)
    return () => clearInterval(t)
  }, [fetchRequests])

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id)
    try {
      const res = await api.patch(`/requests/${id}/`, {
        action,
        packageId: selectedPackages[id] || null,
        paid: paidStatus[id] !== false
      })
      if (res.data.success) {
        if (action === 'approve') playSound('approve')
        setRequests(p => p.filter(r => r.id !== id))
        setToast(action === 'approve' ? '✅ Approved — added to wash queue' : '❌ Rejected')
        setTimeout(() => setToast(''), 3000)
      }
    } finally { setActing(null) }
  }

  function timeAgo(d: string) {
    const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    return min < 1 ? 'just now' : min < 60 ? `${min}m ago` : `${Math.floor(min / 60)}h ago`
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500 }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Approvals</h1>
          <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>
            {requests.length} pending · auto-refreshes every 4s
          </p>
        </div>
        {!soundEnabled && (
          <button onClick={enableSound} style={{ background: 'rgba(56,189,248,0.1)', border: '0.5px solid rgba(56,189,248,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#38bdf8', cursor: 'pointer' }}>
            🔊 Enable sound alerts
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'rgba(232,244,253,0.3)', textAlign: 'center', padding: '3rem' }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p style={{ color: 'rgba(232,244,253,0.3)', margin: 0 }}>No pending requests. Waiting for customers…</p>
        </div>
      ) : (
        requests.map(r => (
          <div key={r.id} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.15)', borderLeft: '3px solid #38bdf8', borderRadius: 12, padding: '1.25rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', letterSpacing: 1 }}>{r.plateNo}</div>
                <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginTop: 2 }}>📱 {r.phone}</div>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.3)' }}>{timeAgo(r.createdAt)}</div>
            </div>

            {/* Package selection */}
            {packages.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select package:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button onClick={() => setSelectedPackages(p => ({ ...p, [r.id]: '' }))}
                    style={{ padding: '5px 12px', borderRadius: 6, border: `1.5px solid ${!selectedPackages[r.id] ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, background: !selectedPackages[r.id] ? 'rgba(56,189,248,0.15)' : 'transparent', color: !selectedPackages[r.id] ? '#38bdf8' : 'rgba(232,244,253,0.4)', fontSize: 12, cursor: 'pointer' }}>
                    Any
                  </button>
                  {packages.map(pkg => (
                    <button key={pkg.id} onClick={() => setSelectedPackages(p => ({ ...p, [r.id]: pkg.id }))}
                      style={{ padding: '5px 12px', borderRadius: 6, border: `1.5px solid ${selectedPackages[r.id] === pkg.id ? pkg.color : 'rgba(255,255,255,0.1)'}`, background: selectedPackages[r.id] === pkg.id ? `${pkg.color}20` : 'transparent', color: selectedPackages[r.id] === pkg.id ? pkg.color : 'rgba(232,244,253,0.4)', fontSize: 12, cursor: 'pointer' }}>
                      {pkg.name} · NPR {pkg.price}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paid toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'rgba(232,244,253,0.65)' }}>
                <input type="checkbox" checked={paidStatus[r.id] !== false} onChange={e => setPaidStatus(p => ({ ...p, [r.id]: e.target.checked }))} />
                Customer paid
              </label>
              {paidStatus[r.id] === false && <span style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 4, padding: '2px 8px' }}>Unpaid — tracked</span>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => act(r.id, 'approve')} disabled={acting === r.id}
                style={{ flex: 1, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: acting === r.id ? 0.7 : 1 }}>
                {acting === r.id ? '…' : '✅ Approve — add to queue'}
              </button>
              <button onClick={() => act(r.id, 'reject')} disabled={acting === r.id}
                style={{ background: 'transparent', border: '0.5px solid rgba(248,113,113,0.4)', color: '#f87171', borderRadius: 8, padding: '11px 16px', fontSize: 14, cursor: 'pointer' }}>
                ✗
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
