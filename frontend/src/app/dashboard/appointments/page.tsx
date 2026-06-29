'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Appointment { id: string; date: string; timeSlot: string; status: string; notes: string|null; vehicle: { plateNo: string; vehicleType: { name: string; icon: string }; customer: { name: string|null; phone: string } } }

const STATUS_COLORS: Record<string,string> = { pending: '#f59e0b', confirmed: '#38bdf8', done: '#34d399', cancelled: '#f87171' }
const TIME_SLOTS = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM']

export default function AppointmentsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function load(d: string) {
    setLoading(true)
    const res = await api.get(`/appointments/`, { params: { date: d } })
    if (res.data.success) setAppointments(res.data.data)
    setLoading(false)
  }

  useEffect(() => { load(date) }, [date])

  async function updateStatus(id: string, status: string) {
    await api.patch(`/appointments/${id}/`, { status })
    await load(date)
    showToast(`✓ Marked as ${status}`)
  }

  async function deleteAppt(id: string) {
    if (!confirm('Cancel this appointment?')) return
    await api.delete(`/appointments/${id}/`)
    await load(date)
    showToast('Appointment cancelled')
  }

  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '1.25rem', marginBottom: '0.75rem' }

  // Group by time slot
  const bySlot: Record<string, Appointment[]> = {}
  appointments.forEach(a => { if (!bySlot[a.timeSlot]) bySlot[a.timeSlot] = []; bySlot[a.timeSlot].push(a) })

  return (
    <div style={{ maxWidth: 700 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500 }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Appointments</h1>
          <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>{appointments.length} booked for this day</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 14, background: '#0c1a2e', color: '#e8f4fd', outline: 'none' }} />
      </div>

      {/* Timeline */}
      {loading ? <div style={{ color: 'rgba(232,244,253,0.3)', textAlign: 'center', padding: '3rem' }}>Loading…</div>
      : (
        <div>
          {TIME_SLOTS.map(slot => {
            const slotAppts = bySlot[slot] || []
            const isFree = slotAppts.length === 0
            return (
              <div key={slot} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 70, fontSize: 11, color: 'rgba(232,244,253,0.3)', paddingTop: 14, textAlign: 'right', flexShrink: 0 }}>{slot}</div>
                <div style={{ flex: 1 }}>
                  {isFree ? (
                    <div style={{ height: 36, border: '0.5px dashed rgba(56,189,248,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
                      <span style={{ fontSize: 11, color: 'rgba(232,244,253,0.2)' }}>Free slot</span>
                    </div>
                  ) : slotAppts.map(a => (
                    <div key={a.id} style={{ background: 'rgba(56,189,248,0.07)', border: `0.5px solid ${STATUS_COLORS[a.status] || '#38bdf8'}40`, borderLeft: `3px solid ${STATUS_COLORS[a.status] || '#38bdf8'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{a.vehicle.vehicleType.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', letterSpacing: 0.5 }}>{a.vehicle.plateNo}</span>
                            <span style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)' }}>{a.vehicle.vehicleType.name}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.5)', marginTop: 3 }}>
                            {a.vehicle.customer.name || ''} · {a.vehicle.customer.phone}
                          </div>
                          {a.notes && <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.35)', marginTop: 2, fontStyle: 'italic' }}>{a.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `${STATUS_COLORS[a.status]}20`, color: STATUS_COLORS[a.status], textTransform: 'uppercase', letterSpacing: 0.5 }}>{a.status}</span>
                          {a.status === 'pending' && <button onClick={() => updateStatus(a.id, 'confirmed')} style={{ background: 'rgba(56,189,248,0.15)', border: '0.5px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Confirm</button>}
                          {(a.status === 'confirmed' || a.status === 'pending') && <button onClick={() => updateStatus(a.id, 'done')} style={{ background: 'rgba(52,211,153,0.15)', border: '0.5px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>✓ Done</button>}
                          <button onClick={() => deleteAppt(a.id)} style={{ background: 'transparent', border: '0.5px solid rgba(248,113,113,0.3)', color: '#f87171', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✗</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {appointments.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(232,244,253,0.3)', fontSize: 14 }}>
          No appointments for this day. Customers can book at /book/[shopId]
        </div>
      )}
    </div>
  )
}
