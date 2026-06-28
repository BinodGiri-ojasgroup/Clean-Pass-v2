'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  const bg = '#0c1a2e'
  const inp: React.CSSProperties = { width: '100%', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: '#e8f4fd', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', color: 'rgba(232,244,253,0.55)', fontSize: 13, marginBottom: 6 }

  // 1. Traditional Signup Submission Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); 
    setLoading(true); 
    setError('')
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/auth/register/', form)
      
      if (response.data?.success) {
        const payload = response.data.data
        localStorage.setItem('access_token', payload.access)
        localStorage.setItem('refresh_token', payload.refresh)
        router.push('/dashboard')
      } else {
        setError(response.data?.error || 'Registration failed.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong with registration.')
    } finally { 
      setLoading(false) 
    }
  }

  // 2. Google Authentication Success Callback Handler
    // 2. Google Authentication Success Callback Handler
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');
    try {
      // 👇 CHANGED: Send 'credential' instead of 'token'
      const response = await axios.post('http://127.0.0.1:8000/api/auth/google/', {
        credential: credentialResponse.credential,
      });

      if (response.data?.success) {
        const payload = response.data.data;
        localStorage.setItem('access_token', payload.access);
        localStorage.setItem('refresh_token', payload.refresh);
        
        if (payload.isNewShop) {
          router.push('/dashboard/settings/');
        } else {
          router.push('/dashboard/');
        }
      } else {
        setError(response.data?.error || 'Authentication rejected by backend.');
      }
    } catch (err: any) {
      setError('Google Authentication failed with backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId="649254033532-s5tteoe027ka0cienra609uulfk1lmvo.apps.googleusercontent.com">
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>CleanPass</h1>
            </Link>
            <p style={{ color: 'rgba(232,244,253,0.6)', marginTop: '0.5rem', fontSize: '14px' }}>
              Register your live wash station dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            
            {error && (
              <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af', padding: '10px 14px', borderRadius: 10, fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}

            <div>
              <label style={lbl}>Full Name</label>
              <input 
                type="text" 
                required 
                style={inp} 
                placeholder="John Doe" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
              />
            </div>

            <div>
              <label style={lbl}>Email Address</label>
              <input 
                type="email" 
                required 
                style={inp} 
                placeholder="name@shop.com" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
              />
            </div>

            <div>
              <label style={lbl}>Phone Number</label>
              <input 
                type="text" 
                required 
                style={inp} 
                placeholder="+1 (555) 000-0000" 
                value={form.phone} 
                onChange={e => setForm({...form, phone: e.target.value})} 
              />
            </div>

            <div>
              <label style={lbl}>Shop Address</label>
              <input 
                type="text" 
                required 
                style={inp} 
                placeholder="123 Main St, City" 
                value={form.address} 
                onChange={e => setForm({...form, address: e.target.value})} 
              />
            </div>

            <div>
              <label style={lbl}>Password</label>
              <input 
                type="password" 
                required 
                style={inp} 
                placeholder="••••••••" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              style={{ width: '100%', padding: '12px', background: '#0b63e5', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '0.5rem' }}
            >
              {loading ? 'Creating Account...' : 'Register Shop'}
            </button>

            {/* Separator Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ padding: '0 10px', color: 'rgba(232,244,253,0.35)', fontSize: '11px', textTransform: 'uppercase' }}>Or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            {/* Google Signup Button Frame */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google OAuth Authentication failed.')}
                useOneTap
              />
            </div>

            <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(232,244,253,0.55)', margin: '1rem 0 0 0' }}>
              Already have an account?{' '}
              <Link href="/login-page" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                Sign In
              </Link>
            </p>

          </form>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}