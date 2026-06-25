'use client'
import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api' // 🔑 Imported your unified Axios instance

interface WashCard {
  id: string; status: string; createdAt: string; washStartAt: string | null
  plateNo: string; vehicleType: { name: string; icon: string }
  customerName: string | null; customerPhone: string
  packageName: string | null; packagePrice: number | null; packageColor: string | null
  paid: boolean; paymentMethod: string | null
  worker: { id: string; name: string } | null
  notes: string | null
}
interface Worker { id: string; name: string }

const PAYMENT_METHODS = [
  { key: 'cash',   label: 'Cash',      color: '#22c55e', emoji: '💵' },
  { key: 'esewa',  label: 'eSewa',     color: '#8b5cf6', emoji: '📱' },
  { key: 'khalti', label: 'Khalti',    color: '#a855f7', emoji: '📲' },
  { key: 'credit', label: 'Credit',    color: '#f87171', emoji: '💳' },
  { key: 'free',   label: 'Free wash', color: '#f59e0b', emoji: '🎁' },
]

const COL = {
  queued:  { label: 'Queue',   color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  next: 'washing' as const, nextLabel: '▶ Start wash' },
  washing: { label: 'Washing', color: '#0ea5e9', bg: 'rgba(14,165,233,0.07)', next: 'done'    as const, nextLabel: '✓ Mark done'  },
}

function timeWaiting(dateStr: string) {
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (min < 1) return '<1 min'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

function WashCardItem({ card, cfg, workers, onMove, onUpdate, acting }: {
  card: WashCard
  cfg: typeof COL.queued
  workers: Worker[]
  onMove: (card: WashCard, to: string) => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  acting: string | null
}) {
  const waiting = timeWaiting(card.status === 'washing' && card.washStartAt ? card.washStartAt : card.createdAt)
  const pm = PAYMENT_METHODS.find(p => p.key === card.paymentMethod)

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${cfg.color}30`, borderLeft: `3px solid ${cfg.color}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color, fontFamily: 'monospace', letterSpacing: 0.5 }}>{card.plateNo}</div>
          <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)', marginTop: 1 }}>
            {card.vehicleType.icon} {card.vehicleType.name}{card.customerName ? ` · ${card.customerName}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'rgba(232,244,253,0.35)' }}>{waiting}</div>
          {card.packageName && <div style={{ fontSize: 11, color: card.packageColor || cfg.color, fontWeight: 500, marginTop: 2 }}>{card.packageName}{card.packagePrice ? ` — NPR ${card.packagePrice}` : ''}</div>}
        </div>
      </div>

      {workers.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <select value={card.worker?.id || ''} onChange={e => onUpdate(card.id, { workerId: e.target.value || null })}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: card.worker ? '#e8f4fd' : 'rgba(232,244,253,0.35)', outline: 'none' }}>
            <option value="">Assign worker…</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        {pm ? (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${pm.color}20`, color: pm.color, fontWeight: 500 }}>
            {pm.emoji} {pm.label}
          </span>
        ) : (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>Payment not recorded</span>
        )}
        {card.worker && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>👷 {card.worker.name}</span>}
      </div>

      <button onClick={() => onMove(card, cfg.next)} disabled={acting === card.id}
        style={{ width: '100%', background: cfg.color, color: '#0c1a2e', border: 'none', borderRadius: 7, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: acting === card.id ? 0.6 : 1 }}>
        {acting === card.id ? '…' : cfg.nextLabel}
      </button>
    </div>
  )
}

