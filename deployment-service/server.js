import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// Helper: execute command and wait for completion
const executeCommand = (cmd, cwd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
};

// Helper: wait for backend health
const waitForBackendHealth = async (maxWait = 60000) => {
  const startTime = Date.now();
  console.log('⏳ Waiting for backend to become healthy...');
  
  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        console.log('✅ Backend is healthy');
        return true;
      }
    } catch (e) {
      // Backend not ready yet
    }
    
    // Wait 2 seconds before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Backend health check timeout after ${maxWait}ms`);
};

app.post("/deploy", async (req, res) => {
  console.log("🚀 Deployment triggered");
  
  try {
    // Step 1: Build frontend only (--no-cache forces fresh build)
    console.log('🔨 Building frontend...');
    await executeCommand(
      'docker compose build --no-cache frontend',
      '/opt/MCP-Cofffe-Shop'
    );
    console.log('✅ Frontend build complete');

    // Step 2: Start frontend only
    console.log('🚀 Starting frontend...');
    await executeCommand(
      'docker compose up -d frontend',
      '/opt/MCP-Cofffe-Shop'
    );
    console.log('✅ Frontend is running');

    // Step 3: Validate dist folder
    console.log('🔍 Validating build artifacts...');
    const distPath = "/opt/MCP-Cofffe-Shop/frontend/dist";
    if (!fs.existsSync(distPath)) {
      throw new Error("dist folder not found after build");
    }

    const files = fs.readdirSync(distPath);
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error("index.html not found in dist");
    }

    console.log(`✅ Build validated: ${files.length} files in dist/`);

    // Step 4: Wait for backend to be healthy
    await waitForBackendHealth();

    // Step 5: Notify backend of new deployment (FIX #9)
    try {
      console.log('📢 Notifying backend of deployment...');
      const notifyRes = await fetch('http://localhost:3000/deployment/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (notifyRes.ok) {
        console.log('✅ Backend notified of deployment');
      }
    } catch (e) {
      console.warn('⚠️ Could not notify backend:', e.message);
    }

    // SUCCESS
    res.json({
      success: true,
      message: "Frontend deployed and validated",
      distValidated: true,
      fileCount: files.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post("/validate-build", (req, res) => {
  const { components } = req.body;
  console.log(`🔍 Validating build for components: ${components?.join(', ')}`);
  
  const distPath = "/opt/MCP-Cofffe-Shop/frontend/dist";
  const errors = [];
  
  try {
    if (!fs.existsSync(distPath)) {
      return res.status(400).json({ 
        valid: false, 
        error: "dist folder not found",
        errors: ["dist directory does not exist"]
      });
    }
    
    // Read index.html
    const indexPath = path.join(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      errors.push("index.html not found in dist");
    } else {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      
      // Verify JS bundles exist
      const jsPattern = /<script[^>]+src="([^"]+\.js)"/g;
      const jsMatches = [...indexContent.matchAll(jsPattern)];
      if (jsMatches.length === 0) {
        errors.push("No JavaScript bundles found in index.html");
      } else {
        console.log(`✅ Found ${jsMatches.length} JavaScript bundle(s)`);
      }
      
      // Check for specific components if provided
      if (components && Array.isArray(components)) {
        for (const comp of components) {
          if (!indexContent.includes(comp)) {
            errors.push(`Component "${comp}" not found in bundled output`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return res.json({ valid: false, errors });
    }
    
    res.json({ 
      valid: true, 
      message: `Build valid with ${jsMatches?.length || 1} bundle(s)` 
    });
  } catch (e) {
    res.status(500).json({ 
      valid: false, 
      error: e.message,
      errors: [e.message]
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "deployment-service" });
});

app.listen(5000, () => {
  console.log("🚀 Deployment Service running on port 5000");
});
      
      // Verify JS bundles exist
      const jsPattern = /<script[^>]+src="([^"]+\.js)"/g;
      const jsMatches = [...indexContent.matchAll(jsPattern)];
      if (jsMatches.length === 0) {
        errors.push("No JavaScript bundles found in index.html");
      } else {
        console.log(`✅ Found ${jsMatches.length} JavaScript bundle(s)`);
      }
      
      // Check for specific components if provided
      if (components && Array.isArray(components)) {
        for (const comp of components) {
          if (!indexContent.includes(comp)) {
            errors.push(`Component "${comp}" not found in bundled output`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return res.json({ valid: false, errors });
    }
    
    res.json({ 
      valid: true, 
      message: `Build valid with ${jsMatches?.length || 1} bundle(s)` 
    });
  } catch (e) {
    res.status(500).json({ 
      valid: false, 
      error: e.message,
      errors: [e.message]
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "deployment-service" });
});

app.listen(5000, () => {
  console.log("🚀 Deployment Service running on port 5000");
});
