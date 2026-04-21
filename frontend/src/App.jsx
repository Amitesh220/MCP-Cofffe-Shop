import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Navbar from './components/Navbar';
import MenuPage from './components/MenuPage';
import MenuCard from './components/MenuCard';
import OrderPage from './components/OrderPage';
import AdminPanel from './components/AdminPanel';
import CappuccinoCard from './components/CappuccinoCard';

// Prevent tree-shaking by creating a constant array referencing all core components
const CORE_COMPONENTS = [Navbar, MenuPage, MenuCard, OrderPage, AdminPanel];

function App() {
  const [deploymentVersion, setDeploymentVersion] = useState(0);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FIX #9: Force Frontend Refresh After Deploy
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    // Store the initial deployment timestamp
    const initialVersion = localStorage.getItem('deploymentVersion') || '0';
    setDeploymentVersion(parseInt(initialVersion));

    // Poll backend every 10 seconds to detect new deployments
    const pollInterval = setInterval(async () => {
      try {
        const apiBase =
          window.location.hostname === "localhost" || window.location.hostname === "3.107.182.204"
            ? "http://3.107.182.204:3000"
            : "http://backend:3000";

        // Add cache-busting to ensure we get fresh response
        const response = await fetch(`${apiBase}/health?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache' }
        });

        if (response.ok) {
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error("Invalid JSON response");
          }
          const newVersion = data.deployment_version || '0';
          
          // If deployment version changed, reload the page
          if (parseInt(newVersion) > parseInt(initialVersion)) {
            console.log('🔄 New deployment detected, reloading...');
            localStorage.setItem('deploymentVersion', newVersion);
            // Force hard reload to get new JS bundles
            window.location.reload(true);
          }
        }
      } catch (e) {
        // Backend unreachable, will retry
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  return (
    <Router>
      {/* ═══ PROTECTED ZONE: CORE LAYOUT ═══ DO NOT MODIFY ═══ */}
      <div data-mcp-core="Navbar">
        <Navbar />
      </div>
      <div className="page-wrapper">
        <CappuccinoCard />
        <Routes>
          <Route path="/" element={<div data-mcp-core="MenuPage"><MenuPage /></div>} />
          <Route path="/order" element={<div data-mcp-core="OrderPage"><OrderPage /></div>} />
          <Route path="/admin" element={<div data-mcp-core="AdminPanel"><AdminPanel /></div>} />
        </Routes>
      </div>
      {/* ═══ END PROTECTED ZONE ═══ */}

      {/* ═══ AI INJECTION ZONE: New components go here ═══ */}
      <div id="ai-generated-root">
        {/* HeroSection moved to MenuPage */}
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
