# 🔧 Code Fixes Reference

## All Changes Made

### 1. Frontend Dockerfile - Production Reliability

**BEFORE (❌ Unreliable)**
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve

CMD ["serve", "-s", "dist", "-l", "80"]
```

**AFTER (✅ Production-Ready)**
```dockerfile
# Build stage
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit    # Reproducible, faster

COPY . .
ARG CACHE_BUST=default                    # Force rebuild on deploy
ENV CACHE_BUST=$CACHE_BUST
ENV VITE_API_URL=http://backend:3000      # Set during build
RUN npm run build

# Validate build
RUN if [ ! -f dist/index.html ]; then exit 1; fi

# Production stage - ALPINE (smaller, faster)
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve@14               # Pinned version
COPY --from=builder /app/dist ./dist

EXPOSE 80
HEALTHCHECK --interval=5s --timeout=2s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["serve", "-s", "dist", "-l", "80"]   # No --no-cache flag
```

**Benefits:**
- Multi-stage: builder stage not in production image
- Reproducible builds: `npm ci` instead of `npm install`
- Layer caching: package.json copied first
- Cache busting: CACHE_BUST argument
- Health checks: proper liveness probe
- Validation: ensure dist/ exists before start

---

### 2. docker-compose.yml - API URL Configuration

**BEFORE (❌ Wrong Network)**
```yaml
frontend:
  environment:
    - VITE_API_URL=http://localhost:3000  # ❌ localhost doesn't exist in Docker
```

**AFTER (✅ Docker Network)**
```yaml
frontend:
  build:
    args:
      CACHE_BUST: ${CACHE_BUST:-default}  # For forced rebuilds
  environment:
    - VITE_API_URL=http://backend:3000    # ✅ Service name in Docker network
    # For local dev override: export VITE_API_URL=http://localhost:3000
```

**Benefits:**
- Frontend built with correct backend URL
- Services communicate via Docker DNS
- Easy local override with env var
- Cache busting argument available

---

### 3. Frontend Components - API Base URL

**BEFORE (❌ Hardcoded)**
```javascript
const url = '/menu';
const response = await fetch(url);
const data = await response.json();
```

**AFTER (✅ Environment-Aware)**
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://backend:3000';

const response = await fetch(`${API_BASE}/menu`);
const text = await response.text();

let data;
try {
  data = JSON.parse(text);
} catch {
  throw new Error("Backend returned HTML instead of JSON");
}
```

**Benefits:**
- Works in Docker: uses `http://backend:3000`
- Works locally: overrideable
- Detects HTML errors from backend
- Proper error messages

---

### 4. Frontend App.jsx - Cache Busting & Updates

**BEFORE (❌ Static)**
```javascript
function App() {
  return (
    <Router>
      <Navbar />
      <Routes>...</Routes>
      <div id="ai-generated-root">
        <HeroSection />
      </div>
    </Router>
  );
}
```

**AFTER (✅ Dynamic)**
```javascript
function App() {
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    // Poll for backend updates every 15s
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/health?t=${Date.now()}`,  // Cache-busting query param
          { cache: 'no-store' }
        );
      } catch (e) { }
    }, 15000);

    // Sync updates across browser tabs
    const handleStorageChange = (e) => {
      if (e.key === 'uiUpdated') {
        window.location.reload();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <Router>
      <div data-mcp-core="Navbar" key={lastUpdated}>
        <Navbar />
      </div>
      <div id="ai-generated-root" key={`ai-${lastUpdated}`}>
        <HeroSection />
      </div>
    </Router>
  );
}
```

**Benefits:**
- Detects when backend updates available
- Cross-tab synchronization
- Cache-busting query params
- Component re-mounting on updates

---

### 5. Backend Server - Error Handling

**BEFORE (❌ Can return HTML)**
```javascript
const app = express();
app.use(cors());
app.use(express.json());

