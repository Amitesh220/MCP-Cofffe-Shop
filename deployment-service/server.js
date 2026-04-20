import express from "express";
import { exec } from "child_process";

const app = express();
app.use(express.json());

app.post("/deploy", (req, res) => {
  console.log("🚀 Deployment triggered");

  exec(
    "docker compose up -d --build --force-recreate frontend backend",
    { cwd: "/workspace" },
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
