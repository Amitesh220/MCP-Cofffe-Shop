# 🏗️ AI Coffee Shop System Architecture & Fixes

## ✅ FIXES IMPLEMENTED

### 1. ✅ Frontend Dockerfile - Multi-Stage Build
**Problem:** Global `serve` install was unreliable  
**Solution:**  
- Multi-stage build (builder → production)
- Alpine-based production image
- Uses `npm ci` for reproducible builds
- Cache buster argument `CACHE_BUST` for forced clean builds
- Health checks with proper timeout handling
- Build validation to ensure `dist/` contains assets

### 2. ✅ API Routing - Docker Network Configuration
**Problem:** Frontend called `/menu` and received HTML  
**Solution:**
- Set `VITE_API_URL=http://backend:3000` in docker-compose.yml
- All frontend components use `const API_BASE = import.meta.env.VITE_API_URL || 'http://backend:3000'`
- Backend always returns JSON (added 404 and error handlers)
- Inside Docker, services communicate via Docker network names

### 3. ✅ Backend Error Handling
**Problem:** Backend could return HTML errors  
**Solution:**
- Added 404 handler that returns JSON
- Added global error handler (middleware)
- All routes explicitly return `.json()` responses
- No chance of HTML leak to frontend

### 4. ✅ Frontend Component Cache Busting  
**Problem:** UI changes not visible after deployment  
**Solution:**
- Vite generates hashed filenames automatically: `js/[name]-[hash].js`
- App.jsx checks for health updates every 15 seconds
- Storage event listener for cross-tab synchronization
- Docker build uses CACHE_BUST argument to force rebuild

### 5. ✅ Build Validation
**Problem:** Generated components might not be bundled  
**Solution:**
- Deployment service validates `dist/` folder exists
- New `/validate-build` endpoint checks for JS bundles
- UI pipeline calls validation after rebuild
- Pre-commit validation in uiPipeline ensures App.jsx integrity

### 6. ✅ Component Auto-Import
**Problem:** AI generates components but they're not rendered  
**Solution:**
- uiPipeline automatically:
  - Generates component `.jsx` file
  - Adds import statement
  - Injects into `<div id="ai-generated-root">`
  - Updates App.css with new component styles
  - Validates final App.jsx syntax

### 7. ✅ JSON Response Safety
**Problem:** Frontend got confused when backend returned HTML  
**Solution:**
- All frontend API calls:
  1. Call `fetch(url)`
  2. Call `.text()` to read raw response
  3. Try `JSON.parse(text)` with error handling
  4. Show error: "Backend returned HTML instead of JSON"

---

## 🔄 SYSTEM FLOW

### Owner → AI → Deploy → Live

```
1. Owner: "Add a hero section at the top"
   ↓
2. Frontend: Send to /owner-command
   ↓
3. Backend: Route to Agent service
   ↓
4. Agent: Category = UI → run uiPipeline
   ↓
5. genAI: Generate React component for HeroSection
   ↓
6. Git: Create branch → Commit → Push
   ↓
7. Deployment: docker compose build --no-cache frontend
   ↓
8. Health Check: Wait for frontend to start
   ↓
9. Build Validation: Check dist/ has assets
   ↓
10. Tests: Run E2E tests
    ↓
11. Merge: If tests pass, merge PR
    ↓
12. Frontend: Browser loads NEW index.html with hashed JS
    ↓
13. React: Re-mounts, imports HeroSection component
    ↓
14. User: Sees new hero section LIVE ✅
```

---

## 🐳 Docker Network Communication

**Inside Docker containers**, use service names:
- Frontend → Backend: `http://backend:3000`
- Agent → Backend: `http://backend:3000`
- MCP → Backend: `http://backend:3000`

**Externally** (from your machine):
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Agent: `http://localhost:3001`
- MCP: `http://localhost:4000`
- Deployment: `http://localhost:5000`

---

## 🔏 Environment Variables

### Frontend Build (Non-Local)
```dockerfile
# Set during Docker build
ENV VITE_API_URL=http://backend:3000
RUN npm run build
```

### Frontend Build (Local Development)
```bash
export VITE_API_URL=http://localhost:3000
npm run build
```

### Vite Auto-Substitution
Any env var prefixed with `VITE_` is automatically available:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://backend:3000';
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Frontend Dockerfile uses multi-stage build
- [ ] docker-compose.yml sets `VITE_API_URL=http://backend:3000`
- [ ] Frontend components use `API_BASE` with fallback
- [ ] Backend has global error handler
- [ ] uiPipeline calls deployment service with `CACHE_BUST`
- [ ] Deployment service validates build artifacts
- [ ] Frontend App.jsx has `ai-generated-root` injection zone
- [ ] Component generation includes auto-import logic
- [ ] All API calls use `.text()` then `JSON.parse()` pattern
- [ ] Health checks pass after deployment

---

## 🚀 DEPLOYMENT COMMAND

```bash
# Force clean build with cache busting
docker compose build frontend --no-cache
docker compose up -d frontend

# Or use the deployment service
curl -X POST http://localhost:5000/deploy
```

---

## 🐛 TROUBLESHOOTING

### Frontend shows HTML error
→ Check backend is returning JSON: `curl http://backend:3000/menu`

### Components not rendering after deployment
→ Check dist/ has built files: `docker exec -it frontend ls -la dist/`

### Frontend port unreachable
→ Check service is running: `docker ps | grep frontend`

### API calls timeout
→ Check service network: `docker network ls | grep coffee`

### Components not bundled
→ Check build validation: `curl -X POST http://localhost:5000/validate-build`

---

## 📊 Key Metrics

- **Build time:** ~30-60s (depends on network)
- **Health check:** 5s intervals, max 60s timeout
- **Component rendering:** ~200ms (React mount)
- **Cache bust:** Automatic on every `CACHE_BUST` change
- **Total UI→Live:** ~1-2 minutes

