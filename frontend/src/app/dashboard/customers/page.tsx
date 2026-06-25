'use client'
import { useEffect, useState, useCallback } from 'react'

interface Customer { id: string; phone: string; name: string|null; createdAt: string; vehicles: { id:string; plateNo:string; vehicleTypeName:string; vehicleTypeIcon:string; washGoal:number; activeWashes:number }[] }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchCustomers = useCallback(async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/customers${q ? `?search=${encodeURIComponent(q)}` : ''}`)
    const data = await res.json()
    if (data.success) setCustomers(data.data.customers || data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])
  useEffect(() => { const t = setTimeout(() => fetchCustomers(search), 300); return () => clearTimeout(t) }, [search, fetchCustomers])

  const th: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', color: 'rgba(232,244,253,0.4)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '0.5px solid rgba(56,189,248,0.1)', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#e8f4fd', borderBottom: '0.5px solid rgba(56,189,248,0.06)', verticalAlign: 'middle' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Customers</h1>
          <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>{customers.length} registered</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…"
          style={{ border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 13, background: '#0c1a2e', color: '#e8f4fd', outline: 'none', width: 240 }} />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(56,189,248,0.1)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(232,244,253,0.3)' }}>Loading…</div>
        : customers.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}><div style={{ fontSize: 36, marginBottom: 12 }}>👥</div><p style={{ color: 'rgba(232,244,253,0.3)', margin: 0 }}>{search ? 'No customers match.' : 'No customers yet.'}</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead><tr>
                <th style={th}>Customer</th>
                <th style={th}>Vehicles</th>
                <th style={th}>Joined</th>
              </tr></thead>
              <tbody>{customers.map(c => (
                <tr key={c.id}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#38bdf8', flexShrink: 0 }}>
                        {(c.name || c.phone).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{c.name || <span style={{ color: 'rgba(232,244,253,0.3)', fontStyle: 'italic', fontWeight: 400 }}>No name</span>}</div>
                        <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)' }}>{c.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.vehicles.length === 0 ? <span style={{ color: 'rgba(232,244,253,0.3)', fontSize: 12 }}>No vehicles</span>
                      : c.vehicles.map(v => (
                        <div key={v.id} style={{ background: 'rgba(56,189,248,0.08)', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 6, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 13 }}>{v.vehicleTypeIcon}</span>
                          <span style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'monospace', letterSpacing: 0.3 }}>{v.plateNo}</span>
                          <span style={{ fontSize: 10, color: v.activeWashes >= v.washGoal ? '#f59e0b' : 'rgba(232,244,253,0.4)' }}>{v.activeWashes}/{v.washGoal}{v.activeWashes >= v.washGoal ? ' 🎁' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...td, color: 'rgba(232,244,253,0.3)', fontSize: 12 }}>{new Date(c.createdAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
