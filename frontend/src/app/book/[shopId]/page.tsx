'use client'
import { useState, useEffect, use } from 'react'

interface ShopInfo { name:string; themeColor:string|null; vehicleTypes:{id:string;name:string;icon:string}[]; packages:{id:string;name:string;price:number;color:string}[] }

const TIME_SLOTS = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM']

export default function BookPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ phone:'', plateNo:'', vehicleTypeId:'', packageId:'', date: today, timeSlot:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const theme = shop?.themeColor || '#0ea5e9'

  useEffect(() => {
    fetch(`/api/public/scan?shopId=${shopId}`).then(r=>r.json()).then(d => {
      if (d.success) { setShop(d.data); setForm(p => ({ ...p, vehicleTypeId: d.data.vehicleTypes?.[0]?.id || '' })) }
    })
  }, [shopId])

  useEffect(() => {
    if (!form.date) return
    fetch(`/api/public/appointment?shopId=${shopId}&date=${form.date}`).then(r=>r.json()).then(d => {
      if (d.success) setBookedSlots(d.data.bookedSlots)
    })
  }, [form.date, shopId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.timeSlot) return setError('Please select a time slot')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/public/appointment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId, ...form }) })
      const data = await res.json()
      if (!data.success) { setError(data.error); return }
      setSuccess(`✅ Appointment booked for ${form.date} at ${form.timeSlot}! See you then.`)
    } catch { setError('Something went wrong.') }
    finally { setLoading(false) }
  }

  const bg = '#0c1a2e'
  const inp: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:12, padding:'13px 16px', color:'#e8f4fd', fontSize:15, outline:'none', boxSizing:'border-box' }
  const lbl: React.CSSProperties = { display:'block', color:'rgba(232,244,253,0.55)', fontSize:13, marginBottom:7 }

  if (success) return (
    <div style={{ minHeight:'100vh', background:bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem', textAlign:'center' }}>
      <div style={{ maxWidth:360 }}>
        <div style={{ fontSize:60, marginBottom:16 }}>📅</div>
        <h2 style={{ color:'#e8f4fd', fontFamily:'Georgia, serif', fontSize:22, margin:'0 0 12px' }}>Appointment Confirmed!</h2>
        <p style={{ color:'rgba(232,244,253,0.5)', fontSize:14, lineHeight:1.7, margin:'0 0 20px' }}>{success}</p>
        <button onClick={() => { setSuccess(''); setForm(p => ({ ...p, phone:'', plateNo:'', timeSlot:'', notes:'' })) }} style={{ background:theme, color:'#fff', border:'none', borderRadius:12, padding:'14px 28px', fontSize:15, fontWeight:700, cursor:'pointer' }}>Book another</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'1.25rem' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ width:56, height:56, borderRadius:14, background:`${theme}20`, border:`2px solid ${theme}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 10px' }}>📅</div>
          <div style={{ color:'#e8f4fd', fontSize:20, fontWeight:700 }}>{shop?.name || 'Loading…'}</div>
          <div style={{ color:'rgba(232,244,253,0.4)', fontSize:13, marginTop:3 }}>Book a wash appointment</div>
        </div>

        <div style={{ background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(56,189,248,0.15)', borderRadius:18, padding:'1.75rem' }}>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div><label style={lbl}>📱 Phone number *</label><input suppressHydrationWarning type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} required placeholder="98XXXXXXXX" style={inp} /></div>
            <div><label style={lbl}>🚗 Plate number *</label><input suppressHydrationWarning type="text" value={form.plateNo} onChange={e=>setForm(p=>({...p,plateNo:e.target.value.toUpperCase()}))} required placeholder="BA 1 PA 2345" style={{ ...inp, fontFamily:'monospace', letterSpacing:1 }} /></div>
            <div>
              <label style={lbl}>🚙 Vehicle type *</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {shop?.vehicleTypes.map(vt => <button key={vt.id} type="button" onClick={()=>setForm(p=>({...p,vehicleTypeId:vt.id}))} style={{ padding:'8px 12px', borderRadius:8, border:`1.5px solid ${form.vehicleTypeId===vt.id?theme:'rgba(56,189,248,0.15)'}`, background:form.vehicleTypeId===vt.id?`${theme}20`:'rgba(255,255,255,0.04)', color:form.vehicleTypeId===vt.id?theme:'rgba(232,244,253,0.5)', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}><span>{vt.icon}</span>{vt.name}</button>)}
              </div>
            </div>
            <div><label style={lbl}>📅 Date *</label><input type="date" value={form.date} min={today} onChange={e=>setForm(p=>({...p,date:e.target.value}))} required style={inp} /></div>
            <div>
              <label style={lbl}>⏰ Time slot *</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {TIME_SLOTS.map(slot => {
                  const booked = bookedSlots.includes(slot)
                  return <button key={slot} type="button" disabled={booked} onClick={()=>!booked&&setForm(p=>({...p,timeSlot:slot}))}
                    style={{ padding:'8px 4px', borderRadius:8, border:`1.5px solid ${form.timeSlot===slot?theme:booked?'rgba(248,113,113,0.2)':'rgba(56,189,248,0.15)'}`, background:form.timeSlot===slot?`${theme}20`:booked?'rgba(248,113,113,0.05)':'rgba(255,255,255,0.03)', color:form.timeSlot===slot?theme:booked?'rgba(248,113,113,0.4)':'rgba(232,244,253,0.5)', fontSize:12, cursor:booked?'not-allowed':'pointer', textDecoration:booked?'line-through':'none', fontWeight:form.timeSlot===slot?600:400 }}>{slot}</button>
                })}
              </div>
            </div>
            <div><label style={lbl}>📝 Notes <span style={{ opacity:0.5, fontWeight:400 }}>(optional)</span></label><input suppressHydrationWarning value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Any special requests…" style={inp} /></div>
            {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'0.5px solid rgba(248,113,113,0.3)', borderRadius:8, padding:'10px 14px', color:'#f87171', fontSize:13 }}>⚠ {error}</div>}
            <button type="submit" disabled={loading} style={{ width:'100%', background:theme, color:'#fff', border:'none', borderRadius:12, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', opacity:loading?0.7:1 }}>{loading?'Booking…':'📅 Confirm appointment'}</button>
          </form>
        </div>
        <p style={{ textAlign:'center', color:'rgba(232,244,253,0.1)', fontSize:11, marginTop:'1.5rem' }}>Powered by CleanPass Nepal</p>
      </div>
    </div>
  )
}
