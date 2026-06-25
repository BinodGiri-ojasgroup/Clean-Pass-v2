'use client'
import { useEffect, useState } from 'react'

interface Worker { id: string; name: string; phone: string | null; pin: string; commission: number; washesThisMonth: number; revenueThisMonth: number; commissionEarned: number; activeShift: { clockIn: string } | null; shiftsThisWeek: number }

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Worker | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', pin: '', commission: '0' })
  const [toast, setToast] = useState('')

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000) }

  async function load() {
    const res = await fetch('/api/workers'); const data = await res.json()
    if (data.success) setWorkers(data.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      await fetch(`/api/workers/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      showToast('✓ Worker updated')
    } else {
      await fetch('/api/workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      showToast('✓ Worker added')
    }
    await load(); setShowForm(false); setEditing(null); setForm({ name:'', phone:'', pin:'', commission:'0' })
  }

  async function clockAction(worker: Worker, action: 'in' | 'out') {
    await fetch('/api/workers/shift', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workerId: worker.id, action }) })
    showToast(action === 'in' ? `✓ ${worker.name} clocked in` : `✓ ${worker.name} clocked out`)
    await load()
  }

  async function removeWorker(id: string) {
    if (!confirm('Remove this worker?')) return
    await fetch(`/api/workers/${id}`, { method: 'DELETE' })
    await load(); showToast('Worker removed')
  }

  function openEdit(w: Worker) { setEditing(w); setForm({ name: w.name, phone: w.phone || '', pin: w.pin, commission: String(w.commission) }); setShowForm(true) }

  function timeSince(d: string) {
    const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    return min < 60 ? `${min}m` : `${Math.floor(min/60)}h ${min%60}m`
  }

  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '0.75rem' }
  const inp: React.CSSProperties = { width: '100%', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 14, background: '#0f2035', color: '#e8f4fd', outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 720 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500 }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Workers</h1>
          <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>{workers.length} staff members</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name:'', phone:'', pin:'0000', commission:'0' }) }}
          style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add worker</button>
      </div>

      {loading ? <div style={{ color: 'rgba(232,244,253,0.3)', textAlign: 'center', padding: '3rem' }}>Loading…</div>
      : workers.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>👷</div>
          <p style={{ color: 'rgba(232,244,253,0.3)', margin: 0 }}>No workers added yet.</p>
        </div>
      ) : workers.map(w => (
        <div key={w.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: w.activeShift ? 'rgba(34,197,94,0.15)' : 'rgba(56,189,248,0.1)', border: `1.5px solid ${w.activeShift ? '#22c55e' : 'rgba(56,189,248,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: w.activeShift ? '#22c55e' : '#38bdf8', fontWeight: 700 }}>
                {w.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e8f4fd' }}>{w.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)' }}>
                  {w.phone && `${w.phone} · `}PIN: <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{w.pin}</span>
                  {w.activeShift && <span style={{ color: '#22c55e', marginLeft: 6 }}>● On shift ({timeSince(w.activeShift.clockIn)})</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => clockAction(w, w.activeShift ? 'out' : 'in')}
                style={{ background: w.activeShift ? 'rgba(248,113,113,0.15)' : 'rgba(34,197,94,0.15)', border: `0.5px solid ${w.activeShift ? 'rgba(248,113,113,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: 7, padding: '5px 12px', fontSize: 12, color: w.activeShift ? '#f87171' : '#4ade80', cursor: 'pointer' }}>
                {w.activeShift ? 'Clock out' : 'Clock in'}
              </button>
              <button onClick={() => openEdit(w)} style={{ background: 'transparent', border: '0.5px solid rgba(56,189,248,0.25)', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#38bdf8', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => removeWorker(w.id)} style={{ background: 'transparent', border: '0.5px solid rgba(248,113,113,0.25)', borderRadius: 7, padding: '5px 10px', fontSize: 12, color: '#f87171', cursor: 'pointer' }}>✗</button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Washes this month', value: w.washesThisMonth, color: '#38bdf8' },
              { label: 'Revenue generated', value: `NPR ${w.revenueThisMonth.toLocaleString()}`, color: '#34d399' },
              { label: 'Commission earned', value: w.commission > 0 ? `NPR ${w.commissionEarned.toLocaleString()}` : '—', color: '#f59e0b' },
              { label: 'Shifts this week', value: w.shiftsThisWeek, color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color, fontFamily: 'Georgia, serif', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(232,244,253,0.3)', marginTop: 3, lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {w.commission > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(232,244,253,0.35)', textAlign: 'right' }}>
              NPR {w.commission} commission per wash
            </div>
          )}
        </div>
      ))}

      {/* Add/Edit modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0c1a2e', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#e8f4fd', margin: 0 }}>{editing ? 'Edit worker' : 'Add worker'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null) }} style={{ background: 'transparent', border: 'none', fontSize: 22, color: 'rgba(232,244,253,0.4)', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={lbl}>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required style={inp} placeholder="Bikash Tamang" /></div>
              <div><label style={lbl}>Phone</label><input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} style={inp} placeholder="98XXXXXXXX" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={lbl}>PIN (4 digits)</label><input type="number" maxLength={4} value={form.pin} onChange={e=>setForm(p=>({...p,pin:e.target.value.slice(0,4)}))} style={inp} placeholder="0000" /></div>
                <div><label style={lbl}>Commission (NPR/wash)</label><input type="number" min={0} value={form.commission} onChange={e=>setForm(p=>({...p,commission:e.target.value}))} style={inp} placeholder="0" /></div>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(232,244,253,0.35)', margin: '0' }}>Commission = NPR earned per completed wash. Set 0 if salaried.</p>
              <button type="submit" style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{editing ? 'Save changes' : 'Add worker'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
