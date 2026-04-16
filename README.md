# ☕ AI-Driven Self-Updating Coffee Shop

A complete system where a coffee shop owner can modify a live application using **natural language via chat**. The system interprets commands using AI, modifies the menu, runs automated tests, and deploys only if tests pass.

## 🏗️ Architecture

```
Owner (Chat UI) → OpenWebUI → Backend → AI Parser → Agent → Git Ops → MCP Tests → Deploy
     :3002          :3002       :3000     OpenAI     :3001    Git       :4000      :5173
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5173 | React + Vite coffee shop UI |
| Backend | 3000 | Express API (menu, orders, owner commands) |
| Agent | 3001 | Git pipeline orchestrator |
| MCP Server | 4000 | Automated testing engine |
| OpenWebUI | 3002 | Owner chat interface |

## 🚀 Quick Start

### 1. Clone & Configure

```bash
cp .env.example .env
# Edit .env with your keys (optional — works without API keys)
```

### 2. Run with Docker

```bash
docker-compose up --build
```

### 3. Access

- **Coffee Shop**: http://localhost:5173
- **Owner Chat**: http://localhost:3002
- **Backend API**: http://localhost:3000/menu
- **Admin Panel**: http://localhost:5173/admin

## 🎯 Demo Scenario

1. Open **Owner Chat** at http://localhost:3002
2. Type: `Add Cappuccino for 180`
3. Watch the pipeline:
   - AI parses command → `{ action: "ADD_ITEM", name: "Cappuccino", price: 180 }`
   - Agent creates git branch `ai-update-<timestamp>`
   - Updates `menu.json`
   - MCP runs tests (JSON valid, no duplicates, API works, frontend loads)
   - Tests pass → menu deployed
4. Frontend at http://localhost:5173 auto-refreshes with the new item

## 📝 Supported Commands

| Command | Example |
|---------|---------|
| Add item | "Add Cappuccino for 180" |
| Remove item | "Remove Americano" |
| Update price | "Update price of Coffee to 130" |
| Disable item | "Disable Espresso" |
| Enable item | "Enable Espresso" |

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Optional | OpenAI API key for AI parsing (falls back to regex) |
| `GITHUB_TOKEN` | Optional | GitHub PAT for PR creation (falls back to local git) |
| `REPO_URL` | Optional | GitHub repo URL |

## 🧪 Testing

The MCP server runs these tests on every pipeline execution:

- ✅ Menu is valid JSON array
- ✅ No duplicate items
- ✅ All items have required fields (name, price, available)
- ✅ All prices are positive
- ✅ Backend API returns correct menu
- ✅ Backend health check passes
- ✅ Frontend is reachable and has correct HTML structure

## 📁 Project Structure

```
├── frontend/          # React + Vite
├── backend/           # Express API + AI Parser
├── agent/             # Git pipeline orchestrator
├── mcp-server/        # Automated testing
├── openwebui/         # Owner chat interface
├── docker-compose.yml # Docker orchestration
└── .env               # Environment variables
```
