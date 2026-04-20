import React from 'react';

const HeroSection = () => {
  return (
    <div className="container flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 hover:text-accent transition-colors duration-300">Welcome to Our Coffee Shop</h1>
      <p className="text-lg md:text-2xl">Amitesh is here to serve</p>
    </div>
  );
};

export default HeroSection;