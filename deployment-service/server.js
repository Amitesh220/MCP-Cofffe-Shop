import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

app.post("/deploy", (req, res) => {
  console.log("🚀 Deployment triggered");
  
  const cachebustearg = Math.random().toString(36).substring(7);

  exec(
    `docker ps -a | grep workspace | awk '{print $1}' | xargs -r docker rm -f;
     docker network prune -f;
     cd /opt/MCP-Cofffe-Shop &&
     docker compose -p mcp-cofffe-shop stop frontend backend &&
     docker compose -p mcp-cofffe-shop rm -f frontend backend &&
     docker compose -p mcp-cofffe-shop build --no-cache --build-arg CACHE_BUST=${cachebustearg} frontend backend &&
     docker compose -p mcp-cofffe-shop up -d frontend backend`,
    { cwd: "/opt/MCP-Cofffe-Shop" },
    (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Deployment failed:", stderr || error.message);
        return res.status(500).json({ success: false, error: stderr || error.message });
      }

      console.log("✅ Deployment successful");
      
      // Validate that dist folder exists and has content
      const distPath = "/opt/MCP-Cofffe-Shop/frontend/dist";
      try {
        if (fs.existsSync(distPath)) {
          const files = fs.readdirSync(distPath);
          console.log(`✅ Frontend dist has ${files.length} files/folders`);
          res.json({ 
            success: true, 
            output: stdout,
            distValidated: true,
            fileCount: files.length
          });
        } else {
          throw new Error("dist folder not found after build");
        }
      } catch (e) {
        console.error("⚠️ Build validation warning:", e.message);
        res.json({ 
          success: true, 
          output: stdout,
          distValidated: false,
          warning: e.message
        });
      }
    }
  );
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
