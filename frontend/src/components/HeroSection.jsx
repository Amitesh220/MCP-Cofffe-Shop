import React from 'react';

const HeroSection = () => {
  return (
    <div className="bg-slate-900 text-slate-100 py-20 px-6 text-center">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 transition duration-300 hover:text-accent">
        Welcome to Our Coffee Shop
      </h1>
      <p className="text-lg md:text-2xl transition duration-300 hover:text-accent">
        Amitesh is here to serve
      </p>
    </div>
  );
};

export default HeroSection;