# 🚀 Deployment & Testing Guide

## Pre-Deployment Checklist

### 1. Verify Files Modified
```bash
# Check all key files are updated
cat frontend/Dockerfile         # Should have multi-stage build
cat docker-compose.yml          # Should have VITE_API_URL and CACHE_BUST args
cat backend/server.js           # Should have error handler
cat frontend/src/App.jsx        # Should have useEffect for health checks
cat deployment-service/server.js # Should have validate-build endpoint
```

### 2. Clean Docker Environment
```bash
# Remove old containers and images
docker compose down -v
docker system prune -f

# Rebuild from scratch
docker compose build
```

---

## 🏃 Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# 1. Start all services
docker compose up -d

# 2. Check services are running
docker ps
# Should show: frontend, backend, agent, mcp-server, deployment-service, openwebui

# 3. Verify frontend is accessible
curl http://localhost:5173
# Should return HTML with React app

# 4. Verify backend API
curl http://localhost:3000/health
# Should return: {"status":"ok","service":"backend","timestamp":"..."}

# 5. Verify menu API returns JSON (not HTML)
curl http://localhost:3000/menu
# Should return: [{"name":"Espresso","price":...}]
```

### Option 2: Manual Verification

```bash
# Test frontend can reach backend
docker exec -it frontend curl http://backend:3000/health

# Test menu endpoint
docker exec -it frontend curl http://backend:3000/menu | jq

# Check frontend dist files
docker exec -it frontend ls -la dist/
# Should show dist/index.html and dist/assets/
```

---

## 🧪 Testing System Flow

### Test 1: Menu Loading
```bash
# Open browser
http://localhost:5173

# Click "Menu" tab
# Should see menu items loading with spinner
# Should NOT see HTML error
```

### Test 2: Order Placement
```bash
# Click "Order"
# Select items
# Enter name
# Click "Place Order"
# Should see confirmation with Order ID
```

### Test 3: Admin Dashboard
```bash
# Click "Admin"
# Should see service status cards
# Backend: Online
# Frontend: Online
# Should show menu item count
```

---

## 🔄 Testing UI Changes (AI Pipeline)

### Test 4: Add New Component via AI

```bash
# Send command to backend
curl -X POST http://localhost:3000/owner-command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Add a testimonials section showing customer reviews"
  }'

# Response should show:
# - Category: UI
# - Status: DEPLOYED (if tests pass)
# - Component: TestimonialsSection

# Wait 30 seconds for rebuild...

# then reload browser
http://localhost:5173

# Should see new testimonials section
```

### Test 5: Verify Build Validation

```bash
# After component is generated, check validation
curl -X POST http://localhost:5000/validate-build \
  -H "Content-Type: application/json" \
  -d '{"components":["TestimonialsSection"]}'

# Should return:
# {"valid":true,"message":"Build valid with X bundle(s)"}
```

---

## 🔍 Troubleshooting During Testing

### Frontend shows blank page
```bash
# Check browser console for errors
# Check network tab - are API calls reaching backend?
curl http://localhost:3000/menu  # Should return JSON
```

### "Backend returned HTML instead of JSON"
```bash
# Backend is either down or misconfigured
docker logs backend | tail -20

# Restart backend
docker compose restart backend

# Verify it returns JSON
curl -i http://localhost:3000/menu
# Should show: Content-Type: application/json
```

### Components not rendering
```bash
# Check dist has files
docker exec -it frontend ls -la dist/

# Check index.html was updated
docker exec -it frontend grep -c "TestimonialsSection" dist/index.html
# Should be > 0 if component was added

# Force rebuild
docker compose restart frontend
```

### Deployment takes too long
```bash
# Check if Docker is building
docker ps -a | grep frontend

# View build logs
docker compose logs frontend | tail -50

# If stuck, cancel and retry
docker compose down -v
docker compose up --build frontend
```

---

## 📊 Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| Full system start | 30-60s | First build slower |
| Frontend rebuild (UI change) | 20-40s | With --no-cache |
| Health checks pass | 10-15s | 5s interval, 3 retries |
| Component render | <1s | After deploy complete |
| **Total: AI change → Live** | 1-2 min | Entire pipeline |

---

## ✅ Validation Tests

### Test: API URL Configuration
```javascript
// In browser console:
console.log(import.meta.env.VITE_API_URL);
// Should print: http://backend:3000 (inside Docker)
```

### Test: Component Injection
```javascript
// In browser console:
document.getElementById('ai-generated-root');
// Should select the injection zone
document.querySelectorAll('[data-mcp-core]').length;
// Should show count of core components
```

### Test: Cache Busting
```bash
# Check hash in filenames
docker exec -it frontend ls dist/assets/
# Should see: main-abc123def.js (with hash)
# Should NOT see: main.js (without hash)
```

### Test: JSON Safety
```javascript
// In browser network tab, check /menu request
// Response should be valid JSON array, not HTML
// Headers show: Content-Type: application/json
```

---

## 🔴 Known Limitations & Workarounds

### Limitation 1: Git operations require credentials
→ Set `GITHUB_TOKEN` in `.env` for AI to create branches

### Limitation 2: Component generation takes time
→ UI changes need 1-2 minutes for full pipeline

### Limitation 3: Old browsers may cache aggressively
→ Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

---

## 📝 Production Readiness

For production deployment:

1. ✅ Use proper DNS/domain names instead of localhost
2. ✅ Add HTTPS/TLS certificates
3. ✅ Use environment-specific env vars
4. ✅ Enable logging aggregation
5. ✅ Set up monitoring and alerts
6. ✅ Use private container registry
7. ✅ Add rate limiting on APIs
8. ✅ Implement request signing between services

