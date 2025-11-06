// ========================================
// 🛡️ SentinelVPN Dashboard Server (Stable)
// ========================================

import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// crypto_utils.js
import crypto from "crypto";
import fs from "fs";

const key = Buffer.from(fs.readFileSync("./server/secret.key", "utf-8").trim(), "base64");
const algorithm = "aes-256-cbc";

export function encryptMessage(plain) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let enc = cipher.update(plain, "utf8", "base64");
  enc += cipher.final("base64");
  // Combine iv + ciphertext, separated by ":"
  return iv.toString("base64") + ":" + enc;
}


// ---------- Path Setup ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Logging Setup ----------
const logDir = path.join(__dirname, "./logs");
const logPath = path.join(logDir, "vpn.log");

// Ensure log folder exists
fs.mkdirSync(logDir, { recursive: true });

// Create log file if not exists
if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, "");

// Logger utility
function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, entry);
  console.log(entry.trim());
}

// ---------- Express + WebSocket Setup ----------
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve dashboard UI files
app.use(express.static(path.join(__dirname, "../dashboard")));

// ---------- Runtime Stats ----------
let stats = {
  activeConnections: 0,
  totalBytesSent: 0,
  totalBytesReceived: 0,
  logs: []
};

// Broadcast function for all dashboard clients
function broadcastStats() {
  const payload = JSON.stringify({ type: "stats", payload: stats });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}

// ---------- WebSocket Event Handlers ----------
wss.on("connection", ws => {
  stats.activeConnections++;
  log(`📊 Dashboard connected (${stats.activeConnections} active)`);
  ws.send(JSON.stringify({ type: "init", payload: stats }));

  ws.on("close", () => {
    stats.activeConnections--;
    log(`❌ Dashboard disconnected (${stats.activeConnections} active)`);
  });
});

// ---------- Log File Watcher ----------
fs.watchFile(logPath, { interval: 1000 }, () => {
  try {
    const rawData = fs.readFileSync(logPath, "utf-8");
    if (!rawData.trim()) return;
    const lines = rawData.trim().split("\n");
    stats.logs = lines.slice(-10); // Keep last 10 entries
    broadcastStats();
  } catch (err) {
    console.error("❌ Error reading vpn.log:", err.message);
  }
});

// ---------- Port + Auto Recovery ----------
const DEFAULT_PORT = 9090;
let currentPort = DEFAULT_PORT;

function startServer(port) {
  const instance = server.listen(port);

  instance.on("listening", () => {
    currentPort = instance.address().port;
    log(`🖥️ SentinelVPN Dashboard running at http://localhost:${currentPort}`);
  });

  instance.on("error", err => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} busy — trying next port...`);
      startServer(port + 1);
    } else {
      console.error("❌ Server error:", err.message);
    }
  });
}

// Start the server safely
startServer(DEFAULT_PORT);
