'use client'
import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api' 
import { formatPhone, normalizePhone, isValidNepaliPhone } from '@/lib/phone'

interface ShopData { 
  id: string; name: string; email: string; address: string|null; phone: string|null; 
  plan: string; planExpiresAt: string|null; planActive: boolean; freeLimit: number; 
  shopLogo: string|null; themeColor: string|null; qrCode: string|null; 
  wifiName: string|null; wifiPassword: string|null; wifiType: string|null; wifiHidden: boolean; 
  smsEnabled: boolean; smsApiKey: string|null; smsSenderId: string|null 
}

const COLORS = ['#0ea5e9','#38bdf8','#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#f97316','#06b6d4']

function mapApiToState(d: any): ShopData {
  return {
    id: d.id, name: d.name, email: d.email, address: d.address || null, phone: d.phone || null,
    plan: d.plan, planExpiresAt: d.plan_expires_at || null, planActive: d.active, freeLimit: d.free_limit,
    shopLogo: d.washstation_logo || null, themeColor: d.theme_color || null, qrCode: d.qr_code || null,
    wifiName: d.wifi_name || null, wifiPassword: d.wifi_password || null, wifiType: d.wifi_type || null,
    wifiHidden: d.wifi_hidden || false, smsEnabled: d.sms_enabled || false, smsApiKey: d.sms_api_key || null,
    smsSenderId: d.sms_sender_id || null,
  }
}

function mapStateToApi(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'shopLogo') payload['washstation_logo'] = value
    else if (key === 'themeColor') payload['theme_color'] = value
    else if (key === 'wifiName') payload['wifi_name'] = value
    else if (key === 'wifiPassword') payload['wifi_password'] = value
    else if (key === 'wifiType') payload['wifi_type'] = value
    else if (key === 'wifiHidden') payload['wifi_hidden'] = value
    else if (key === 'smsEnabled') payload['sms_enabled'] = value
    else if (key === 'smsApiKey') payload['sms_api_key'] = value
    else if (key === 'smsSenderId') payload['sms_sender_id'] = value
    else payload[key] = value
  }
  return payload
}

