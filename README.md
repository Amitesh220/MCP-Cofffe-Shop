# ☕ AI-Driven Self-Updating Coffee Shop

A complete, self-updating system where a coffee shop owner can modify a live application using **natural language via chat**. The system acts as a fully autonomous DevOps engineer — interpreting commands using AI, generating React components or modifying data, running automated tests, validating builds, and deploying changes to production seamlessly.

## 🌟 Key Features

- **Full UI Modification**: Beyond just data updates, the AI can generate new React components, modify styles, delete sections, and securely inject new components into the running application.
- **Robust Pipeline**: Every change triggers a strict GitOps pipeline: Branch creation → Code generation → Pre-commit validation → Commit → PR → Build & Test → Deploy → Automatic Browser Refresh.
- **Self-Healing Deployment**: Dedicated deployment service validates build artifacts (`dist` folder, `index.html`, JS bundles) before promoting to production.
- **Fail-Safe Testing**: MCP Server evaluates UI syntax, business logic, JSON validity, and API routing. If tests fail, the AI rolls back the git branch immediately.
- **Zero-Downtime Reloads**: Frontend implements cache-busting and auto-reloading when a new deployment version is detected.

## 🏗️ Architecture

```
Owner (OpenWebUI) → Backend → AI Parser → Agent Service → GitOps → Deployment Service → MCP Tests → Deploy
     :3002           :3000     OpenAI        :3001          Git            :5000          :4000      :80/:5173
```

### Services Configuration

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| **Frontend** | `frontend` | 80 / 5173 | React + Vite UI. Configured to never call backend directly in browser. Connects via public IP or localhost fallback. |
| **Backend** | `backend` | 3000 | Express API. Handles order processing, menu management, and parsing owner commands via AI. |
| **Agent** | `agent` | 3001 | Git pipeline orchestrator. Contains specialized pipelines for DATA, UI, and SYSTEM updates. |
| **MCP Server** | `mcp-server`| 4000 | Automated testing engine validating builds, UI structural integrity, and API health. |
| **Deployment** | `deployment-service`| 5000 | Orchestrates Docker builds, validates React `dist` output, and handles zero-downtime hot reloading. |
| **OpenWebUI** | `openwebui`| 3002 | Owner chat interface. Provides a conversational UI to trigger system updates with built-in retry logic. |

## 🚀 Quick Start

### 1. Clone & Configure

```bash
cp .env.example .env
# Edit .env with your keys (optional — works without API keys, but UI generation requires OpenAI)
```

### 2. Run with Docker Compose

```bash
docker compose up --build -d
```

### 3. Access

- **Coffee Shop (Frontend)**: http://localhost (or configured IP)
- **Owner Chat**: http://localhost:3002
- **Backend API**: http://localhost:3000
- **Admin Panel**: http://localhost/admin

## 🎯 Supported AI Capabilities

The system uses a Universal Parser to categorize and handle commands:

### 1. Data Updates (Menu)
- **Command:** `"Add a Cappuccino for 180 and remove the Americano"`
- **Pipeline:** Validates JSON, prevents duplicates, checks required fields.

### 2. UI Modifications (React Components)
- **Command:** `"Add a Hero Section with a catchy slogan"`
- **Pipeline:** 
  1. Generates `HeroSection.jsx` and CSS
  2. Parses and validates JSX syntax
  3. Injects component into `App.jsx`
  4. Commits and pushes branch
  5. Deployment Service rebuilds frontend container (`npm run build`)
  6. Validates `/dist` artifacts
  7. Frontend detects new version and auto-refreshes

### 3. System Configuration
- **Command:** `"Run a full health check"`
- **Pipeline:** Triggers diagnostic testing across all internal services.

## 🛡️ Stability & Safety Mechanisms

- **Pipeline Locks:** Built-in mutexes in the Agent prevent infinite loops and concurrent modifications.
- **Build Validation:** Deployment Service explicitly checks for a valid `index.html` and bundled JS files before signaling a successful deployment.
- **Fail-Safe Parsing:** All API calls use strict `text()` parsing and `try/catch` to prevent JSON parsing crashes if an HTML error page is returned.
- **Duplicate Detection:** Backend blocks identical commands within a 5-second window to prevent UI stuttering and duplicate pipelines.
- **Protected Zones:** Core components (`Navbar`, `OrderPage`, `AdminPanel`) are locked and cannot be accidentally deleted by the AI.

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Highly Recommended | Needed for the AI to generate React code and parse complex commands. |
| `VITE_API_URL` | Optional | Overrides the frontend's backend API URL detection. |
| `GITHUB_TOKEN` | Optional | GitHub PAT for PR creation (falls back to local Git operations). |

## 📁 Project Structure

```
├── frontend/           # React + Vite (Serves on port 80 via Docker)
├── backend/            # Express API + Universal AI Parser
├── agent/              # Git pipeline orchestrator + Code Generators
├── mcp-server/         # Automated testing suite
├── deployment-service/ # Build artifact validation & Docker orchestrator
├── openwebui/          # Owner chat interface proxy
├── docker-compose.yml  # System orchestration
└── .env                # Environment variables
```
