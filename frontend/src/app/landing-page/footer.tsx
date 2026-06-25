import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-[#6ec4f7] text-slate-900 pt-12 pb-6 px-6 md:px-16">
      <div className="max-w-7xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-4 border-b border-sky-400/50 pb-10">
        
        {/* Brand Statement Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-black tracking-wider text-xl">
            <span>CLEAN PASS</span>
          </div>
          <p className="text-xs font-medium text-slate-800 leading-relaxed max-w-xs">
            Our mission is to provide reliable service care systems with quality, convenience, and customer satisfaction at every turn.
          </p>
          <div className="flex gap-3 pt-2">
            <span className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center text-xs">fb</span>
            <span className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center text-xs">ig</span>
            <span className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center text-xs">ln</span>
          </div>
        </div>

        {/* Services Links Column */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Services</h4>
          <ul className="space-y-2 text-xs font-medium text-slate-800">
            <li><a href="#" className="hover:underline">Digital Loyalty Program</a></li>
            <li><a href="#" className="hover:underline">QR Check-In System</a></li>
            <li><a href="#" className="hover:underline">Vehicle Service Booking</a></li>
            <li><a href="#" className="hover:underline">Wash Station Management</a></li>
          </ul>
        </div>

        {/* Company Links Column */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Company</h4>
          <ul className="space-y-2 text-xs font-medium text-slate-800">
            <li><a href="#" className="hover:underline">About us</a></li>
            <li><a href="#" className="hover:underline">Careers</a></li>
            <li><a href="#" className="hover:underline">Contact Us</a></li>
          </ul>
        </div>

        {/* Contact CTA Column */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">Get In Touch</h4>
          <div className="rounded-xl bg-white p-3 text-xs shadow-sm space-y-1">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Write to us</span>
            <a href="mailto:info@cleanpass.com" className="font-semibold text-slate-900 break-all">info@cleanpass.com</a>
          </div>
          <div className="rounded-xl bg-white p-3 text-xs shadow-sm space-y-1">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Call us</span>
            <span className="font-semibold text-slate-900">980 1234 5678</span>
          </div>
          <button className="w-full rounded-xl bg-rose-500 py-3 text-xs font-bold text-white uppercase tracking-wider shadow-md hover:bg-rose-600 transition">
            Book Consultation →
          </button>
        </div>

      </div>

      {/* Bottom Sub-footer bar */}
      <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] font-medium text-slate-800 gap-4">
        <span>© 2026 Clean Pass. All Rights Reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}