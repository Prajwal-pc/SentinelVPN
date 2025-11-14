// ============================================================
// 🛡️ SentinelVPN Dashboard Server (FINAL FIXED VERSION)
// ------------------------------------------------------------
// ✅ Shows real client count, messages, bytes
// ✅ Proper log formatting
// ✅ Auto-reconnect, live heartbeat sync
// ============================================================

import { execSync } from "child_process";
import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import WebSocket, { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8080);
const VPN_WS_URL = process.env.VPN_WS_URL || "ws://localhost:9091/ws";
const ENABLE_FILE_LOG = false;

// ---------- Optional cleanup ----------
try {
  if (os.platform() === "win32") {
    execSync(
      'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :8080\') do taskkill /F /PID %a',
      { stdio: "ignore" }
    );
    console.log("🧹 Cleaned up any old process on port 8080.");
  }
} catch (_) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DASHBOARD_DIR = path.resolve(__dirname, "../dashboard");

const LOG_DIR = path.resolve(__dirname, "./logs");
const LOG_PATH = path.join(LOG_DIR, "vpn.log");
if (ENABLE_FILE_LOG) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, "");
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
app.use(express.static(DASHBOARD_DIR));

const stats = {
  startedAt: Date.now(),
  dashboardClients: 0,
  vpnClients: 0,
  totalMessages: 0,
  totalBytesIn: 0,
  totalBytesOut: 0,
  logs: [],
  uptime: 0,
};

// ---------- Helper ----------
function broadcast(type, payload = {}) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}

// ---------- Dashboard Clients ----------
function heartbeat() { this.isAlive = true; }

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", heartbeat);
  stats.dashboardClients++;

  console.log(`📊 Dashboard client connected (${stats.dashboardClients})`);
  ws.send(JSON.stringify({ type: "init", payload: stats }));

  ws.on("close", () => {
    stats.dashboardClients--;
    console.log(`❌ Dashboard client disconnected (${stats.dashboardClients})`);
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// ---------- Upstream WS Bridge ----------
let upstream;
let reconnectTimer;

function connectUpstream() {
  console.log(`🌐 Connecting upstream → ${VPN_WS_URL}`);
  upstream = new WebSocket(VPN_WS_URL);

  upstream.on("open", () => {
    console.log("✅ Connected to vpn_socket_server");
    clearTimeout(reconnectTimer);
  });

  upstream.on("close", () => {
    console.warn("⚠️ Upstream closed. Reconnecting in 3s...");
    reconnectTimer = setTimeout(connectUpstream, 3000);
  });

  upstream.on("error", (err) => {
    console.error("❌ Upstream error:", err.message);
  });

  upstream.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, payload } = msg;

      switch (type) {
        case "heartbeat": {
          const data = payload || msg.payload || msg;
          stats.vpnClients = data.activeTCPClients ?? data.vpnClients ?? stats.vpnClients;
          stats.totalMessages = data.totalMessages ?? stats.totalMessages;
          stats.totalBytesIn = data.totalBytesIn ?? stats.totalBytesIn;
          stats.totalBytesOut = data.totalBytesOut ?? stats.totalBytesOut;
          stats.uptime = Math.floor((Date.now() - stats.startedAt) / 1000);

          broadcast("stats", { ...stats });
          break;
        }

        case "throughput":
          broadcast("throughput", payload);
          break;

        case "log": {
          const safeRemote = payload?.remote ?? "client";
          const safeMsg = payload?.message ?? "(no message)";
          const line = `${new Date().toLocaleTimeString()} | ${safeRemote} | ${safeMsg}`;
          stats.logs.push(line);
          if (stats.logs.length > 50) stats.logs.shift();
          broadcast("log", { remote: safeRemote, message: safeMsg });
          if (ENABLE_FILE_LOG) fs.appendFile(LOG_PATH, line + "\n", () => {});
          break;
        }

        case "client_join":
          stats.vpnClients++;
          broadcast("client_join", payload);
          break;

        case "client_leave":
          stats.vpnClients = Math.max(0, stats.vpnClients - 1);
          broadcast("client_leave", payload);
          break;

        case "error":
          broadcast("error", payload);
          break;

        default:
          break;
      }
    } catch (err) {
      console.error("⚠️ Failed to parse message:", err.message);
    }
  });
}

connectUpstream();

// ---------- Shutdown ----------
function shutdown(signal) {
  console.log(`🧹 Shutting down Dashboard (${signal})`);
  clearInterval(reconnectTimer);
  try { upstream?.close(); } catch {}
  wss.close(() => console.log("🛑 WS closed."));
  server.close(() => console.log("🛑 HTTP stopped."));
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------- Start ----------
server.listen(PORT, () => {
  console.log(`🖥️ Dashboard running → http://localhost:${PORT}`);
  console.log(`↗️ Bridging from ${VPN_WS_URL} → /ws`);
});
