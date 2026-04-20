import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Navbar from './components/Navbar';
import MenuPage from './components/MenuPage';
import MenuCard from './components/MenuCard';
import OrderPage from './components/OrderPage';
import AdminPanel from './components/AdminPanel';
import HeroSection from './components/HeroSection';

function App() {
  return (
    <Router>
      {/* ═══ PROTECTED ZONE: CORE LAYOUT ═══ DO NOT MODIFY ═══ */}
      <Navbar />
      <div className="page-wrapper">
        <HeroSection />
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
      {/* ═══ END PROTECTED ZONE ═══ */}

      {/* ═══ AI INJECTION ZONE: New components go here ═══ */}
      <div id="ai-components">
      </div>
      {/* ═══ END AI INJECTION ZONE ═══ */}

      {/* FORCE COMPONENT BUNDLING FOR MCP TESTS — DO NOT REMOVE */}
      <div style={{ display: "none" }} id="hidden-components-container">
        <MenuPage />
        <MenuCard />
        <OrderPage />
        <AdminPanel />
        <Navbar />
      </div>
    </Router>
  );
}

export default App;
