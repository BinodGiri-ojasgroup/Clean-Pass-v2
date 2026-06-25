'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ShopData { id: string; name: string; email: string; address: string | null; phone: string | null; stampGoal: number; plan: string; planExpiresAt: string | null; active: boolean; freeLimit: number; themeColor: string | null; createdAt: string; _count: { customers: number; stamps: number; stampRequests: number } }
interface WaitlistItem { id: string; contact: string; createdAt: string }

const PLAN_C: Record<string, { bg: string; color: string; border: string }> = {
  free:  { bg: '#f8f5f0', color: '#666',    border: '#e0dbd2' },
  basic: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  pro:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
}

export default function AdminPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [shops, setShops] = useState<ShopData[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'shops' | 'waitlist'>('shops')
  const [search, setSearch] = useState('')
  const [editingShop, setEditingShop] = useState<ShopData | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000) }

  const fetchAll = useCallback(async (p: string) => {
    const [shopRes, wlRes] = await Promise.all([
      fetch(`/api/admin/shops?pin=${encodeURIComponent(p)}`, { headers: { 'x-admin-pin': p } }),
      fetch(`/api/admin/waitlist?pin=${encodeURIComponent(p)}`, { headers: { 'x-admin-pin': p } })
    ])
    const [sd, wd] = await Promise.all([shopRes.json(), wlRes.json()])
    if (sd.success) setShops(sd.data)
    if (wd.success) setWaitlist(wd.data)
    return sd.success
  }, [])

  async function checkPin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setAuthError('')
    const ok = await fetchAll(pin)
    if (!ok) { setAuthError('Incorrect PIN'); setLoading(false); return }
    setAuthed(true); setLoading(false)
  }

  useEffect(() => {
    if (!authed) return
    const t = setInterval(() => fetchAll(pin), 30000)
    return () => clearInterval(t)
  }, [authed, pin, fetchAll])

  async function updateShop(updates: Record<string, unknown>) {
    if (!editingShop) return
    setSaving(true)
    const res = await fetch(`/api/admin/shops?pin=${encodeURIComponent(pin)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ shopId: editingShop.id, ...updates })
    })
    const d = await res.json()
    if (d.success) { await fetchAll(pin); setEditingShop(null); showToast('✓ Shop updated') }
    setSaving(false)
  }

  async function deleteWaitlist(id: string) {
    await fetch(`/api/admin/waitlist?pin=${encodeURIComponent(pin)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ id })
    })
    setWaitlist(prev => prev.filter(w => w.id !== id))
  }

  const filtered = shops.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
  const totalCustomers = shops.reduce((a, s) => a + s._count.customers, 0)
  const totalStamps = shops.reduce((a, s) => a + s._count.stamps, 0)
  const byPlan = shops.reduce((a, s) => { a[s.plan] = (a[s.plan] || 0) + 1; return a }, {} as Record<string, number>)
  const pendingRequests = shops.reduce((a, s) => a + s._count.stampRequests, 0)

  const card: React.CSSProperties = { background: '#fff', border: '1px solid #ede8e0', borderRadius: 14, padding: '1.25rem 1.5rem' }
  const inp: React.CSSProperties = { width: '100%', border: '1px solid #e0dbd2', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#1a1208', outline: 'none', background: '#fff', boxSizing: 'border-box' }
  const th: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', color: '#aaa', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f0ece4', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '11px 14px', fontSize: 13, color: '#1a1208', borderBottom: '1px solid #f8f5f0', verticalAlign: 'middle' }

  function PlanBadge({ plan }: { plan: string }) {
    const c = PLAN_C[plan] || PLAN_C.free
    return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 5, padding: '2px 9px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{plan}</span>
  }

  // LOGIN
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0e0a06', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700, color: '#e8a24b', marginBottom: 4 }}>BrewPass</div>
        <p style={{ color: 'rgba(245,237,224,0.35)', fontSize: 13, marginBottom: '2rem' }}>Platform Admin</p>
        <div style={{ background: '#1a1208', border: '1px solid rgba(232,162,75,0.15)', borderRadius: 16, padding: '2rem' }}>
          <form onSubmit={checkPin}>
            <label style={{ display: 'block', fontSize: 13, color: 'rgba(245,237,224,0.5)', marginBottom: 8, textAlign: 'left' }}>Admin PIN</label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '12px 14px', color: '#f5ede0', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: '1rem', textAlign: 'center', letterSpacing: 4 }} />
            {authError && <p style={{ color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>{authError}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', background: '#e8a24b', color: '#0e0a06', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying…' : 'Enter Admin Panel'}
            </button>
          </form>
        </div>
        <button onClick={() => router.push('/')} style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: 'rgba(245,237,224,0.3)', fontSize: 13, cursor: 'pointer' }}>← Back to site</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8f5f0', padding: '2rem' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>{toast}</div>}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#1a1208', margin: 0 }}>
              Brew<span style={{ color: '#c97a20' }}>Pass</span> Admin
            </h1>
            <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{shops.length} shops · {waitlist.length} waitlist signups · auto-refreshes every 30s</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fetchAll(pin)} style={{ background: '#fff', border: '1px solid #e0dbd2', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#666', cursor: 'pointer' }}>↻ Refresh</button>
            <button onClick={() => router.push('/')} style={{ background: '#fff', border: '1px solid #e0dbd2', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#666', cursor: 'pointer' }}>← Site</button>
            <button onClick={() => { setAuthed(false); setPin('') }} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#dc2626', cursor: 'pointer' }}>Lock</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Shops', value: shops.length, icon: '🏪', color: '#1a1208' },
            { label: 'Free Plan', value: byPlan.free || 0, icon: '🆓', color: '#888' },
            { label: 'Basic Plan', value: byPlan.basic || 0, icon: '⭐', color: '#1d4ed8' },
            { label: 'Pro Plan', value: byPlan.pro || 0, icon: '🚀', color: '#d97706' },
            { label: 'Customers', value: totalCustomers, icon: '👥', color: '#1a1208' },
            { label: 'Stamps', value: totalStamps, icon: '☕', color: '#c97a20' },
            { label: 'Pending', value: pendingRequests, icon: '⏳', color: pendingRequests > 0 ? '#dc2626' : '#888' },
            { label: 'Waitlist', value: waitlist.length, icon: '📋', color: '#1a1208' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'Georgia, serif' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
          <button onClick={() => setTab('shops')} style={{ background: tab === 'shops' ? '#e8a24b' : '#fff', color: tab === 'shops' ? '#0e0a06' : '#666', border: `1px solid ${tab === 'shops' ? '#e8a24b' : '#e0dbd2'}`, borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: tab === 'shops' ? 600 : 400, cursor: 'pointer' }}>
            🏪 Shops ({shops.length})
          </button>
          <button onClick={() => setTab('waitlist')} style={{ background: tab === 'waitlist' ? '#e8a24b' : '#fff', color: tab === 'waitlist' ? '#0e0a06' : '#666', border: `1px solid ${tab === 'waitlist' ? '#e8a24b' : '#e0dbd2'}`, borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: tab === 'waitlist' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            📋 Waitlist
            {waitlist.length > 0 && <span style={{ background: tab === 'waitlist' ? 'rgba(0,0,0,0.15)' : '#e8a24b', color: tab === 'waitlist' ? '#0e0a06' : '#0e0a06', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{waitlist.length}</span>}
          </button>
        </div>

        {tab === 'shops' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ ...inp, maxWidth: 360 }} />
            </div>
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead>
                    <tr>
                      {['Shop', 'Plan', 'Status', 'Customers', 'Free Limit', 'Stamps', 'Pending', 'Joined', 'Actions'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id} style={{ background: !s.active ? 'rgba(220,38,38,0.02)' : 'transparent' }}>
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{s.email}</div>
                          {s.address && <div style={{ fontSize: 11, color: '#ccc' }}>{s.address}</div>}
                        </td>
                        <td style={td}>
                          <PlanBadge plan={s.plan} />
                          {s.planExpiresAt && (
                            <div style={{ fontSize: 10, color: new Date(s.planExpiresAt) < new Date() ? '#dc2626' : '#aaa', marginTop: 3 }}>
                              {new Date(s.planExpiresAt) < new Date() ? '⚠ Expired' : `Until ${new Date(s.planExpiresAt).toLocaleDateString()}`}
                            </div>
                          )}
                        </td>
                        <td style={td}>
                          <span style={{ background: s.active ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)', color: s.active ? '#16a34a' : '#dc2626', border: `1px solid ${s.active ? 'rgba(34,197,94,0.3)' : 'rgba(220,38,38,0.3)'}`, borderRadius: 5, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>
                            {s.active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td style={{ ...td, fontWeight: 600 }}>{s._count.customers}</td>
                        <td style={{ ...td, color: s.plan === 'free' ? '#c97a20' : '#888' }}>
                          {s.plan === 'free' ? s.freeLimit : '∞'}
                        </td>
                        <td style={{ ...td, color: '#c97a20', fontWeight: 600 }}>{s._count.stamps}</td>
                        <td style={{ ...td, color: s._count.stampRequests > 0 ? '#dc2626' : '#888', fontWeight: s._count.stampRequests > 0 ? 600 : 400 }}>{s._count.stampRequests}</td>
                        <td style={{ ...td, color: '#bbb', fontSize: 11 }}>
                          {new Date(s.createdAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ ...td }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setEditingShop({ ...s })} style={{ background: '#e8a24b', color: '#0e0a06', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              Manage
                            </button>
                            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/scan/${s.id}`)} style={{ background: '#fff', border: '1px solid #e0dbd2', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#888', cursor: 'pointer' }} title="Copy QR URL">
                              QR
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'waitlist' && (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {waitlist.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#aaa' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <p style={{ margin: 0 }}>No waitlist signups yet</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Contact', 'Signed up', 'Action'].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map(w => (
                    <tr key={w.id}>
                      <td style={{ ...td, fontWeight: 500 }}>{w.contact}</td>
                      <td style={{ ...td, color: '#888', fontSize: 12 }}>{new Date(w.createdAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={td}>
                        <button onClick={() => deleteWaitlist(w.id)} style={{ background: 'transparent', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#dc2626', cursor: 'pointer' }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Edit shop modal */}
      {editingShop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: '#1a1208', margin: 0 }}>Manage Shop</h2>
                <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>{editingShop.name} · {editingShop.email}</p>
              </div>
              <button onClick={() => setEditingShop(null)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: '#aaa', cursor: 'pointer' }}>×</button>
            </div>

            {/* Plan */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 10, fontWeight: 500 }}>Plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {(['free', 'basic', 'pro'] as const).map(p => {
                  const prices = { free: 'NPR 0', basic: 'NPR 1,500/mo', pro: 'NPR 3,500/mo' }
                  const active = editingShop.plan === p
                  const c = PLAN_C[p]
                  return (
                    <button key={p} type="button" onClick={() => setEditingShop({ ...editingShop, plan: p })}
                      style={{ background: active ? c.bg : '#fff', border: `2px solid ${active ? c.color : '#e0dbd2'}`, borderRadius: 10, padding: '10px 8px', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: active ? c.color : '#888', marginBottom: 3 }}>{p}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{prices[p]}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Expiry */}
            {editingShop.plan !== 'free' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 500 }}>Plan expiry <span style={{ color: '#bbb', fontWeight: 400 }}>(blank = never expires)</span></label>
                <input type="date" value={editingShop.planExpiresAt ? new Date(editingShop.planExpiresAt).toISOString().split('T')[0] : ''} onChange={e => setEditingShop({ ...editingShop, planExpiresAt: e.target.value || null })} style={inp} />
              </div>
            )}

            {/* Free limit — only for free plan */}
            {editingShop.plan === 'free' && (
              <div style={{ marginBottom: '1.5rem', background: '#f8f5f0', borderRadius: 10, padding: '1rem' }}>
                <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 500 }}>Free tier customer limit</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="number" min={1} max={10000} value={editingShop.freeLimit} onChange={e => setEditingShop({ ...editingShop, freeLimit: Number(e.target.value) })} style={{ ...inp, maxWidth: 120 }} />
                  <span style={{ fontSize: 13, color: '#888' }}>customers max</span>
                </div>
                <p style={{ fontSize: 12, color: '#aaa', margin: '6px 0 0' }}>Default is 50. Increase for trial or special deals.</p>
              </div>
            )}

            {/* Status */}
            <div style={{ marginBottom: '1.5rem', background: '#f8f5f0', borderRadius: 10, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1208' }}>Account status</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Suspended shops cannot accept stamps</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: true, l: 'Active' }, { v: false, l: 'Suspend' }].map(opt => (
                  <button key={String(opt.v)} type="button" onClick={() => setEditingShop({ ...editingShop, active: opt.v })}
                    style={{ background: editingShop.active === opt.v ? (opt.v ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.1)') : 'transparent', border: `1px solid ${editingShop.active === opt.v ? (opt.v ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.3)') : '#e0dbd2'}`, borderRadius: 7, padding: '7px 14px', fontSize: 12, color: editingShop.active === opt.v ? (opt.v ? '#16a34a' : '#dc2626') : '#888', cursor: 'pointer', fontWeight: editingShop.active === opt.v ? 600 : 400 }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Shop info */}
            <div style={{ background: '#f8f5f0', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', fontSize: 13, color: '#666', lineHeight: 2.2 }}>
              <div><strong>Phone:</strong> {editingShop.phone || '—'}</div>
              <div><strong>Address:</strong> {editingShop.address || '—'}</div>
              <div><strong>Customers:</strong> {editingShop._count.customers} &nbsp; <strong>Stamps:</strong> {editingShop._count.stamps}</div>
              <div><strong>Pending requests:</strong> {editingShop._count.stampRequests}</div>
              <div><strong>Registered:</strong> {new Date(editingShop.createdAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => updateShop({ plan: editingShop.plan, active: editingShop.active, planExpiresAt: editingShop.planExpiresAt, freeLimit: editingShop.freeLimit })} disabled={saving}
                style={{ flex: 1, background: '#e8a24b', color: '#0e0a06', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={() => setEditingShop(null)} style={{ background: 'transparent', border: '1px solid #e0dbd2', borderRadius: 8, padding: '12px 20px', fontSize: 14, color: '#666', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
