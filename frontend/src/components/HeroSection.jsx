import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-slate-900 text-slate-100 py-20 px-4 text-center">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 transition duration-300 hover:text-accent">
        Welcome to Amites
      </h1>
      <p className="text-lg md:text-2xl transition duration-300 hover:text-accent">
        Amites is here to serve
      </p>
    </section>
  );
};

export default HeroSection;