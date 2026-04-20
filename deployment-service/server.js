import express from "express";
import { exec } from "child_process";

const app = express();
app.use(express.json());

app.post("/deploy", (req, res) => {
  console.log("🚀 Deployment triggered");

  exec(
    `docker ps -a | grep workspace | awk '{print $1}' | xargs -r docker rm -f;
     docker network prune -f;
     cd /opt/MCP-Cofffe-Shop &&
     docker compose -p mcp-cofffe-shop down &&
     docker compose -p mcp-cofffe-shop up -d --build`,
    { cwd: "/opt/MCP-Cofffe-Shop" },
    (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Deployment failed:", stderr || error.message);
        return res.status(500).json({ success: false, error: stderr || error.message });
      }

      console.log("✅ Deployment successful");
      res.json({ success: true, output: stdout });
    }
  );
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(5000, () => {
  console.log("🚀 Deployment Service running on port 5000");
});