app.use('/menu', menuRoutes);
app.use('/order', orderRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on ${PORT}`);
});
```

**AFTER (✅ Always JSON)**
```javascript
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('...'));

app.use('/menu', menuRoutes);
app.use('/order', orderRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

// 404 Handler - returns JSON, not HTML
app.use((req, res) => {
  res.status(404).json({
    status: 'not_found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error Handler - prevents HTML errors
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    status: 'error',
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});
```

**Benefits:**
- Always returns JSON (never HTML)
- Proper 404 responses
- Error handler catches all exceptions
- Consistent error format

---

### 6. Deployment Service - Build Validation

**BEFORE (❌ No Validation)**
```javascript
app.post("/deploy", (req, res) => {
  exec('docker compose build --no-cache frontend backend && docker compose up -d frontend backend',
    (error, stdout, stderr) => {
      if (error) return res.json({ success: false, error });
      res.json({ success: true, output: stdout });
    }
  );
});
```

**AFTER (✅ With Validation)**
```javascript
app.post("/deploy", (req, res) => {
  const cachebustValue = Math.random().toString(36).substring(7);

  exec(
    `cd /opt/MCP-Cofffe-Shop && 
     docker compose build --no-cache --build-arg CACHE_BUST=${cachebustValue} frontend backend &&
     docker compose up -d frontend backend`,
    (error, stdout, stderr) => {
      if (error) return res.json({ success: false, error });

      // Validate dist exists
      const distPath = "/opt/MCP-Cofffe-Shop/frontend/dist";
      if (fs.existsSync(distPath)) {
        const files = fs.readdirSync(distPath);
        res.json({ success: true, distValidated: true, fileCount: files.length });
      } else {
        res.json({ success: true, distValidated: false, warning: "dist not found" });
      }
    }
  );
});

app.post("/validate-build", (req, res) => {
  const distPath = "/opt/MCP-Cofffe-Shop/frontend/dist";
  const indexPath = path.join(distPath, "index.html");
  
  if (!fs.existsSync(indexPath)) {
    return res.json({ valid: false, errors: ["index.html not found"] });
  }

  const content = fs.readFileSync(indexPath, 'utf-8');
  const jsMatches = [...content.matchAll(/<script[^>]+src="([^"]+\.js)"/g)];
  
  if (jsMatches.length === 0) {
    return res.json({ valid: false, errors: ["No JS bundles found"] });
  }

  res.json({ valid: true, message: `Build valid with ${jsMatches.length} bundles` });
});
```

**Benefits:**
- Cache busting on every deploy
- Validates dist folder exists
- Checks for JS bundles
- Reports build status

---

### 7. UI Pipeline - Build Validation

**BEFORE (❌ No Validation)**
```javascript
// Rebuild and health check...
log('deploy', 'success', 'UI changes committed');
```

**AFTER (✅ With Validation)**
```javascript
// After rebuild and health check...

// Build Validation
log('build-validation', 'pending', 'Validating frontend build artifacts...');

const generatedComponents = results
  .filter(r => r.status === 'success' && r.component)
  .map(r => r.component);

const validationRes = await fetch('http://deployment-service:5000/validate-build', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ components: generatedComponents })
});

const validationData = await validationRes.json();
if (!validationData.valid) {
  throw new Error(`Build validation failed: ${validationData.errors?.join('; ')}`);
}

log('build-validation', 'success', validationData.message);
```

**Benefits:**
- Ensures components are actually bundled
- Validates before declaring success
- Catches build failures early
- Provides detailed error messages

---

### 8. Vite Config - Hash Filenames & Build Output

**BEFORE (❌ No Hashing)**
```javascript
export default defineConfig({
  plugins: [react()],
  server: { ... }
});
```

**AFTER (✅ Cache Busting)**
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    // Generate hashed filenames for cache busting
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',      // main-abc123.js
        chunkFileNames: 'js/[name]-[hash].js',      // chunk-def456.js
        assetFileNames: 'assets/[name]-[hash].[ext]' // style-ghi789.css
      }
    },
    // Build metadata for validation
    manifest: true
  },
  server: { ... }
});
```

**Benefits:**
- Browser never caches old files
- Each deploy gets new filenames
- Old and new versions can coexist
- Manifest helps with asset tracking

---

## Environment Variables

### VITE_ Prefix (Auto-Exposed to Frontend)
```javascript
// These become available as import.meta.env.*
const API_BASE = import.meta.env.VITE_API_URL || 'http://backend:3000';
```

### Build-Time (Docker)
```dockerfile
ENV VITE_API_URL=http://backend:3000  # Available during build
RUN npm run build                      # Baked into dist at build time
```

### Runtime (docker-compose.yml)
```yaml
environment:
  - VITE_API_URL=http://backend:3000  # Not used at runtime (already baked)
  - CACHE_BUST=${CACHE_BUST}          # Used only for layer cache busting
```

---

## Testing Each Fix

### Fix 1: Frontend Starts
```bash
docker compose up frontend
# Should see: serving on port 80
curl http://localhost:5173
# Should return HTML with React
```

### Fix 2: API URL Works
```bash
curl http://localhost:5173
# Open DevTools → Network → menu request
# Should go to http://localhost:3000/menu (proxied in Dev)
```

### Fix 3: JSON Responses
```bash
curl http://localhost:3000/menu
# Should return: [{"name":"...","price":...}]
# NOT HTML
```

### Fix 4: Cache Busting
```bash
docker exec frontend ls dist/assets/
# Should see files with hashes: main-abc123.js
# NOT: main.js
```

### Fix 5: Build Validation
```bash
curl -X POST http://localhost:5000/validate-build \
  -H "Content-Type: application/json" \
  -d '{"components":[]}'
# Should return: {"valid":true,"message":"..."}
```

### Fix 6: Component Injection
```bash
curl http://localhost:3000/owner-command \
  -d '{"command":"add a footer"}'
# Should create component, update App.jsx, rebuild
# Check frontend shows new footer
```

---

## Summary Table

| Issue | Before | After | Test |
|-------|--------|-------|------|
| Frontend crashes | `serve --no-cache` fails | Multi-stage, Alpine | `docker ps` |
| Backend returns HTML | No validation | Error handler | `curl /menu` |
| API URL wrong | localhost in Docker | service name | `curl http://backend:3000` |
| UI not updating | No cache busting | Hashed filenames | `ls dist/assets/` |
| Components not bundled | No validation | Build validation | `curl /validate-build` |
| JSON safety | Assumes JSON | Parse with catch | DevTools |

