import React from 'react';

const HeroSection = () => {
  return (
    <div className="bg-slate-900 text-slate-100 py-20 flex flex-col items-center justify-center transition-all duration-300">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 hover:text-accent transition-colors">
        Amites is here to serve
      </h1>
      <p className="text-lg md:text-xl text-slate-400">
        Welcome to our coffee shop, where every cup is crafted with care.
      </p>
    </div>
  );
};

export default HeroSection;