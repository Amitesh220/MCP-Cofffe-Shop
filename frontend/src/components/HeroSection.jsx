import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 px-6 text-center">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 transition-transform transform hover:scale-105">Welcome to Our Coffee Shop</h1>
        <p className="text-lg md:text-xl mb-8">Experience the best coffee in town, brewed with love and passion.</p>
        <a href="/order" className="btn btn-primary bg-e94560 hover:bg-e94570 text-slate-100 py-2 px-4 rounded transition duration-300">Order Now</a>
      </div>
    </section>
  );
};

export default HeroSection;