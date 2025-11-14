// ========================================
// 🛡️ SentinelVPN Dashboard Server (Final Stable Build)
// ========================================

import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import process from "process";

// ---------- AES Config ----------
const KEY_PASSPHRASE = process.env.SECRET_KEY || "sentinelvpn-dev-key";
const ALGO = "aes-256-cbc";
const KEY = crypto.createHash("sha256").update(KEY_PASSPHRASE).digest();

// AES encrypt/decrypt
export function encryptMessage(plain) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let enc = cipher.update(plain, "utf8", "base64");
  enc += cipher.final("base64");
  return iv.toString("base64") + ":" + enc;
}

export function decryptMessage(data) {
  try {
    const [ivStr, b64] = data.split(":");
    const iv = Buffer.from(ivStr, "base64");
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    let dec = decipher.update(b64, "base64", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch (err) {
    console.error("❌ Decrypt error:", err.message);
    return null;
  }
}

// ---------- Path Setup ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DASHBOARD_DIR = path.resolve(__dirname, "../dashboard");

// ---------- Logging Setup ----------
const LOG_DIR = path.join(__dirname, "./logs");
const LOG_PATH = path.join(LOG_DIR, "vpn.log");
fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, "");

function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_PATH, entry);
  console.log(entry.trim());
}

// ---------- Express + WebSocket Setup ----------
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve dashboard
app.use(express.static(DASHBOARD_DIR));

// ---------- Runtime Stats ----------
let stats = {
  startedAt: Date.now(),
  activeConnections: 0,
  totalBytesSent: 0,
  totalBytesReceived: 0,
  totalMessages: 0,
  logs: []
};

// Broadcast utility
function broadcast(type, payload = {}) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// ---------- WebSocket Heartbeat ----------
function heartbeat() {
  this.isAlive = true;
}
wss.on("connection", ws => {
  ws.isAlive = true;
  ws.on("pong", heartbeat);

  stats.activeConnections++;
  log(`📊 Dashboard connected (${stats.activeConnections} active)`);

  ws.send(JSON.stringify({ type: "init", payload: stats }));

  ws.on("close", () => {
    stats.activeConnections--;
    log(`❌ Dashboard disconnected (${stats.activeConnections} active)`);
  });
});

// Ping every 30 seconds to ensure alive clients
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// ---------- Log Watcher (Efficient) ----------
let lastMtime = 0;
fs.watchFile(LOG_PATH, { interval: 1000 }, () => {
  try {
    const { mtimeMs } = fs.statSync(LOG_PATH);
    if (mtimeMs === lastMtime) return;
    lastMtime = mtimeMs;

    const raw = fs.readFileSync(LOG_PATH, "utf8").trim();
    if (!raw) return;

    const lines = raw.split("\n");
    const lastLines = lines.slice(-10);
    stats.logs = lastLines;
    stats.totalMessages = lines.length;

    broadcast("stats", stats);
  } catch (err) {
    console.error("❌ Log watcher error:", err.message);
  }
});

// ---------- Health Route ----------
app.get("/status", (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.floor((Date.now() - stats.startedAt) / 1000),
    activeConnections: stats.activeConnections,
    totalMessages: stats.totalMessages,
    totalBytesReceived: stats.totalBytesReceived,
    totalBytesSent: stats.totalBytesSent,
    lastLogs: stats.logs.slice(-5)
  });
});

// ---------- Safe Server Start ----------
const DEFAULT_PORT = 9090;
let currentPort = DEFAULT_PORT;

function startServer(port) {
  const listener = server.listen(port, () => {
    currentPort = port;
    log(`🖥️ SentinelVPN Dashboard running at http://localhost:${port}`);
  });

  listener.on("error", err => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} busy — retrying ${port + 1}...`);
      setTimeout(() => startServer(port + 1), 1000);
    } else {
      console.error("❌ Server error:", err.message);
    }
  });
}

// ---------- Graceful Shutdown ----------
process.on("SIGINT", () => {
  console.log("\n🧹 Shutting down SentinelVPN Dashboard...");
  clearInterval(interval);
  wss.close(() => console.log("WebSocket closed."));
  server.close(() => console.log("HTTP server stopped."));
  process.exit(0);
});

// ---------- Start ----------
startServer(DEFAULT_PORT);
