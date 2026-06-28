'use client';

import React, { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Traditional Email + Password Submit Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/auth/login/', {
        email: email,
        password: password,
      });

      // Matches your Django custom ok() wrapper payload structure
      if (response.data?.success) {
        const payload = response.data.data;
        localStorage.setItem('access_token', payload.access);
        localStorage.setItem('refresh_token', payload.refresh);
        
        router.push('/dashboard');
      } else {
        setError(response.data?.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 400) {
        setError(err.response.data?.error || 'Invalid email or password. Please try again.');
      } else {
        setError('Connection failed. Verify that your Django backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

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
        
        // If it's a completely new shop registration, redirect to settings/onboarding
        if (payload.isNewShop) {
          router.push('/dashboard/settings');
        } else {
          router.push('/dashboard');
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
    // Updated with your authentic active Google Client ID
    <GoogleOAuthProvider clientId="649254033532-s5tteoe027ka0cienra609uulfk1lmvo.apps.googleusercontent.com">
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-sm text-center text-slate-500 mb-6">
            Sign in to manage your live wash stations.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {error && (
              <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs font-medium border border-rose-200">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="demo@cleanpass.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0b63e5] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-sm shadow-md mt-2 disabled:bg-slate-300"
            >
              {loading ? 'Verifying Credentials...' : 'Sign In'}
            </button>
          </form>

          {/* Styled Separator Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or continue with</span>
            </div>
          </div>

          {/* Central Google Login Button Frame */}
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google OAuth Authentication failed.')}
            />
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Don't have an account yet?{' '}
            <Link href="/register-page" className="text-sky-600 hover:underline font-semibold">
              Register Shop
            </Link>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}