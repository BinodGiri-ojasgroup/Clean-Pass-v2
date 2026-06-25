import React from 'react';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-8 py-4 border-b border-slate-100 shadow-sm">
      
      {/* Brand Group */}
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 flex-shrink-0">
          <Image 
            src="/Clean Pass logo.png" 
            alt="Clean Pass Logo" 
            fill
            sizes="48px"
            priority
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-black tracking-wide">
          <span className="text-[#38bdf8]">CLEAN </span>
          <span className="text-black">PASS</span>
        </h1>
      </div>

      {/* Nav Actions (Pill Tags matching header.png) */}
      <div className="flex items-center gap-4">
        <a 
          href="#home" 
          className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-100 transition whitespace-nowrap"
        >
          Home
        </a>
        <a 
          href="#services" 
          className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-100 transition whitespace-nowrap"
        >
          Services
        </a>
        <a 
          href="#loyalty" 
          className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-100 transition whitespace-nowrap"
        >
          Digital Loyalty
        </a>
        <a 
          href="#pricing" 
          className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-100 transition whitespace-nowrap"
        >
          Pricing
        </a>
        <a 
          href="#about" 
          className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-100 transition whitespace-nowrap"
        >
          About
        </a>
      </div>

    </nav>
  );
}