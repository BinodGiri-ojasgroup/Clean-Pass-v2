'use client'
import { useState, useEffect, useRef, useCallback, use } from 'react'
import api from '@/lib/api'
import { normalizePhone, isValidNepaliPhone } from '@/lib/phone'

interface ShopInfo {
  id: string
  name: string
  logo: string | null
  themeColor: string | null
  wifiName?: string | null
  wifiPassword?: string | null
  wifiType?: string | null
  wifiHidden?: boolean | null
}

type Step = 'form' | 'submitted' | 'tracking' | 'check_form' | 'checking' | 'my_card'

interface WashStatus {
  status: string
  queuePosition: number | null
  packageName: string | null
  workerName: string | null
  shopName: string
  activeStamps: number
  washGoal: number
  isRewardReady: boolean
  recentWashes: { id: string; createdAt: string; paid: boolean; paymentMethod: string | null; redeemed: boolean; packageName: string | null }[]
}

export default function ScanPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [shopError, setShopError] = useState(false)
  const [step, setStep] = useState<Step>('form')

  // Request form
  const [phone, setPhone] = useState('')
  const [plateNo, setPlateNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Tracking state
  const [trackingPlate, setTrackingPlate] = useState('')
  const [washStatus, setWashStatus] = useState<WashStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  // Check status form
  const [checkPlate, setCheckPlate] = useState('')
  const [checkError, setCheckError] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [myVehicles, setMyVehicles] = useState<{id:string;plateNo:string;vehicleTypeName:string;vehicleTypeIcon:string;washGoal:number;activeWashes:number}[]|null>(null)
  const [myCardInput, setMyCardInput] = useState('')
  const [myCardError, setMyCardError] = useState('')
  const [myCardData, setMyCardData] = useState<{exists:boolean;shopName:string;customer?:{name:string|null;phone:string};vehicle?:{plateNo:string;make:string|null;color:string|null};vehicleType?:{name:string;icon:string;washGoal:number};activeWashes?:number;totalWashes?:number;totalRedemptions?:number;unpaidCount?:number;isRewardReady?:boolean;history?:{id:string;createdAt:string;redeemed:boolean;paid:boolean;packageName:string|null}[]}|null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const prevStatusRef = useRef<string | null>(null)
  const theme = shop?.themeColor || '#0ea5e9'

  // Helpers
  function normPhone(p: string) {
    let x = p.replace(/[\s\-().]/g, '').trim()
    if (x.startsWith('+')) x = x.slice(1)
    if (x.startsWith('977')) x = x.slice(3)
    if (x.startsWith('0')) x = x.slice(1)
    return x
  }
  function normPlate(p: string) { return p.toUpperCase().replace(/\s+/g, ' ').trim() }
  function handlePhoneChange(value: string, setter: (v: string) => void) {
    const cleaned = value.replace(/[^\d\s\-().]/g, '')
    setter(cleaned)
  }
  function handleComboInputChange(value: string, setter: (v: string) => void) {
    // Allow digits, spaces, hyphens, parentheses, and letters (for plates)
    const cleaned = value.replace(/[^\d\s\-().a-zA-Z]/g, '')
    setter(cleaned)
  }

  function playChime() {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      const ctx = audioRef.current
      if (ctx.state === 'suspended') ctx.resume()
      ;[523, 659, 784, 1046].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = f; o.type = 'sine'
        g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.15)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3)
        o.start(ctx.currentTime + i * 0.15)
        o.stop(ctx.currentTime + i * 0.15 + 0.35)
      })
    } catch { /**/ }
  }

  useEffect(() => {
    api.get(`/public/shops/${shopId}/`).then(res => {
      if (res.data.success) {
        setShop(res.data.data)
      } else {
        setShopError(true)
      }
    }).catch(() => setShopError(true))
  }, [shopId])

  const fetchStatus = useCallback(async (plate: string) => {
    try {
      const res = await api.get(`/public/track/${shopId}/?plateNo=${encodeURIComponent(normPlate(plate))}`)
      if (!res.data.success || !res.data.data.found) { 
        setStatusLoading(false)
        return 
      }
      const d = res.data.data
      const newStatus = d.activeWash?.status || 'no_wash'

      if (prevStatusRef.current && prevStatusRef.current !== 'done' && prevStatusRef.current !== 'no_wash' && newStatus === 'no_wash') {
        playChime()
      }
      prevStatusRef.current = newStatus

      setWashStatus({
        status: newStatus,
        queuePosition: d.queuePosition,
        packageName: d.activeWash?.packageName || null,
        workerName: d.activeWash?.workerName || null,
        shopName: d.shop?.name || '',
        activeStamps: d.activeStamps || 0,
        washGoal: d.washGoal || 8,
        isRewardReady: d.isRewardReady || false,
        recentWashes: d.recentWashes || [],
      })
    } catch { /**/ }
    setStatusLoading(false)
  }, [shopId])

  useEffect(() => {
    const plate = step === 'tracking' ? trackingPlate : step === 'checking' ? checkPlate : null
    if (!plate) { 
      if (pollRef.current) { 
        clearInterval(pollRef.current)
        pollRef.current = null 
      }
      return 
    }
    setStatusLoading(true)
    fetchStatus(plate)
    pollRef.current = setInterval(() => fetchStatus(plate), 5000)
    return () => { 
      if (pollRef.current) { 
        clearInterval(pollRef.current)
        pollRef.current = null 
      } 
    }
  }, [step, trackingPlate, checkPlate, fetchStatus])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return setError('Phone number is required')
    if (!isValidNepaliPhone(phone)) return setError('Please enter a valid Nepali phone number')
    if (!plateNo.trim()) return setError('Vehicle plate number is required')
    
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      if (audioRef.current.state === 'suspended') audioRef.current.resume()
    } catch { /**/ }
    
    setLoading(true)
    setError('')
    
    try {
      const res = await api.post(`/public/wash-requests/${shopId}/`, {
        phone: normPhone(phone),
        plate_no: normPlate(plateNo)
      })
      
      if (!res.data.success) { 
        setError(res.data.error || 'Something went wrong')
        return 
      }
      
      const plate = normPlate(plateNo)
      setTrackingPlate(plate)
      prevStatusRef.current = 'pending'
      setStep('submitted')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.')
    } finally { 
      setLoading(false) 
    }
  }

  async function handleMyCard(e: React.FormEvent) {
    e.preventDefault()
    const input = myCardInput.trim()
    if (!input) return setMyCardError('Enter your plate number or phone number')
    setMyCardError('')
    setMyCardData(null)
    
    try {
      const isPhone = /^[+0-9\s]{7,15}$/.test(input) && !/[A-Za-z]/.test(input)
      const normP = isPhone ? normPhone(input) : null
      const normPlateVal = !isPhone ? normPlate(input) : null
      
      const url = normPlateVal
        ? `/public/customer/${shopId}/?plateNo=${encodeURIComponent(normPlateVal)}`
        : `/public/customer/${shopId}/?phone=${encodeURIComponent(normP!)}`
      
      const res = await api.get(url)
      
      if (!res.data.success) return setMyCardError('Something went wrong')
      if (!res.data.data.exists) return setMyCardError('No loyalty card found. Complete a wash first!')
      
      if (res.data.data.vehicles && !res.data.data.vehicle) {
        if (res.data.data.vehicles.length === 0) return setMyCardError('No vehicles found')
        const firstPlate = res.data.data.vehicles[0].plateNo
        const res2 = await api.get(`/public/customer/${shopId}/?plateNo=${encodeURIComponent(firstPlate)}`)
        setMyCardData(res2.data.data)
      } else {
        setMyCardData(res.data.data)
      }
      setStep('my_card')
    } catch { 
      setMyCardError('Something went wrong') 
    }
  }

  async function handleCheckStatus(e: React.FormEvent) {
    e.preventDefault()
    const input = checkInput.trim()
    if (!input) return setCheckError('Enter your phone number or plate number')
    setCheckError('')
    setMyVehicles(null)
    setWashStatus(null)
    prevStatusRef.current = null

    const isPhone = /^[+0-9\s\-]{7,15}$/.test(input) && !/[A-Z]/.test(input.toUpperCase().replace(/[0-9+\s\-]/g,''))
    
    if (isPhone) {
      const normP = normPhone(input)
      try {
        const res = await api.get(`/public/customer/${shopId}/?phone=${encodeURIComponent(normP)}`)
        if (res.data.success && res.data.data.exists && res.data.data.vehicles?.length > 0) {
          setMyVehicles(res.data.data.vehicles)
          if (res.data.data.vehicles.length === 1) {
            setCheckPlate(res.data.data.vehicles[0].plateNo)
            setStep('checking')
          }
        } else {
          setCheckError('No vehicles found for this phone number')
        }
      } catch { 
        setCheckError('Something went wrong') 
      }
    } else {
      setCheckPlate(normPlate(input))
      setStep('checking')
    }
  }

  function startTracking() {
    setWashStatus(null)
    setStep('tracking')
  }

  function reset() {
    setStep('form')
    setError('')
    setWashStatus(null)
    setTrackingPlate('')
    setCheckPlate('')
    setCheckError('')
    setMyCardInput('')
    setMyCardError('')
    setMyCardData(null)
    prevStatusRef.current = null
    if (pollRef.current) { 
      clearInterval(pollRef.current)
      pollRef.current = null 
    }
  }

  const bg = '#0c1a2e'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 20, padding: '1.5rem' }
  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 12, padding: '14px 16px', color: '#e8f4fd', fontSize: 16, outline: 'none', boxSizing: 'border-box' }
  const btnPrimary: React.CSSProperties = { width: '100%', background: theme, color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
  const btnGhost: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '13px', fontSize: 14, color: 'rgba(232,244,253,0.6)', cursor: 'pointer' }
  const lbl: React.CSSProperties = { display: 'block', color: 'rgba(232,244,253,0.6)', fontSize: 13, marginBottom: 8, fontWeight: 500 }

  if (shopError) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
        <h2 style={{ color: '#e8f4fd' }}>Wash station not found</h2>
      </div>
    </div>
  )

  function StatusCard({ plate }: { plate: string }) {
    if (statusLoading || !washStatus) {
      return (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <div className="pulse" style={{ fontSize: 44, marginBottom: 12 }}>🔄</div>
          <p style={{ color: 'rgba(232,244,253,0.5)', fontSize: 14 }}>Checking status for {plate}…</p>
        </div>
      )
    }

    const { status, queuePosition, packageName, workerName, shopName, activeStamps, washGoal, isRewardReady, recentWashes } = washStatus

    const PAY_LABEL: Record<string, string> = { cash: 'Cash', esewa: 'eSewa', khalti: 'Khalti', credit: 'Unpaid', free: 'Free wash' }
    function timeAgo(d: string) {
      const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
      if (min < 1) return 'just now'
      if (min < 60) return `${min}m ago`
      return `${Math.floor(min / 60)}h ${min % 60}m ago`
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: `${theme}15`, border: `1px solid ${theme}40`, borderRadius: 10, padding: '6px 16px', display: 'inline-block', fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: theme, letterSpacing: 2 }}>{plate}</div>
          {shopName && <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.35)', marginTop: 4 }}>📍 {shopName}</div>}
        </div>

        {status === 'pending' && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>⏳</div>
            <h3 style={{ color: '#f59e0b', fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>Waiting for staff approval</h3>
            <p style={{ color: 'rgba(232,244,253,0.5)', fontSize: 13, margin: 0 }}>Show your phone to the staff at the counter to get approved</p>
          </div>
        )}

        {status === 'queued' && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>⏳</div>
            <h3 style={{ color: '#f59e0b', fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>In Queue</h3>
            {queuePosition && (
              <div style={{ background: 'rgba(245,158,11,0.12)', borderRadius: 12, padding: '1rem', margin: '10px 0' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>#{queuePosition}</div>
                <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.5)', marginTop: 4 }}>in queue · est. {queuePosition * 10}–{queuePosition * 15} min</div>
              </div>
            )}
            {packageName && <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)' }}>🧴 {packageName}</div>}
            <p style={{ color: 'rgba(232,244,253,0.3)', fontSize: 11, marginTop: 10, marginBottom: 0 }}>You can leave — this updates automatically</p>
          </div>
        )}

        {status === 'washing' && (
          <div style={{ background: `${theme}10`, border: `1px solid ${theme}30`, borderRadius: 16, padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🚿</div>
            <h3 style={{ color: theme, fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>Being Washed Now!</h3>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', margin: '12px 0' }}>
              <div style={{ height: '100%', background: theme, borderRadius: 4, animation: 'wp 2s ease-in-out infinite' }} />
              <style>{`@keyframes wp{0%{width:10%}50%{width:90%}100%{width:10%}}`}</style>
            </div>
            {workerName && <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 4 }}>👷 {workerName}</div>}
            {packageName && <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.4)' }}>🧴 {packageName}</div>}
            <p style={{ color: 'rgba(232,244,253,0.3)', fontSize: 11, marginTop: 10, marginBottom: 0 }}>Page updates automatically when done</p>
          </div>
        )}

        {(status === 'done' || status === 'no_wash') && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
            <h3 style={{ color: '#4ade80', fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>
              {recentWashes.length > 0 ? 'Wash Complete! Ready for pickup.' : 'No active wash'}
            </h3>
            <p style={{ color: 'rgba(232,244,253,0.4)', fontSize: 13, margin: 0 }}>
              {recentWashes.length > 0 ? 'Your vehicle has been washed and is ready.' : 'No wash currently in progress.'}
            </p>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(232,244,253,0.6)', fontWeight: 500 }}>🎯 Loyalty card</span>
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: theme, fontWeight: 700 }}>{Math.min(activeStamps, washGoal)}/{washGoal}</span>
          </div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {Array.from({ length: washGoal }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < activeStamps ? (isRewardReady ? '#22c55e' : theme) : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          {isRewardReady
            ? <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>🎁 Free wash earned! Show to staff.</div>
            : <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.3)' }}>{washGoal - activeStamps} more washes for a free wash</div>}
        </div>

        {recentWashes.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.1)', borderRadius: 14, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 500 }}>Recent washes</div>
            {recentWashes.slice(0, 5).map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
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

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(232,244,253,0.2)', margin: 0 }}>Updates every 5 seconds automatically</p>
        <button onClick={reset} style={btnGhost}>← Back to main</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {shop?.logo
            ? <img src={shop.logo} alt={shop.name} style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', marginBottom: 10, border: `2px solid ${theme}40` }} />
            : <div style={{ width: 64, height: 64, borderRadius: 16, background: `${theme}20`, border: `2px solid ${theme}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 10px' }}>🚗</div>}
          {shop && <>
            <div style={{ color: '#e8f4fd', fontSize: 20, fontWeight: 700 }}>{shop.name}</div>
          </>}
        </div>

        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={card}>
              <h2 style={{ color: '#e8f4fd', fontSize: 16, fontWeight: 700, margin: '0 0 1.25rem' }}>🚗 Request a wash</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={lbl}>📱 Phone number *</label>
                  <input suppressHydrationWarning type="tel" value={phone} onChange={e => handlePhoneChange(e.target.value, setPhone)} placeholder="98 XXXX XXXX" maxLength={14} required style={inp} inputMode="numeric" />
                </div>
                <div>
                  <label style={lbl}>🚗 Plate number *</label>
                  <input suppressHydrationWarning type="text" value={plateNo} onChange={e => setPlateNo(e.target.value.toUpperCase())} placeholder="BA 1 PA 2345" required style={{ ...inp, fontFamily: 'monospace', letterSpacing: 1 }} />
                </div>
                {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>⚠ {error}</div>}
                <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.75 : 1, marginTop: 4 }}>
                  {loading ? 'Submitting…' : '🚗 Submit wash request'}
                </button>
              </form>
            </div>

            {shop?.wifiName && (
              <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: '1.25rem' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4fd', marginBottom: '0.875rem' }}>📶 Free WiFi</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`WIFI:S:${shop.wifiName};T:${shop.wifiType || 'WPA'};P:${shop.wifiPassword || ''};H:${shop.wifiHidden ? 'true' : 'false'};;`)}`}
                    alt="WiFi QR Code"
                    style={{ width: 120, height: 120, borderRadius: 12, background: '#fff', objectFit: 'contain' }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)' }}>SSID</div>
                      <div style={{ fontSize: 14, color: '#4ade80', fontWeight: 600 }}>{shop.wifiName}</div>
                    </div>
                    {shop.wifiPassword && (
                      <div>
                        <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)' }}>Password</div>
                        <div style={{ fontSize: 14, color: '#4ade80', fontWeight: 600, fontFamily: 'monospace' }}>{shop.wifiPassword}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4fd', marginBottom: 3 }}>🔍 Check your wash status</div>
              <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.45)', marginBottom: '0.875rem' }}>Enter your phone number or plate number</div>
              <form onSubmit={handleCheckStatus} style={{ display: 'flex', gap: 8 }}>
                <input suppressHydrationWarning type="text" value={checkInput} onChange={e => handleComboInputChange(e.target.value, setCheckInput)} placeholder="98 XXXX XXXX or BA 1 PA 2345" style={{ ...inp, flex: 1, padding: '10px 14px', fontSize: 14 }} />
                <button type="submit" style={{ background: theme, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Check →</button>
              </form>
              {checkError && <div style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>⚠ {checkError}</div>}
              {myVehicles && myVehicles.length > 1 && (
                <div style={{ marginTop: '0.875rem' }}>
                  <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.5)', marginBottom: 8 }}>Select which vehicle to check:</div>
                  {myVehicles.map(v => (
                    <button key={v.id} onClick={() => { setCheckPlate(v.plateNo); setMyVehicles(null); setStep('checking') }}
                      style={{ width: '100%', background: 'rgba(56,189,248,0.08)', border: '0.5px solid rgba(56,189,248,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{v.vehicleTypeIcon}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: theme, letterSpacing: 0.5 }}>{v.plateNo}</span>
                        <span style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)' }}>{v.vehicleTypeName}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)' }}>{v.activeWashes}/{v.washGoal} washes</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4fd', marginBottom: 3 }}>🎯 My loyalty card</div>
              <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.45)', marginBottom: '0.875rem' }}>See your stamps, history and free wash progress</div>
              <form onSubmit={handleMyCard} style={{ display: 'flex', gap: 8 }}>
                <input suppressHydrationWarning type="text" value={myCardInput} onChange={e => handleComboInputChange(e.target.value, setMyCardInput)} placeholder="98 XXXX XXXX or BA 1 PA 2345" style={{ ...inp, flex: 1, padding: '10px 14px', fontSize: 14 }} />
                <button type="submit" style={{ background: '#f59e0b', color: '#0c1a2e', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>View →</button>
              </form>
              {myCardError && <div style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>⚠ {myCardError}</div>}
            </div>
          </div>
        )}

        {step === 'submitted' && (
          <div style={card}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 20 }}>
                {[
                  { n: 1, l: 'Submitted', done: true },
                  { n: 2, l: 'Approval', done: false, active: true },
                  { n: 3, l: 'Queue', done: false },
                  { n: 4, l: 'Done', done: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: s.done ? '#22c55e' : s.active ? theme : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: (s.done || s.active) ? '#fff' : 'rgba(232,244,253,0.3)' }}>{s.done ? '✓' : s.n}</div>
                      <div style={{ fontSize: 9, color: s.done ? '#22c55e' : s.active ? theme : 'rgba(232,244,253,0.25)', whiteSpace: 'nowrap' }}>{s.l}</div>
                    </div>
                    {i < 3 && <div style={{ width: 22, height: 1.5, background: s.done ? '#22c55e' : 'rgba(255,255,255,0.1)', margin: '0 3px', marginBottom: 16 }} />}
                  </div>
                ))}
              </div>
              <div className="pulse" style={{ fontSize: 48, marginBottom: 10 }}>🚗</div>
              <h2 style={{ color: '#e8f4fd', fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>Request sent!</h2>
              <div style={{ background: `${theme}15`, border: `0.5px solid ${theme}30`, borderRadius: 8, padding: '5px 14px', display: 'inline-block', fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: theme, letterSpacing: 1.5, marginBottom: 16 }}>{trackingPlate}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '1rem', marginBottom: '1rem', fontSize: 13, color: 'rgba(232,244,253,0.6)', lineHeight: 1.9 }}>
              <div>1️⃣ Show this screen to staff at the counter</div>
              <div>2️⃣ Staff approves → your vehicle enters the queue</div>
              <div>3️⃣ You can leave — track status anytime below</div>
            </div>
            <button onClick={startTracking} style={{ ...btnPrimary, marginBottom: 10 }}>
              📍 Track my wash live →
            </button>
            <button onClick={reset} style={btnGhost}>← Back</button>
          </div>
        )}

        {step === 'tracking' && (
          <div style={card}>
            <StatusCard plate={trackingPlate} />
          </div>
        )}

        {step === 'checking' && (
          <div style={card}>
            <StatusCard plate={normPlate(checkPlate)} />
          </div>
        )}

        {step === 'my_card' && myCardData && myCardData.exists && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(245,158,11,0.25)', borderRadius: 18, padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {myCardData.vehicleType?.icon || '🚗'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#f59e0b', letterSpacing: 1 }}>{myCardData.vehicle?.plateNo}</div>
                  <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.45)', marginTop: 2 }}>
                    {myCardData.vehicleType?.name}
                    {myCardData.vehicle?.color ? ` · ${myCardData.vehicle.color}` : ''}
                    {myCardData.vehicle?.make ? ` ${myCardData.vehicle.make}` : ''}
                  </div>
                </div>
                {myCardData.customer?.name && (
                  <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.4)', textAlign: 'right' }}>
                    👤 {myCardData.customer.name}
                  </div>
                )}
              </div>

              {myCardData.isRewardReady ? (
                <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 12, padding: '0.875rem', marginBottom: '0.875rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>🎁</div>
                  <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 15 }}>Free wash ready!</div>
                  <div style={{ color: 'rgba(74,222,128,0.7)', fontSize: 12, marginTop: 2 }}>Show this to staff to claim your free wash</div>
                </div>
              ) : (
                <div style={{ marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'rgba(232,244,253,0.6)' }}>Loyalty progress</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700 }}>
                      {Math.min(myCardData.activeWashes || 0, myCardData.vehicleType?.washGoal || 8)}/{myCardData.vehicleType?.washGoal || 8}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: myCardData.vehicleType?.washGoal || 8 }).map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 10, borderRadius: 5, background: i < (myCardData.activeWashes || 0) ? '#f59e0b' : 'rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.35)', marginTop: 5 }}>
                    {(myCardData.vehicleType?.washGoal || 8) - (myCardData.activeWashes || 0)} more washes for a free wash
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
                {[
                  { label: 'Active', value: myCardData.activeWashes ?? 0, icon: '✦', color: '#f59e0b' },
                  { label: 'Total washes', value: myCardData.totalWashes ?? 0, icon: '🚗', color: '#38bdf8' },
                  { label: 'Free washes', value: myCardData.totalRedemptions ?? 0, icon: '🎁', color: '#4ade80' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(232,244,253,0.35)', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {(myCardData.unpaidCount || 0) > 0 && (
                <div style={{ marginTop: 10, background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f87171' }}>
                  💳 {myCardData.unpaidCount} unpaid wash{(myCardData.unpaidCount || 0) > 1 ? 'es' : ''} — please settle with the wash station
                </div>
              )}
            </div>

            {myCardData.history && myCardData.history.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.1)', borderRadius: 14, padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Wash history</div>
                {myCardData.history.map((h, i) => {
                  const date = new Date(h.createdAt)
                  const dateStr = date.toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
                  return (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < (myCardData.history?.length || 0) - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: h.redeemed ? 'rgba(34,197,94,0.12)' : h.paid ? 'rgba(245,158,11,0.12)' : 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                        {h.redeemed ? '🎁' : h.paid ? '✦' : '💳'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: h.redeemed ? '#4ade80' : h.paid ? '#f59e0b' : '#f87171', fontWeight: 500 }}>
                          {h.redeemed ? 'Free wash redeemed' : h.packageName || 'Wash'}
                          {!h.paid && !h.redeemed && <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.7 }}>(unpaid)</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(232,244,253,0.3)', marginTop: 1 }}>{dateStr}</div>
                      </div>
                      <div style={{ fontSize: 10, color: h.paid || h.redeemed ? 'rgba(34,197,94,0.6)' : '#f87171', fontWeight: 500 }}>
                        {h.redeemed ? 'FREE' : h.paid ? '✓ Paid' : 'Unpaid'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button onClick={reset} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '13px', fontSize: 14, color: 'rgba(232,244,253,0.6)', cursor: 'pointer' }}>← Back</button>
          </div>
        )}

        <p style={{ textAlign: 'center', color: 'rgba(232,244,253,0.1)', fontSize: 11, marginTop: '1.5rem' }}>Powered by CleanPass Nepal</p>
      </div>
    </div>
  )
}