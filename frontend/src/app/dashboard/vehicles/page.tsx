'use client'
import { useEffect, useState, useCallback } from 'react'

interface Wash { id: string; createdAt: string; paid: boolean; paymentMethod: string | null; redeemed: boolean; package?: { name: string; price: number } | null; worker?: { name: string } | null }
interface Vehicle { id: string; plateNo: string; make: string|null; color: string|null; vehicleType: { id:string;name:string;icon:string;washGoal:number }; customer: { id:string;name:string|null;phone:string }; activeWashes: number; unpaidWashes: number; isRewardReady: boolean; createdAt: string }

const PAYMENT_METHODS = [
  { key: 'cash',   label: 'Cash',   color: '#22c55e', emoji: '💵' },
  { key: 'esewa',  label: 'eSewa',  color: '#8b5cf6', emoji: '📱' },
  { key: 'khalti', label: 'Khalti', color: '#a855f7', emoji: '📲' },
]

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'reward'|'unpaid'>('all')
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [localCount, setLocalCount] = useState(0)
  const [adjusting, setAdjusting] = useState(false)
  const [toast, setToast] = useState('')

  // Unpaid modal
  const [unpaidVehicle, setUnpaidVehicle] = useState<Vehicle | null>(null)
  const [unpaidWashes, setUnpaidWashes] = useState<Wash[]>([])
  const [unpaidLoading, setUnpaidLoading] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payingAll, setPayingAll] = useState(false)
  const [selectedPayMethod, setSelectedPayMethod] = useState('cash')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadVehicles = useCallback(async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/vehicles${q ? `?search=${encodeURIComponent(q)}` : ''}`)
    const data = await res.json()
    if (data.success) setVehicles(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadVehicles() }, [loadVehicles])
  useEffect(() => { const t = setTimeout(() => loadVehicles(search), 300); return () => clearTimeout(t) }, [search, loadVehicles])

  async function loadUnpaid(v: Vehicle) {
    setUnpaidVehicle(v)
    setUnpaidLoading(true)
    const res = await fetch(`/api/vehicles/${v.id}`)
    const data = await res.json()
    if (data.success) {
      const allWashes: Wash[] = data.data.washes || []
      setUnpaidWashes(allWashes.filter((w: Wash) => !w.paid && !w.redeemed))
    }
    setUnpaidLoading(false)
  }

  async function markPaid(washId: string) {
    if (!unpaidVehicle) return
    setPayingId(washId)
    await fetch(`/api/vehicles/${unpaidVehicle.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_paid', washId, paymentMethod: selectedPayMethod })
    })
    setUnpaidWashes(p => p.filter(w => w.id !== washId))
    setVehicles(p => p.map(v => v.id === unpaidVehicle.id ? { ...v, unpaidWashes: v.unpaidWashes - 1 } : v))
    showToast('✓ Marked as paid')
    setPayingId(null)
  }

  async function markAllPaid() {
    if (!unpaidVehicle) return
    setPayingAll(true)
    await fetch(`/api/vehicles/${unpaidVehicle.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_paid', paymentMethod: selectedPayMethod })
    })
    setVehicles(p => p.map(v => v.id === unpaidVehicle.id ? { ...v, unpaidWashes: 0 } : v))
    setUnpaidWashes([])
    showToast('✓ All washes marked as paid')
    setPayingAll(false)
  }

  async function adjust(action: 'add'|'remove'|'set') {
    if (!editing) return
    setAdjusting(true)
    const body: Record<string,unknown> = { action }
    if (action === 'set') body.targetCount = localCount
    const res = await fetch(`/api/vehicles/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.success) {
      setLocalCount(data.data.activeWashes)
      setVehicles(p => p.map(v => v.id === editing.id ? { ...v, activeWashes: data.data.activeWashes, isRewardReady: data.data.isRewardReady } : v))
      setEditing(p => p ? { ...p, activeWashes: data.data.activeWashes, isRewardReady: data.data.isRewardReady } : null)
      showToast(action === 'remove' ? '✓ Wash removed' : action === 'add' ? '✓ Wash added' : `✓ Set to ${data.data.activeWashes}`)
    }
    setAdjusting(false)
  }

  const totalUnpaid = vehicles.reduce((s, v) => s + (v.unpaidWashes || 0), 0)
  const filtered = filter === 'reward' ? vehicles.filter(v => v.isRewardReady)
    : filter === 'unpaid' ? vehicles.filter(v => v.unpaidWashes > 0)
    : vehicles

  const th: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', color: 'rgba(232,244,253,0.4)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '0.5px solid rgba(56,189,248,0.1)', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#e8f4fd', borderBottom: '0.5px solid rgba(56,189,248,0.06)', verticalAlign: 'middle' }

  function timeAgo(d: string) {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days} days ago`
    return new Date(d).toLocaleDateString('en-NP', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500 }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Vehicles</h1>
          <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>{vehicles.length} registered</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {totalUnpaid > 0 && (
            <button onClick={() => setFilter('unpaid')} style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#f87171', cursor: 'pointer', fontWeight: 600 }}>
              💳 {totalUnpaid} unpaid wash{totalUnpaid > 1 ? 'es' : ''}
            </button>
          )}
          <select value={filter} onChange={e => setFilter(e.target.value as 'all'|'reward'|'unpaid')}
            style={{ border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#0c1a2e', color: '#e8f4fd', outline: 'none' }}>
            <option value="all">All vehicles</option>
            <option value="reward">🎁 Reward ready</option>
            <option value="unpaid">💳 Has unpaid</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plate, name, phone…"
            style={{ border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 13, background: '#0c1a2e', color: '#e8f4fd', outline: 'none', width: 220 }} />
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(56,189,248,0.1)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(232,244,253,0.3)' }}>Loading…</div>
        : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
            <p style={{ color: 'rgba(232,244,253,0.3)', margin: 0 }}>No vehicles found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead><tr>
                <th style={th}>Vehicle</th>
                <th style={th}>Customer</th>
                <th style={th}>Progress</th>
                <th style={th}>Washes</th>
                <th style={th}>Unpaid</th>
                <th style={th}>Actions</th>
              </tr></thead>
              <tbody>{filtered.map(v => {
                const pct = Math.min(100, Math.round((v.activeWashes / v.vehicleType.washGoal) * 100))
                return (
                  <tr key={v.id} style={{ background: v.unpaidWashes > 0 ? 'rgba(248,113,113,0.04)' : v.isRewardReady ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{v.vehicleType.icon}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#38bdf8', fontFamily: 'monospace', letterSpacing: 0.5 }}>{v.plateNo}</div>
                          <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)' }}>{v.vehicleType.name}{v.color ? ` · ${v.color}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: 13 }}>{v.customer.name || <span style={{ color: 'rgba(232,244,253,0.3)', fontStyle: 'italic' }}>No name</span>}</div>
                      <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)' }}>{v.customer.phone}</div>
                    </td>
                    <td style={{ ...td, minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: v.isRewardReady ? '#f59e0b' : '#38bdf8', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)', whiteSpace: 'nowrap' }}>{Math.min(v.activeWashes, v.vehicleType.washGoal)}/{v.vehicleType.washGoal}</span>
                      </div>
                    </td>
                    <td style={td}><span style={{ fontWeight: 600, color: v.isRewardReady ? '#f59e0b' : '#e8f4fd' }}>{v.activeWashes}{v.isRewardReady ? ' 🎁' : ''}</span></td>
                    <td style={td}>
                      {v.unpaidWashes > 0
                        ? <button onClick={() => loadUnpaid(v)} style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#f87171', cursor: 'pointer', fontWeight: 600 }}>
                            💳 {v.unpaidWashes}
                          </button>
                        : <span style={{ fontSize: 12, color: 'rgba(232,244,253,0.2)' }}>—</span>}
                    </td>
                    <td style={td}>
                      <button onClick={() => { setEditing(v); setLocalCount(v.activeWashes) }}
                        style={{ background: 'transparent', border: '0.5px solid rgba(56,189,248,0.3)', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#38bdf8', cursor: 'pointer' }}>✏ Edit</button>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── UNPAID MODAL ── */}
      {unpaidVehicle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0c1a2e', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#e8f4fd', margin: 0 }}>Collect payment</h2>
                <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 13, margin: '4px 0 0' }}>
                  {unpaidVehicle.plateNo} · {unpaidVehicle.customer.name || unpaidVehicle.customer.phone}
                </p>
              </div>
              <button onClick={() => { setUnpaidVehicle(null); setUnpaidWashes([]) }} style={{ background: 'transparent', border: 'none', fontSize: 22, color: 'rgba(232,244,253,0.4)', cursor: 'pointer' }}>×</button>
            </div>

            {/* Payment method selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.5)', marginBottom: 8, fontWeight: 500 }}>Payment method:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.key} onClick={() => setSelectedPayMethod(pm.key)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${selectedPayMethod === pm.key ? pm.color : 'rgba(255,255,255,0.1)'}`, background: selectedPayMethod === pm.key ? `${pm.color}18` : 'transparent', color: selectedPayMethod === pm.key ? pm.color : 'rgba(232,244,253,0.4)', fontSize: 13, cursor: 'pointer', fontWeight: selectedPayMethod === pm.key ? 600 : 400 }}>
                    {pm.emoji} {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {unpaidLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(232,244,253,0.3)' }}>Loading…</div>
            ) : unpaidWashes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <p style={{ color: '#4ade80', fontWeight: 600 }}>All paid!</p>
              </div>
            ) : (
              <>
                {/* Mark all paid button */}
                {unpaidWashes.length > 1 && (
                  <button onClick={markAllPaid} disabled={payingAll}
                    style={{ width: '100%', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: '1rem', opacity: payingAll ? 0.7 : 1 }}>
                    {payingAll ? '…' : `✓ Mark all ${unpaidWashes.length} washes as paid · ${PAYMENT_METHODS.find(p=>p.key===selectedPayMethod)?.emoji} ${PAYMENT_METHODS.find(p=>p.key===selectedPayMethod)?.label}`}
                  </button>
                )}

                {/* Individual washes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {unpaidWashes.map(w => (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(248,113,113,0.06)', border: '0.5px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#e8f4fd', fontWeight: 500 }}>{w.package?.name || 'Wash'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)', marginTop: 2 }}>
                          {timeAgo(w.createdAt)} · {w.package?.price ? `NPR ${w.package.price}` : 'No package'}
                        </div>
                      </div>
                      <button onClick={() => markPaid(w.id)} disabled={payingId === w.id}
                        style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: payingId === w.id ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                        {payingId === w.id ? '…' : '✓ Paid'}
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, textAlign: 'right', fontSize: 12, color: 'rgba(232,244,253,0.4)' }}>
                  Total owed: <strong style={{ color: '#f87171' }}>NPR {unpaidWashes.reduce((s, w) => s + (w.package?.price || 0), 0).toLocaleString()}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT STAMPS MODAL ── */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0c1a2e', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Adjust washes</h2>
                <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 13, margin: '4px 0 0' }}>{editing.plateNo} · {editing.vehicleType.name}</p>
              </div>
              <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: 'rgba(232,244,253,0.4)', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Active washes</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <button onClick={() => adjust('remove')} disabled={adjusting || localCount === 0}
                  style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: 24, cursor: localCount === 0 ? 'not-allowed' : 'pointer', opacity: localCount === 0 ? 0.35 : 1, color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 700, color: '#e8f4fd', lineHeight: 1 }}>{localCount}</div>
                  <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.3)', marginTop: 4 }}>of {editing.vehicleType.washGoal}</div>
                </div>
                <button onClick={() => adjust('add')} disabled={adjusting}
                  style={{ width: 48, height: 48, borderRadius: '50%', background: '#0ea5e9', border: 'none', fontSize: 24, cursor: 'pointer', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: adjusting ? 0.6 : 1 }}>+</button>
              </div>
              {localCount >= editing.vehicleType.washGoal && <div style={{ marginTop: 10, fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>🎁 Reward ready</div>}
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.55)', fontWeight: 500, marginBottom: 8 }}>Set exact count:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" min={0} max={99} value={localCount} onChange={e => setLocalCount(Math.max(0, Number(e.target.value)))}
                  style={{ flex: 1, border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 15, background: '#0f2035', color: '#e8f4fd', outline: 'none', textAlign: 'center', fontWeight: 600 }} />
                <button onClick={() => adjust('set')} disabled={adjusting}
                  style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: adjusting ? 0.7 : 1 }}>{adjusting ? '…' : 'Set'}</button>
              </div>
            </div>
            <button onClick={() => setEditing(null)} style={{ width: '100%', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px', fontSize: 14, color: 'rgba(232,244,253,0.5)', cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}
    </div>
  )

  function timeAgo(d: string) {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }
}
