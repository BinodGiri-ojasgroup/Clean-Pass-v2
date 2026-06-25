'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const bg = '#0c1a2e'
  const inp: React.CSSProperties = { width: '100%', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: '#e8f4fd', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const json = await res.json()

      // ✅ handle HTTP errors + backend errors
      if (!res.ok || !json.success) {
        setError(json.error || json.detail || 'Login failed')
        return
      }

      // safe extraction
      const data = json.data || {}

      if (!data.access || !data.refresh) {
        setError('Invalid server response')
        return
      }

      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)

      localStorage.setItem('shopId', data.shopId || '')
      localStorage.setItem('name', data.name || '')

      router.push('/dashboard')

      // ✅ extract tokens properly
      const { access, refresh } = json.data

      // ✅ store tokens (important)
      localStorage.setItem('access', access)
      localStorage.setItem('refresh', refresh)

      localStorage.setItem('shopId', json.data.shopId)
      localStorage.setItem('name', json.data.name)

      router.push('/dashboard')

    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700 }}><span style={{ color: '#38bdf8' }}>Clean</span><span style={{ color: '#e8f4fd' }}>Pass</span></div>
          </Link>
          <p style={{ color: 'rgba(232,244,253,0.5)', fontSize: 14, marginTop: 6 }}>Sign in to your dashboard</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={{ display: 'block', color: 'rgba(232,244,253,0.55)', fontSize: 13, marginBottom: 6 }}>Email</label><input suppressHydrationWarning type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} placeholder="cafe@piccolo.com" /></div>
            <div><label style={{ display: 'block', color: 'rgba(232,244,253,0.55)', fontSize: 13, marginBottom: 6 }}>Password</label><input suppressHydrationWarning type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} /></div>
            {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>⚠ {error}</div>}
            <button type="submit" disabled={loading} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4, opacity: loading ? 0.7 : 1 }}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 12, color: 'rgba(232,244,253,0.3)' }}>Demo: demo@cleanpass.com / demo1234</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 13, color: 'rgba(232,244,253,0.4)' }}>No account? <Link href="/register" style={{ color: '#38bdf8', textDecoration: 'none' }}>Register your wash →</Link></p>
      </div>
    </div>
  )
}
