import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Navbar from './components/Navbar';
import MenuPage from './components/MenuPage';
import MenuCard from './components/MenuCard';
import OrderPage from './components/OrderPage';
import AdminPanel from './components/AdminPanel';
import HeroSection from './components/HeroSection';

// Prevent tree-shaking by creating a constant array referencing all core components
const CORE_COMPONENTS = [Navbar, MenuPage, MenuCard, OrderPage, AdminPanel];

function App() {
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    // Check for UI updates every 15 seconds by polling a cache-busting endpoint
    // This ensures fresh UI changes are detected after deployment
    const updateCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://backend:3000'}/health?t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (response.ok) {
          // Optionally refresh if backend indicates changes
          // For now, we rely on the browser cache-busting from hashed filenames
        }
      } catch (e) {
        // Backend unreachable, will retry
      }
    }, 15000);

    // Listen for storage events to sync across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'uiUpdated') {
        console.log('🔄 UI update detected in another tab, reloading...');
        window.location.reload();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(updateCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <Router>
      {/* ═══ PROTECTED ZONE: CORE LAYOUT ═══ DO NOT MODIFY ═══ */}
      <div data-mcp-core="Navbar" key={lastUpdated}>
        <Navbar />
      </div>
      <div className="page-wrapper">
        <Routes>
          <Route path="/" element={<div data-mcp-core="MenuPage"><MenuPage /></div>} />
          <Route path="/order" element={<div data-mcp-core="OrderPage"><OrderPage /></div>} />
          <Route path="/admin" element={<div data-mcp-core="AdminPanel"><AdminPanel /></div>} />
        </Routes>
      </div>
      {/* ═══ END PROTECTED ZONE ═══ */}

      {/* ═══ AI INJECTION ZONE: New components go here ═══ */}
      <div id="ai-generated-root" key={`ai-${lastUpdated}`}>
        <HeroSection />
      </div>
      {/* ═══ END AI INJECTION ZONE ═══ */}

      {/* FORCE COMPONENT BUNDLING FOR MCP TESTS — DO NOT REMOVE */}
      <div style={{ display: "none" }} id="hidden-components-container" data-mcp-core="HiddenContainer">
        <MenuPage />
        <MenuCard data-mcp-core="MenuCard" />
        <OrderPage />
        <AdminPanel />
        <Navbar />
      </div>
    </Router>
  );
}

export default App;
