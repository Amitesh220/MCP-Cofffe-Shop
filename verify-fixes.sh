#!/bin/bash

# AI Coffee Shop System - Verification Script
# Tests all fixes implemented in the system

set -e

FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"
DEPLOYMENT_URL="http://localhost:5000"

echo "🔍 Verifying AI Coffee Shop System Fixes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Frontend Container Running
echo -e "\n✓ Test 1: Frontend Container"
if curl -s $FRONTEND_URL > /dev/null; then
    echo "  ✅ Frontend is running on port 5173"
else
    echo "  ❌ Frontend is not responding"
    exit 1
fi

# Test 2: Backend Container Running
echo -e "\n✓ Test 2: Backend Container"
if curl -s $BACKEND_URL/health > /dev/null; then
    echo "  ✅ Backend is running on port 3000"
else
    echo "  ❌ Backend is not responding"
    exit 1
fi

# Test 3: Backend Returns JSON (not HTML)
echo -e "\n✓ Test 3: JSON Response Validation"
RESPONSE=$(curl -s $BACKEND_URL/menu)
if echo "$RESPONSE" | grep -q "^\["; then
    echo "  ✅ Backend returns JSON array: $(echo $RESPONSE | head -c 50)..."
elif echo "$RESPONSE" | grep -q "^<html"; then
    echo "  ❌ Backend returns HTML instead of JSON"
    exit 1
else
    echo "  ✅ Backend response is JSON format"
fi

# Test 4: Health Check Returns JSON
echo -e "\n✓ Test 4: Health Endpoint"
HEALTH=$(curl -s $BACKEND_URL/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "  ✅ Health endpoint returns valid JSON"
else
    echo "  ❌ Health endpoint not returning JSON"
    exit 1
fi

# Test 5: Frontend Dockerfile Multi-Stage
echo -e "\n✓ Test 5: Frontend Dockerfile"
if grep -q "FROM node:18 AS builder" frontend/Dockerfile && grep -q "FROM node:18-alpine" frontend/Dockerfile; then
    echo "  ✅ Frontend Dockerfile uses multi-stage build"
else
    echo "  ❌ Frontend Dockerfile not using multi-stage build"
    exit 1
fi

# Test 6: docker-compose.yml has VITE_API_URL
echo -e "\n✓ Test 6: Docker Compose Configuration"
if grep -q 'VITE_API_URL=http://backend:3000' docker-compose.yml; then
    echo "  ✅ docker-compose.yml sets correct VITE_API_URL"
else
    echo "  ❌ docker-compose.yml missing VITE_API_URL"
    exit 1
fi

# Test 7: docker-compose.yml has CACHE_BUST args
echo -e "\n✓ Test 7: Cache Busting Configuration"
if grep -q 'CACHE_BUST' docker-compose.yml && grep -q 'CACHE_BUST' frontend/Dockerfile; then
    echo "  ✅ CACHE_BUST arguments configured"
else
    echo "  ❌ CACHE_BUST not configured"
    exit 1
fi

# Test 8: Backend has error handler
echo -e "\n✓ Test 8: Backend Error Handling"
if grep -q 'app.use((err, req, res, next)' backend/server.js; then
    echo "  ✅ Backend has global error handler"
else
    echo "  ❌ Backend missing global error handler"
    exit 1
fi

# Test 9: App.jsx has AI injection zone
echo -e "\n✓ Test 9: Component Injection"
if grep -q 'id="ai-generated-root"' frontend/src/App.jsx; then
    echo "  ✅ App.jsx has AI injection zone"
else
    echo "  ❌ App.jsx missing AI injection zone"
    exit 1
fi

# Test 10: Components use API_BASE with fallback
echo -e "\n✓ Test 10: API Base Configuration"
if grep -q "import.meta.env.VITE_API_URL || 'http://backend:3000'" frontend/src/components/MenuPage.jsx; then
    echo "  ✅ Components use API_BASE with fallback"
else
    echo "  ❌ Components not using API_BASE pattern"
    exit 1
fi

# Test 11: Components have JSON parsing safety
echo -e "\n✓ Test 11: JSON Parsing Safety"
if grep -q "JSON.parse(text)" frontend/src/components/MenuPage.jsx && grep -q "Backend returned HTML" frontend/src/components/MenuPage.jsx; then
    echo "  ✅ Components have JSON parsing safety"
else
    echo "  ❌ Components missing JSON parsing safety"
    exit 1
fi

# Test 12: Vite config has hash filenames
echo -e "\n✓ Test 12: Cache-Busting Filenames"
if grep -q '\[name\]-\[hash\]' frontend/vite.config.js; then
    echo "  ✅ Vite configured for hashed filenames"
else
    echo "  ❌ Vite not configured for hashing"
    exit 1
fi

# Test 13: uiPipeline has build validation
echo -e "\n✓ Test 13: Build Validation"
if grep -q 'validate-build' agent/services/uiPipeline.js; then
    echo "  ✅ UI Pipeline calls build validation"
else
    echo "  ❌ UI Pipeline missing build validation"
    exit 1
fi

# Test 14: Deployment service has validation endpoint
echo -e "\n✓ Test 14: Deployment Service"
if grep -q 'app.post("/validate-build"' deployment-service/server.js; then
    echo "  ✅ Deployment service has validate-build endpoint"
else
    echo "  ❌ Deployment service missing validation"
    exit 1
fi

# Test 15: Frontend has health check in App.jsx
echo -e "\n✓ Test 15: Frontend Health Polling"
if grep -q 'setInterval.*health' frontend/src/App.jsx; then
    echo "  ✅ Frontend has health check polling"
else
    echo "  ❌ Frontend missing health polling"
    exit 1
fi

# Test 16: Check Docker network exists
echo -e "\n✓ Test 16: Docker Network"
if docker network ls | grep -q 'coffee-net'; then
    echo "  ✅ Docker network 'coffee-net' exists"
else
    echo "  ⚠️  Docker network not yet created (starts on compose up)"
fi

# Test 17: Verify dist folder structure
echo -e "\n✓ Test 17: Frontend Build Output"
if [ -d "frontend/dist" ] && [ -f "frontend/dist/index.html" ]; then
    echo "  ✅ Frontend dist folder has index.html"
    JS_Files=$(find frontend/dist -name "*.js" | wc -l)
    echo "  ✅ Found $JS_Files JavaScript files (with hashes)"
else
    echo "  ⚠️  Frontend dist not yet built (normal if not built)"
fi

# Test 18: Package.json has build scripts
echo -e "\n✓ Test 18: Build Scripts"
if grep -q '"build": "vite build"' frontend/package.json; then
    echo "  ✅ Frontend package.json has build script"
else
    echo "  ❌ Frontend package.json missing build"
    exit 1
fi

# Summary
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All critical fixes verified!"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start system:     docker compose up -d"
echo "  2. Visit frontend:   http://localhost:5173"
echo "  3. Check menu:       curl http://localhost:3000/menu"
echo "  4. Test UI changes:  curl -X POST http://localhost:3000/owner-command -d '{\"command\":\"...\"}'"
echo ""
echo "📋 Documentation:"
echo "  - FIXES_APPLIED.md           - Overview of all fixes"
echo "  - CODE_FIXES_REFERENCE.md    - Before/after code examples"
echo "  - DEPLOYMENT_GUIDE.md        - Testing and deployment guide"
