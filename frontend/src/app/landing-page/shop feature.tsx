import React from 'react';

export default function ShopFeature() {
  return (
    <section id="services" className="space-y-16 py-12 px-4 md:px-16 max-w-7xl mx-auto">
      
      {/* Vehicle Owners Segment */}
      <div className="rounded-[2.5rem] bg-[#f5ebd3] p-8 md:p-12">
        <div className="text-center mb-8">
          <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">HOW IT WORKS</span>
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl mt-1">For Vehicle Owners</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Appointment & Booking', desc: 'Schedule your services in security. Pick your preferred time slot and service package.' },
            { title: 'Digital Loyalty', desc: 'Top and collect stamp instantly. No more physical cards to carry or lose.' },
            { title: 'Live Status Tracking', desc: "Watch your vehicle's progress in real-time. Know exactly when it's ready for pickup." },
            { title: 'Roadside Assistance', desc: 'Integrated breakdown and emergency help at the touch of a button.' }
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl bg-white p-6 shadow-sm border border-amber-100">
              <div className="mb-4 h-12 w-12 rounded-lg bg-sky-50 flex items-center justify-center font-bold text-sky-600">0{idx+1}</div>
              <h4 className="text-base font-bold text-[#0c63e5] mb-2">{item.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Shop Owners Segment */}
      <div className="rounded-[2.5rem] bg-[#c3d3ec]/70 p-8 md:p-12">
        <div className="text-center mb-8">
          <span className="text-xs font-bold tracking-widest text-blue-800 uppercase">BUSINESS SUITE</span>
          <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl mt-1">For Shop Owners</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Shop Management', desc: 'Full control over operations, staff, opening hours to facility maintenance.' },
            { title: 'Customer Management', desc: 'Comprehensive CRM with vehicle history, preferences, and automated follow-ups.' },
            { title: 'Staff Management', desc: 'Roster scheduling and granular permissions to keep your team organized.' },
            { title: 'Work & Services', desc: 'Automated workflow management ensures every task is tracked and optimized.' },
            { title: 'Staff Commission', desc: 'Transparent automated payouts that motivate your workforce.' },
            { title: 'Business Reports', desc: 'Real-time performance analytics to help you make informed decisions.' },
            { title: 'Payment Records', desc: 'Invoicing and transaction history in one place, integrated with major gateways.' }
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl bg-white p-6 shadow-sm border border-blue-100">
              <div className="mb-4 h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center font-bold text-blue-700">★</div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}