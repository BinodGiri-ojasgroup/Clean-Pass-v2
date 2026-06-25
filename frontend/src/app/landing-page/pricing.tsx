import React from 'react';

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-slate-50">
      <div className="text-center max-w-xl mx-auto px-4 mb-12">
        <span className="text-xs font-bold tracking-widest text-sky-600 uppercase">PRICING</span>
        <h2 className="text-3xl font-extrabold text-slate-950 mt-1 font-serif">Starts free, grows with you</h2>
      </div>

      <div className="mx-auto max-w-6xl px-6 grid gap-8 md:grid-cols-3">
        {/* Tier 1 */}
        <div className="rounded-3xl bg-[#07162c] p-8 text-white flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">FREE</span>
            <div className="mt-4 mb-6">
              <span className="text-2xl font-bold">NPR 0</span>
              <span className="text-xs text-slate-400 block mt-1">Forever</span>
            </div>
            <ul className="space-y-4 border-t border-slate-800 pt-6 text-sm text-slate-300">
              <li className="flex items-center gap-2">✓ Up to 50 vehicles</li>
              <li className="flex items-center gap-2">✓ QR loyalty system</li>
              <li className="flex items-center gap-2">✓ Appointment booking</li>
              <li className="flex items-center gap-2">✓ Basic reports</li>
            </ul>
          </div>
          <button className="mt-8 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-white transition hover:bg-white/20">Get Started</button>
        </div>

        {/* Tier 2 - Featured */}
        <div className="relative rounded-3xl bg-[#07162c] p-8 text-white flex flex-col justify-between ring-4 ring-sky-500 transform md:-translate-y-2">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-4 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Most popular</span>
          <div>
            <span className="text-xs font-semibold text-sky-400">BASIC</span>
            <div className="mt-4 mb-6">
              <span className="text-2xl font-bold">NPR 4,000</span>
              <span className="text-xs text-slate-400 block mt-1">per month</span>
            </div>
            <ul className="space-y-4 border-t border-slate-800 pt-6 text-sm text-slate-300">
              <li className="flex items-center gap-2">✓ Unlimited vehicles</li>
              <li className="flex items-center gap-2">✓ SMS notifications</li>
              <li className="flex items-center gap-2">✓ Revenue reports</li>
              <li className="flex items-center gap-2">✓ CSV export</li>
            </ul>
          </div>
          <button className="mt-8 w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white transition hover:bg-sky-600">Upgrade Now</button>
        </div>

        {/* Tier 3 */}
        <div className="rounded-3xl bg-[#07162c] p-8 text-white flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">PRO</span>
            <div className="mt-4 mb-6">
              <span className="text-2xl font-bold">NPR 8,000</span>
              <span className="text-xs text-slate-400 block mt-1">per month</span>
            </div>
            <ul className="space-y-4 border-t border-slate-800 pt-6 text-sm text-slate-300">
              <li className="flex items-center gap-2">✓ Multiple branches</li>
              <li className="flex items-center gap-2">✓ Advanced analytics</li>
              <li className="flex items-center gap-2">✓ Priority support</li>
              <li className="flex items-center gap-2">✓ Customer SMS sender</li>
            </ul>
          </div>
          <button className="mt-8 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-white transition hover:bg-white/20">Contact Sales</button>
        </div>
      </div>

      {/* Mini Call-To-Action Banner before Footer */}
      <div className="mt-24 text-center max-w-xl mx-auto px-4">
        <h3 className="text-2xl font-extrabold text-slate-900 font-serif">Ready to go digitals?</h3>
        <p className="mt-2 text-sm text-slate-600">Join Nepal car wash owners who have replaced paper stamp cards with CleanPass. Free to start, set up in 5 minutes.</p>
        <button className="mt-6 rounded-full bg-sky-400 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-sky-500 transition">
          Create free account →
        </button>
      </div>
    </section>
  );
}