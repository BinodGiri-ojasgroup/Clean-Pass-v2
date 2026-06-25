import axios from 'axios';
import { NextResponse } from 'next/server';

// 1. Next.js Route Handler Helper Utilities (Backend side)
export const ok = (data: unknown) => NextResponse.json({ success: true, data });
export const err = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

// 2. Centralized Frontend Axios Client Configuration
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/', // Points to Django
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;