import React from 'react';
import Link from 'next/link';
export default function Hero() {
  return (
    <section id="home" className="pt-24 pb-16">
      {/* Visual Header Banner Group */}
      <div 
        className="relative mx-4 flex min-h-[520px] flex-col items-center justify-center rounded-3xl bg-cover bg-center px-4 text-center md:mx-12"
        style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.3)), url('https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&q=80&w=1600')` }}
      >
        <span className="rounded-full bg-sky-600 px-4 py-1 text-xs font-bold tracking-widest text-white uppercase mb-4">
          AN ANCHOR FOR VEHICLE WASH BUSINESS
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 md:text-6xl">
          Every Miles Deserve Better Care
        </h1>
        <p className="mt-4 max-w-xl text-base font-medium text-slate-700">
          The all-in-one digital ecosystem connecting owners, wash stations, and daily operators.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link href="/register-page" className="flex items-center gap-2 rounded-xl bg-[#0b63e5] px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
            Get Started For Free &rarr;
          </Link>
          <Link href="/login-page" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50">
            Sign In
          </Link>
        </div>
      </div>

      {/* Comparison Blocks */}
      <div className="mt-20 px-6 md:px-16 flex flex-col md:flex-row gap-8 justify-center max-w-5xl mx-auto">
        {/* Old Way */}
        <div className="flex-1 bg-gradient-to-b from-slate-50 to-slate-100 rounded-3xl p-8 border border-slate-200">
          <div className="h-44 bg-slate-200 rounded-2xl mb-6 flex items-center justify-center text-slate-400 font-mono text-xs">[Old Way App Graphic]</div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">The Old Way</h3>
          <ul className="space-y-3 text-sm text-slate-600 font-medium">
            <li className="flex items-start gap-2 text-rose-600">✕ <span className="text-slate-600">Lost or soggy paper loyalty cards</span></li>
            <li className="flex items-start gap-2 text-rose-600">✕ <span className="text-slate-600">Uncertain wait times and long queues</span></li>
            <li className="flex items-start gap-2 text-rose-600">✕ <span className="text-slate-600">No record of service or vehicle history</span></li>
            <li className="flex items-start gap-2 text-rose-600">✕ <span className="text-slate-600">Manual, error-prone billing systems</span></li>
          </ul>
        </div>

        {/* CleanPass Way */}
        <div className="flex-1 bg-gradient-to-b from-sky-50 to-blue-50 rounded-3xl p-8 border border-blue-100">
          <div className="h-44 bg-sky-600 rounded-2xl mb-6 flex items-center justify-center text-white/80 font-mono text-xs">[CleanPass UI Showcase]</div>
          <h3 className="text-xl font-bold text-blue-900 mb-4">The CleanPass Way</h3>
          <ul className="space-y-3 text-sm text-slate-700 font-medium">
            <li className="flex items-start gap-2 text-emerald-600">✓ <span className="text-slate-700">Digital QR wallet with instant rewards</span></li>
            <li className="flex items-start gap-2 text-emerald-600">✓ <span className="text-slate-700">Real-time virtual queue management</span></li>
            <li className="flex items-start gap-2 text-emerald-600">✓ <span className="text-slate-700">Automated digital service logbook</span></li>
            <li className="flex items-start gap-2 text-emerald-600">✓ <span className="text-slate-700">Smart analytics & performance tracking</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
}