export default function QueuePage() {
  const [cards, setCards] = useState<WashCard[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState<WashCard | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // 📡 Fetches datasets cleanly from Django REST Framework
  const fetchQueue = useCallback(async () => {
    try {
      const [qRes, wRes] = await Promise.all([
        api.get('washstations/queue/'), 
        api.get('auth/workers/')
      ])
      if (qRes.data.success) setCards(qRes.data.data)
      if (wRes.data.success) setWorkers(wRes.data.data)
    } catch (err) {
      console.error("Error communicating with Django Queue endpoints:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
    const t = setInterval(fetchQueue, 5000)
    return () => clearInterval(t)
  }, [fetchQueue])

  // 📝 Sends a secure PATCH update straight to Django
  async function updateCard(id: string, data: Record<string, unknown>) {
    try {
      await api.patch(`queue/${id}/`, data)
      await fetchQueue()
    } catch (err) {
      console.error("Error patching card state via Django:", err)
    }
  }

  async function moveStatus(card: WashCard, toStatus: string) {
    setActingId(card.id)
    if (toStatus === 'done') {
      setPayModal(card)
      setActingId(null)
      return
    }
    await updateCard(card.id, { status: toStatus })
    setActingId(null)
    showToast(`▶ Started wash for ${card.plateNo}`)
  }

  async function completeWithPayment(paymentMethod: string) {
    if (!payModal) return
    setActingId(payModal.id)
    const paid = paymentMethod !== 'credit'
    await updateCard(payModal.id, { status: 'done', paymentMethod, paid })
    setPayModal(null)
    setActingId(null)
    showToast(`✓ ${payModal.plateNo} done · ${PAYMENT_METHODS.find(p => p.key === paymentMethod)?.label}`)
  }

  const queued  = cards.filter(c => c.status === 'queued')
  const washing = cards.filter(c => c.status === 'washing')

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{toast}</div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: 0 }}>Wash Queue</h1>
        <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 14, marginTop: 4 }}>
          {queued.length} waiting · {washing.length} in progress · refreshes every 5s
        </p>
      </div>

      {loading ? <div style={{ color: 'rgba(232,244,253,0.3)', textAlign: 'center', padding: '3rem' }}>Loading…</div> : (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {(['queued', 'washing'] as const).map(status => {
            const cfg = COL[status]
            const colCards = status === 'queued' ? queued : washing
            return (
              <div key={status} style={{ flex: 1, minWidth: 260, background: cfg.bg, border: `0.5px solid ${cfg.color}20`, borderRadius: 14, padding: '1rem' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  {status === 'queued' ? '⏳' : '🚿'} {cfg.label} ({colCards.length})
                </div>
                {colCards.length === 0 && (
                  <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.25)', textAlign: 'center', padding: '1.5rem 0' }}>
                    {status === 'queued' ? 'No vehicles waiting' : 'No active washes'}
                  </div>
                )}
                {colCards.map(c => (
                  <WashCardItem key={c.id} card={c} cfg={cfg} workers={workers}
                    onMove={moveStatus} onUpdate={updateCard} acting={actingId} />
                ))}
              </div>
            )
          })}

          <div style={{ flex: 1, minWidth: 260, background: 'rgba(34,197,94,0.05)', border: '0.5px solid rgba(34,197,94,0.15)', borderRadius: 14, padding: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>✓ Done today</div>
            <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.3)', textAlign: 'center', padding: '1rem 0' }}>See Daily Summary for completed washes</div>
          </div>
        </div>
      )}

      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0c1a2e', border: '0.5px solid rgba(56,189,248,0.25)', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#e8f4fd', margin: 0 }}>Record payment</h2>
                <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 13, margin: '4px 0 0' }}>
                  {payModal.plateNo} · {payModal.packageName || 'Wash'}{payModal.packagePrice ? ` — NPR ${payModal.packagePrice}` : ''}
                </p>
              </div>
              <button onClick={() => setPayModal(null)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: 'rgba(232,244,253,0.4)', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 12, fontWeight: 500 }}>How did the customer pay?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem' }}>
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.key} onClick={() => completeWithPayment(pm.key)}
                  style={{ background: `${pm.color}15`, border: `1px solid ${pm.color}40`, borderRadius: 10, padding: '13px 16px', fontSize: 15, color: pm.color, cursor: 'pointer', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{pm.emoji}</span>
                  <span>{pm.label}</span>
                  {pm.key === 'credit' && <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>— tracked as unpaid</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setPayModal(null)} style={{ width: '100%', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px', fontSize: 13, color: 'rgba(232,244,253,0.4)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}