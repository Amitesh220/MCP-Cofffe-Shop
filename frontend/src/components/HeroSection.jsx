import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 flex flex-col items-center justify-center">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 transition-all duration-300 hover:text-accent">Welcome to Our Coffee Shop</h1>
      <p className="text-lg md:text-xl mb-8 text-slate-400">Your favorite place for the best coffee in town.</p>
      <a href="#menu" className="btn btn-primary bg-accent text-slate-100 hover:bg-slate-700 transition-all duration-300 px-6 py-3 rounded-lg">Explore Menu</a>
    </section>
  );
};

export default HeroSection;