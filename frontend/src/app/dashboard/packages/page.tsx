'use client'
import { useEffect, useState } from 'react'

interface Package { id: string; name: string; description: string|null; price: number; stampValue: number; color: string; active: boolean; vehicleTypeId: string|null; vehicleType?: { name: string }|null }
interface VehicleType { id: string; name: string; icon: string; washGoal: number }

const COLORS = ['#0ea5e9','#8b5cf6','#f59e0b','#10b981','#ef4444','#ec4899','#f97316','#6366f1']
const VT_ICONS = ['🚗','🏍️','🚙','🚌','🚐','🚑','🚒','🚜']

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  const [loading, setLoading] = useState(true)
  const [showPkgForm, setShowPkgForm] = useState(false)
  const [showVtForm, setShowVtForm] = useState(false)
  const [editingVt, setEditingVt] = useState<VehicleType | null>(null)
  const [toast, setToast] = useState('')
  const [pkgForm, setPkgForm] = useState({ name: '', description: '', price: '', stampValue: '1', color: '#0ea5e9', vehicleTypeId: '' })
  const [vtForm, setVtForm] = useState({ name: '', icon: '🚗', washGoal: '8' })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function load() {
    const [p, v] = await Promise.all([fetch('/api/packages').then(r=>r.json()), fetch('/api/vehicle-types').then(r=>r.json())])
    if (p.success) setPackages(p.data)
    if (v.success) setVehicleTypes(v.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function savePkg(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/packages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pkgForm, price: Number(pkgForm.price), stampValue: Number(pkgForm.stampValue), vehicleTypeId: pkgForm.vehicleTypeId || null }) })
    const data = await res.json()
    if (data.success) { await load(); setShowPkgForm(false); setPkgForm({ name:'',description:'',price:'',stampValue:'1',color:'#0ea5e9',vehicleTypeId:'' }); showToast('✓ Package added') }
  }

  async function deletePkg(id: string) {
    await fetch(`/api/packages/${id}`, { method: 'DELETE' }); await load(); showToast('Package removed')
  }

  async function saveVt(e: React.FormEvent) {
    e.preventDefault()
    if (editingVt) {
      await fetch(`/api/vehicle-types/${editingVt.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vtForm) })
      showToast('✓ Vehicle type updated')
    } else {
      await fetch('/api/vehicle-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vtForm) })
      showToast('✓ Vehicle type added')
    }
    await load(); setShowVtForm(false); setEditingVt(null); setVtForm({ name:'',icon:'🚗',washGoal:'8' })
  }

  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }
  const inp: React.CSSProperties = { width: '100%', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 14, background: '#0f2035', color: '#e8f4fd', outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 700 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500 }}>{toast}</div>}
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: '0 0 2rem' }}>Packages & Vehicle Types</h1>

      {/* Vehicle Types */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e8f4fd', margin: 0 }}>🚗 Vehicle Types</h2>
          <button onClick={() => { setShowVtForm(true); setEditingVt(null); setVtForm({ name:'',icon:'🚗',washGoal:'8' }) }} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add type</button>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(232,244,253,0.35)', margin: '0 0 1rem' }}>Each vehicle type has its own loyalty goal. Car = 8 washes, Motorcycle = 10 washes, etc.</p>
        {loading ? null : vehicleTypes.map(vt => (
          <div key={vt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(56,189,248,0.07)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{vt.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4fd' }}>{vt.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)' }}>Goal: {vt.washGoal} washes for free wash</div>
            </div>
            <button onClick={() => { setEditingVt(vt); setVtForm({ name: vt.name, icon: vt.icon, washGoal: String(vt.washGoal) }); setShowVtForm(true) }}
              style={{ background: 'transparent', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#38bdf8', cursor: 'pointer' }}>Edit</button>
          </div>
        ))}
      </div>

      {/* Wash Packages */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e8f4fd', margin: 0 }}>🧴 Wash Packages</h2>
          <button onClick={() => setShowPkgForm(true)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add package</button>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(232,244,253,0.35)', margin: '0 0 1rem' }}>Premium packages can count as 2 stamps (e.g. Full Detail = 2 washes toward goal).</p>
        {loading ? null : packages.filter(p => p.active).map(pkg => (
          <div key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(56,189,248,0.07)' }}>
            <div style={{ width: 12, height: 38, borderRadius: 3, background: pkg.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4fd' }}>{pkg.name} <span style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)', fontWeight: 400 }}>· NPR {pkg.price}</span></div>
              <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)' }}>{pkg.description} · {pkg.stampValue > 1 ? `${pkg.stampValue} stamps` : '1 stamp'} {pkg.vehicleType ? `· ${pkg.vehicleType.name}` : '· All vehicles'}</div>
            </div>
            <button onClick={() => deletePkg(pkg.id)} style={{ background: 'transparent', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#f87171', cursor: 'pointer' }}>Remove</button>
          </div>
        ))}
      </div>

      {/* Package form modal */}
      {showPkgForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0c1a2e', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#e8f4fd', margin: 0 }}>Add wash package</h2>
              <button onClick={() => setShowPkgForm(false)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: 'rgba(232,244,253,0.4)', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={savePkg} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={lbl}>Package name *</label><input value={pkgForm.name} onChange={e => setPkgForm(p=>({...p,name:e.target.value}))} required style={inp} placeholder="e.g. Premium Wash" /></div>
              <div><label style={lbl}>Description</label><input value={pkgForm.description} onChange={e => setPkgForm(p=>({...p,description:e.target.value}))} style={inp} placeholder="Exterior + interior vacuum" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={lbl}>Price (NPR) *</label><input type="number" value={pkgForm.price} onChange={e => setPkgForm(p=>({...p,price:e.target.value}))} required style={inp} placeholder="350" /></div>
                <div><label style={lbl}>Stamp value</label><input type="number" min={1} max={5} value={pkgForm.stampValue} onChange={e => setPkgForm(p=>({...p,stampValue:e.target.value}))} style={inp} /></div>
              </div>
              <div><label style={lbl}>Vehicle type (optional)</label>
                <select value={pkgForm.vehicleTypeId} onChange={e => setPkgForm(p=>({...p,vehicleTypeId:e.target.value}))} style={{ ...inp }}>
                  <option value="">All vehicle types</option>
                  {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.icon} {vt.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => <button key={c} type="button" onClick={() => setPkgForm(p=>({...p,color:c}))} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${pkgForm.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer' }} />)}
                </div>
              </div>
              <button type="submit" style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Add package</button>
            </form>
          </div>
        </div>
      )}

      {/* VehicleType form modal */}
      {showVtForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0c1a2e', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#e8f4fd', margin: 0 }}>{editingVt ? 'Edit vehicle type' : 'Add vehicle type'}</h2>
              <button onClick={() => { setShowVtForm(false); setEditingVt(null) }} style={{ background: 'transparent', border: 'none', fontSize: 22, color: 'rgba(232,244,253,0.4)', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={saveVt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={lbl}>Name *</label><input value={vtForm.name} onChange={e => setVtForm(p=>({...p,name:e.target.value}))} required style={inp} placeholder="e.g. Tuk Tuk" /></div>
              <div><label style={lbl}>Icon</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VT_ICONS.map(ic => <button key={ic} type="button" onClick={() => setVtForm(p=>({...p,icon:ic}))} style={{ width: 36, height: 36, borderRadius: 8, background: vtForm.icon === ic ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${vtForm.icon === ic ? '#38bdf8' : 'transparent'}`, fontSize: 18, cursor: 'pointer' }}>{ic}</button>)}
                </div>
              </div>
              <div><label style={lbl}>Wash goal (for free wash)</label><input type="number" min={1} max={50} value={vtForm.washGoal} onChange={e => setVtForm(p=>({...p,washGoal:e.target.value}))} style={inp} /></div>
              <button type="submit" style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{editingVt ? 'Save changes' : 'Add vehicle type'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
