import React from 'react';
import Navbar from './landing-page/navbar';
import Hero from './landing-page/hero';
import ShopFeature from './landing-page/shop feature';
import Pricing from './landing-page/pricing';
import Footer from './landing-page/footer';

export default function ShopOwnerLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-sky-500 selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <ShopFeature />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}