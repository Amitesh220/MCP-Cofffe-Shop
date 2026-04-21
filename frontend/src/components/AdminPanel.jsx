import React, { useState, useEffect } from 'react';

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "3.107.182.204"
    ? "http://3.107.182.204:3000"
    : "http://backend:3000";

function AdminPanel() {
  const [services, setServices] = useState({
    backend: 'checking',
    frontend: 'online',
    agent: 'checking',
    mcp: 'checking'
  });
  const [logs, setLogs] = useState([]);
  const [menuCount, setMenuCount] = useState(0);

  useEffect(() => {
    const checkService = async (url, serviceName) => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("Invalid backend response");
        }
        setServices(s => ({ ...s, [serviceName]: 'online' }));
      } catch {
        setServices(s => ({ ...s, [serviceName]: 'offline' }));
      }
    };

    checkService(`${API_BASE}/health`, 'backend');
    checkService(`${API_BASE}/agent/health`, 'agent');
    checkService(`${API_BASE}/mcp/health`, 'mcp');

    // Check menu safely
    const fetchMenuSafely = async () => {
      try {
        const res = await fetch(`${API_BASE}/menu`);
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("Invalid backend response");
        }
        setMenuCount(Array.isArray(data) ? data.length : 0);
      } catch (err) {
        // ignore
      }
    };
    fetchMenuSafely();

    // Sample logs
    setLogs([
      { time: new Date().toISOString(), msg: 'Admin panel loaded', type: 'info' },
      { time: new Date().toISOString(), msg: 'Service health checks initiated', type: 'info' }
    ]);
  }, []);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toISOString(), msg, type }]);
  };

  const runTests = async () => {
    addLog('Triggering MCP test suite...', 'info');
    try {
      const res = await fetch(`${API_BASE}/mcp/run-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid backend response");
      }
      if (data.status === 'PASS') {
        addLog(`Tests PASSED — ${data.results?.length || 0} tests run`, 'success');
      } else {
        addLog(`Tests FAILED — ${data.failures?.join(', ') || 'unknown'}`, 'error');
      }
    } catch (err) {
      addLog(`Test run failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="container">
      <div className="admin-page" id="admin-panel">
        <h2>⚙️ System Dashboard</h2>
        <p className="subtitle">Monitor services, view logs, and run tests</p>

        {/* Status Cards */}
        <div className="status-grid">
          <div className="status-card">
            <div className="label">Backend API</div>
            <div className={`value ${services.backend === 'online' ? 'online' : services.backend === 'offline' ? 'offline' : ''}`}>
              {services.backend === 'online' ? '● Online' : services.backend === 'offline' ? '● Offline' : '◌ Checking...'}
            </div>
          </div>
          <div className="status-card">
            <div className="label">Frontend</div>
            <div className="value online">● Online</div>
          </div>
          <div className="status-card">
            <div className="label">Agent Service</div>
            <div className={`value ${services.agent === 'online' ? 'online' : services.agent === 'offline' ? 'offline' : ''}`}>
              {services.agent === 'online' ? '● Online' : services.agent === 'offline' ? '● Offline' : '◌ Checking...'}
            </div>
          </div>
          <div className="status-card">
            <div className="label">MCP Server</div>
            <div className={`value ${services.mcp === 'online' ? 'online' : services.mcp === 'offline' ? 'offline' : ''}`}>
              {services.mcp === 'online' ? '● Online' : services.mcp === 'offline' ? '● Offline' : '◌ Checking...'}
            </div>
          </div>
          <div className="status-card">
            <div className="label">Menu Items</div>
            <div className="value">{menuCount}</div>
          </div>
          <div className="status-card">
            <div className="label">Actions</div>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0.5rem 1rem', marginTop: '0.25rem', fontSize: '0.85rem' }}
              onClick={runTests}
              id="run-tests-btn"
            >
              🧪 Run Tests
            </button>
          </div>
        </div>

        {/* Log Panel */}
        <div className="log-panel">
          <div className="log-header">
            <h3>📋 System Logs</h3>
            <span className="item-count">{logs.length} entries</span>
          </div>
          <div className="log-content" id="log-content">
            {logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type}`}>
                <span className="timestamp">[{new Date(log.time).toLocaleTimeString()}]</span>
                {log.msg}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="log-entry">No logs yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
