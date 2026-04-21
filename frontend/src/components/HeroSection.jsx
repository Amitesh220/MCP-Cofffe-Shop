import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 flex flex-col items-center justify-center">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 transition-transform transform hover:scale-105">Welcome to Our Coffee Shop</h1>
      <p className="text-lg md:text-xl mb-8">Experience the finest coffee brewed with passion.</p>
      <a href="#menu" className="btn btn-primary bg-e94560 text-slate-100 py-2 px-4 rounded transition duration-300 hover:bg-e94560/80">Explore Menu</a>
    </section>
  );
};

export default HeroSection;