export default function SettingsPage() {
  const [shop, setShop] = useState<ShopData | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false) // 👈 NEW: Tracks if user needs onboarding
  const [setupForm, setSetupForm] = useState({ name: '', phone: '', address: '' }) // 👈 NEW: Setup form state
  
  const [form, setForm] = useState({ name:'', address:'', phone:'' })
  const [shopLogo, setShopLogo] = useState('')
  const [shopLogoFile, setShopLogoFile] = useState<File | null>(null)
  const [themeColor, setThemeColor] = useState('#0ea5e9')
  const [wifiForm, setWifiForm] = useState({ wifiName:'', wifiPassword:'', wifiType:'WPA', wifiHidden: false })
  const [smsForm, setSmsForm] = useState({ smsEnabled: false, smsApiKey:'', smsSenderId:'CleanPass' })
  const [qrData, setQrData] = useState<{ qrCode:string; scanUrl:string }|null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await api.get('/shops/me/')
        if (res.data.success) {
          const mappedData = mapApiToState(res.data.data)
          setShop(mappedData)
          setForm({ name: mappedData.name, address: mappedData.address || '', phone: mappedData.phone || '' })
          setShopLogo(mappedData.shopLogo || '')
          setThemeColor(mappedData.themeColor || '#0ea5e9')
          setWifiForm({ wifiName: mappedData.wifiName || '', wifiPassword: mappedData.wifiPassword || '', wifiType: mappedData.wifiType || 'WPA', wifiHidden: mappedData.wifiHidden || false })
          setSmsForm({ smsEnabled: mappedData.smsEnabled || false, smsApiKey: mappedData.smsApiKey || '', smsSenderId: mappedData.smsSenderId || 'CleanPass' })
          if (mappedData.qrCode) setQrData({ qrCode: mappedData.qrCode, scanUrl: `${window.location.origin}/scan/${mappedData.id}` })
          
          try { const qrRes = await api.get('/qr/'); if(qrRes.data.success) setQrData(qrRes.data.data) } catch(e) {}
        }
      } catch (err: any) {
        // 👇 CRITICAL: Detect the 404 and trigger Setup Mode
        if (err.response?.status === 404 && err.response.data?.needs_setup) {
          setNeedsSetup(true)
        } else {
          console.error("Failed to fetch shop profile:", err)
        }
      }
    }
    fetchShop()
  }, [])

  function handlePhoneChange(value: string) {
    // Only allow digits, spaces, parentheses, hyphens
    const cleaned = value.replace(/[^\d\s\-().]/g, '')
    setForm(p => ({ ...p, phone: cleaned }))
  }
  
  function handleSetupPhoneChange(value: string) {
    // Only allow digits, spaces, parentheses, hyphens
    const cleaned = value.replace(/[^\d\s\-().]/g, '')
    setSetupForm(p => ({ ...p, phone: cleaned }))
  }
  
  // 👇 NEW FUNCTION: Handles the initial creation of the shop
  async function handleInitialSetup(e: React.FormEvent) {
    e.preventDefault()
    // Validate phone number if provided
    if (setupForm.phone.trim() && !isValidNepaliPhone(setupForm.phone)) {
      showSaved('⚠ Please enter a valid Nepali phone number')
      setSaving(false)
      return
    }
    setSaving(true)
    const payload = { ...setupForm }
    if (payload.phone) payload.phone = normalizePhone(payload.phone)
    try {
      const res = await api.post('/shops/me/', payload)
      if (res.data.success) {
        const mappedData = mapApiToState(res.data.data)
        setShop(mappedData)
        // Update all form states with the newly created shop data!
        setForm({ name: mappedData.name, address: mappedData.address || '', phone: mappedData.phone || '' })
        setShopLogo(mappedData.shopLogo || '')
        setThemeColor(mappedData.themeColor || '#0ea5e9')
        setWifiForm({ 
          wifiName: mappedData.wifiName || '', 
          wifiPassword: mappedData.wifiPassword || '', 
          wifiType: mappedData.wifiType || 'WPA', 
          wifiHidden: mappedData.wifiHidden || false 
        })
        setSmsForm({ 
          smsEnabled: mappedData.smsEnabled || false, 
          smsApiKey: mappedData.smsApiKey || '', 
          smsSenderId: mappedData.smsSenderId || 'CleanPass' 
        })
        // Also try to fetch and set QR code
        try { 
          const qrRes = await api.get('/qr/'); 
          if(qrRes.data.success) setQrData(qrRes.data.data) 
        } catch(e) {}
        setNeedsSetup(false) // Switch to normal settings view
        showSaved('✓ Shop created successfully!')
      }
    } catch (err) {
      console.error("Setup failed:", err)
      showSaved('✗ Failed to create shop')
    }
    setSaving(false)
  }

  function showSaved(msg: string) { setSaved(msg); setTimeout(() => setSaved(''), 3000) }

  async function saveSection(data: Record<string,unknown>, label: string) {
    setSaving(true)
    try {
      let res;
      if (label === 'Branding') {
        const formData = new FormData()
        formData.append('theme_color', themeColor)
        if (shopLogoFile) {
          formData.append('washstation_logo', shopLogoFile)
        }
        res = await api.patch('/shops/me/', formData)
        // Clear the file after successful save
        setShopLogoFile(null)
      } else {
        const payload = mapStateToApi(data)
        // Normalize phone if present
        if (payload.phone) payload.phone = normalizePhone(String(payload.phone))
        res = await api.patch('/shops/me/', payload, {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (res.data.success) {
        showSaved(`✓ ${label} saved`)
        setShop(mapApiToState(res.data.data))
      } else {
        showSaved(`✗ Failed to save ${label}`)
      }
    } catch (err) {
      console.error("Save failed:", err)
      showSaved(`✗ Network error saving ${label}`)
    }
    setSaving(false)
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 300 * 1024) { alert('Image must be under 300KB'); return }
    const reader = new FileReader()
    reader.onload = ev => setShopLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
    setShopLogoFile(file)
  }

  async function generateQR() {
    setQrLoading(true)
    try { const res = await api.get('/qr/'); if (res.data.success) setQrData(res.data.data) } catch (err) {}
    setQrLoading(false)
  }

  // --- UI STYLING CONSTANTS ---
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '1.75rem', marginBottom: '1.5rem' }
  const inp: React.CSSProperties = { width: '100%', border: '0.5px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#e8f4fd', background: '#0f2035', outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, color: 'rgba(232,244,253,0.5)', marginBottom: 6 }
  const btn = (primary = true): React.CSSProperties => ({ background: primary ? '#0ea5e9' : 'transparent', color: primary ? '#fff' : 'rgba(232,244,253,0.5)', border: primary ? 'none' : '0.5px solid rgba(232,244,253,0.15)', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 })

  // 👇 RENDER SETUP MODE IF NEEDED
  if (needsSetup) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
        {saved && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500 }}>{saved}</div>}
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: '0 0 1rem' }}>
          Welcome! Let's set up your wash station.
        </h1>
        <p style={{ color: 'rgba(232,244,253,0.5)', marginBottom: '2rem', fontSize: 14 }}>
          Please provide your shop details to get started. You can configure the rest later.
        </p>
        <form onSubmit={handleInitialSetup} style={card}>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={lbl}>Station Name *</label>
              <input style={inp} value={setupForm.name} onChange={e => setSetupForm(p=>({...p, name:e.target.value}))} placeholder="e.g., Shine Auto Spa" required />
            </div>
            <div>
              <label style={lbl}>Phone</label>
              <input style={inp} value={setupForm.phone} onChange={e => handleSetupPhoneChange(e.target.value)} placeholder="98 XXXX XXXX" maxLength={14} inputMode="numeric" />
            </div>
            <div>
              <label style={lbl}>Address</label>
              <input style={inp} value={setupForm.address} onChange={e => setSetupForm(p=>({...p, address:e.target.value}))} placeholder="Thamel, Kathmandu" />
            </div>
          </div>
          <button type="submit" disabled={saving} style={btn()}>
            {saving ? 'Creating Shop...' : 'Create My Shop & Continue'}
          </button>
        </form>
      </div>
    )
  }

  if (!shop) return <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(232,244,253,0.3)' }}>Loading…</div>

  // 👇 RENDER NORMAL SETTINGS MODE
  return (
    <div style={{ maxWidth: 600 }}>
      {saved && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#166534', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500 }}>{saved}</div>}

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#e8f4fd', margin: '0 0 2rem' }}>Settings</h1>

      {/* Plan */}
      <div style={{ ...card, background: 'rgba(56,189,248,0.06)', border: '0.5px solid rgba(56,189,248,0.2)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ background: '#0ea5e9', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, textTransform: 'uppercase' }}>{shop.plan}</span>
          {!shop.planActive && <span style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', fontSize: 11, padding: '3px 10px', borderRadius: 5, marginLeft: 6 }}>Expired</span>}
          <div style={{ fontSize: 13, color: 'rgba(232,244,253,0.4)', marginTop: 6 }}>{shop.plan === 'free' ? `Up to ${shop.freeLimit} vehicles` : 'Unlimited vehicles'}</div>
          {shop.planExpiresAt && <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.3)', marginTop: 2 }}>Active until {new Date(shop.planExpiresAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(232,244,253,0.3)' }}>Contact admin to upgrade</div>
      </div>

      {/* Branding */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e8f4fd', margin: '0 0 1.25rem' }}>🎨 Branding</h2>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={lbl}>Shop logo (max 300KB)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {shopLogo ? <img src={shopLogo} alt="logo" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(56,189,248,0.3)', flexShrink: 0 }} />
              : <div style={{ width: 52, height: 52, borderRadius: 10, background: 'rgba(56,189,248,0.1)', border: '2px dashed rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚗</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
              <button type="button" onClick={() => logoRef.current?.click()} style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'rgba(232,244,253,0.6)', cursor: 'pointer' }}>{shopLogo ? 'Change' : 'Upload'}</button>
              {shopLogo && <button type="button" onClick={() => { setShopLogo(''); setShopLogoFile(null); }} style={{ background: 'transparent', border: 'none', fontSize: 12, color: '#f87171', cursor: 'pointer' }}>Remove</button>}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={lbl}>Accent color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {COLORS.map(c => <button key={c} type="button" onClick={() => setThemeColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${themeColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer', outline: themeColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />)}
            <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: 2, background: 'transparent' }} />
          </div>
        </div>
        <button type="button" onClick={() => saveSection({ shopLogo: shopLogo || null, themeColor }, 'Branding')} style={btn()}>Save branding</button>
      </div>

      {/* Shop info */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e8f4fd', margin: '0 0 1.25rem' }}>🏪 Wash Station Info</h2>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
          <div><label style={lbl}>Station Name</label><input style={inp} value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} /></div>
          <div><label style={lbl}>Email (cannot change)</label><input style={{ ...inp, opacity: 0.4 }} value={shop.email} disabled /></div>
          <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="98 XXXX XXXX" maxLength={14} inputMode="numeric" /></div>
          <div><label style={lbl}>Address</label><input style={inp} value={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))} placeholder="Thamel, Kathmandu" /></div>
        </div>
        <button type="button" onClick={() => saveSection(form, 'Shop info')} style={btn()}>Save info</button>
      </div>

      {/* QR Code */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e8f4fd', margin: '0 0 6px' }}>QR Code</h2>
        <p style={{ fontSize: 13, color: 'rgba(232,244,253,0.4)', margin: '0 0 1.25rem' }}>Print and place at your counter. Customers scan to request a wash.</p>
        {qrData ? (
          <div style={{ textAlign: 'center' }}>
            <img src={qrData.qrCode} alt="QR" style={{ width: 160, height: 160, border: '4px solid rgba(56,189,248,0.2)', borderRadius: 12, display: 'block', margin: '0 auto 1rem', background: '#fff' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: '1rem' }}>
              <button onClick={() => { const a = document.createElement('a'); a.href = qrData.qrCode; a.download = 'cleanpass-qr.png'; a.click() }} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇ Download</button>
              <button onClick={generateQR} disabled={qrLoading} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: 'rgba(232,244,253,0.5)', cursor: 'pointer' }}>{qrLoading ? 'Generating…' : 'Regenerate'}</button>
            </div>
            <code style={{ fontSize: 11, color: '#38bdf8', wordBreak: 'break-all' }}>{qrData.scanUrl}</code>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <button onClick={generateQR} disabled={qrLoading} style={btn()}>{qrLoading ? 'Generating…' : 'Generate QR Code'}</button>
          </div>
        )}
      </div>

      {/* WiFi */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e8f4fd', margin: '0 0 1.25rem' }}>📶 WiFi QR</h2>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
          <div><label style={lbl}>Network name (SSID)</label><input style={inp} value={wifiForm.wifiName} onChange={e => setWifiForm(p=>({...p,wifiName:e.target.value}))} placeholder="ShineWash_WiFi" /></div>
          <div><label style={lbl}>Password</label><input style={inp} value={wifiForm.wifiPassword} onChange={e => setWifiForm(p=>({...p,wifiPassword:e.target.value}))} /></div>
          <div><label style={lbl}>Security</label>
            <select style={{ ...inp }} value={wifiForm.wifiType} onChange={e => setWifiForm(p=>({...p,wifiType:e.target.value}))}>
              <option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">No password</option>
            </select>
          </div>
        </div>
        <button type="button" onClick={() => saveSection(wifiForm, 'WiFi settings')} style={btn()}>Save WiFi</button>
      </div>

      {/* SMS */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e8f4fd', margin: '0 0 6px' }}>📱 SMS Notifications (Sparrow SMS)</h2>
        <p style={{ fontSize: 13, color: 'rgba(232,244,253,0.4)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>Send SMS to customers when their wash is approved and when they earn a free wash. Uses Sparrow SMS Nepal (NPR 2-4/SMS).</p>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'rgba(232,244,253,0.7)' }}>
            <input type="checkbox" checked={smsForm.smsEnabled} onChange={e => setSmsForm(p=>({...p,smsEnabled:e.target.checked}))} />
            Enable SMS notifications
          </label>
          {smsForm.smsEnabled && <>
            <div><label style={lbl}>Sparrow SMS API Key</label><input style={inp} value={smsForm.smsApiKey} onChange={e => setSmsForm(p=>({...p,smsApiKey:e.target.value}))} placeholder="Your API key from sparrowsms.com" /></div>
            <div><label style={lbl}>Sender ID</label><input style={inp} value={smsForm.smsSenderId} onChange={e => setSmsForm(p=>({...p,smsSenderId:e.target.value}))} placeholder="CleanPass" /></div>
          </>}
        </div>
        <button type="button" onClick={() => saveSection(smsForm, 'SMS settings')} style={btn()}>Save SMS settings</button>
      </div>
    </div>
  )
}