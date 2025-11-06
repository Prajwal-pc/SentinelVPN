// =========================================
// 🛡️ SentinelVPN Dashboard Server
// =========================================
import { execSync } from "child_process";

// Kill old process on port 8080 (Windows)
try {
  execSync('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :8080\') do taskkill /F /PID %a');
  console.log("🧹 Cleaned up any old process on port 8080.");
} catch (err) {
  // ignore if nothing running
}

import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------- Path Setup ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Logging Setup ----------
const logDir = path.join(__dirname, "./logs");
const logPath = path.join(logDir, "vpn.log");

// Ensure logs directory exists
fs.mkdirSync(logDir, { recursive: true });

// Create the log file if it doesn’t exist
if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, "");

// Helper logger
function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, entry);
  console.log(entry.trim());
}

log("🔧 Dashboard logging initialized...");

// ---------- Express + WebSocket Setup ----------
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static dashboard files (index.html, dashboard.js, style.css)
app.use(express.static(path.join(__dirname, "../dashboard")));

// ---------- Runtime Statistics ----------
let stats = {
  activeConnections: 0,
  totalBytesSent: 0,
  totalBytesReceived: 0,
  logs: []
};

// Broadcast stats to all connected clients
function broadcastStats() {
  const payload = JSON.stringify({ type: "stats", payload: stats });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}

// ---------- WebSocket Connection ----------
wss.on("connection", ws => {
  log("📊 Dashboard connected");
  ws.send(JSON.stringify({ type: "init", payload: stats }));
});

// ---------- Watch VPN Log File ----------
fs.watchFile(logPath, { interval: 1000 }, () => {
  try {
    const data = fs.readFileSync(logPath, "utf-8").trim().split("\n");
    stats.logs = data.slice(-10); // last 10 entries
    broadcastStats();
  } catch (err) {
    console.error("❌ Error reading vpn.log:", err.message);
  }
});

// ---------- Start Server ----------
const PORT = 8080;
server.listen(PORT, () => {
  log(`🖥️ SentinelVPN Dashboard running at http://localhost:${PORT}`);
});
