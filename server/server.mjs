// ============================================================
// 🔒 SentinelVPN Backend v2 (ESM + Stable Build)
// ------------------------------------------------------------
// ✅ Features
// • Connect / Disconnect toggle with auto timeout
// • Live status + simulated intrusion detection
// • Persistent logs (/logs/activity.log)
// • Frontend integration (public/vpn.html + dashboard.html)
// • Future Python-AI hook (security_layer.py)
// • Graceful shutdown + env PORT support
// ============================================================

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ---- Chalk safe import (v5 is ESM-only) ----
let chalk;
try {
  const { default: chalkImport } = await import("chalk");
  chalk = chalkImport;
} catch {
  // fallback – no color mode
  chalk = new Proxy(
    {},
    {
      get: () => (s) => s,
    }
  );
}

// ------------------------------------------------------------
// 📁 Paths & Files
// ------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const LOG_DIR = path.join(ROOT, "logs");
const LOG_FILE = path.join(LOG_DIR, "activity.log");

// Ensure folders/files exist
fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "");

// ------------------------------------------------------------
// 🌐 Express Setup
// ------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// ------------------------------------------------------------
// 🌐 Global VPN State
// ------------------------------------------------------------
let vpnStatus = false;
let currentIP = "0.0.0.0";
let threatsBlocked = 0;
let connectedAt = null;

// Utility – persistent log writer
function writeLog(entry) {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${entry}\n`);
  } catch (err) {
    console.error(chalk.redBright(`❌ Failed to write log: ${err.message}`));
  }
}

// ------------------------------------------------------------
// 🧠 Intrusion Detection Engine (simulated)
// ------------------------------------------------------------
function detectIntrusion() {
  const threats = [
    { type: "Port Scan", severity: "Medium", chance: 0.15 },
    { type: "SQL Injection", severity: "High", chance: 0.1 },
    { type: "DDoS Attempt", severity: "Critical", chance: 0.05 },
    { type: "Unauthorized Access", severity: "High", chance: 0.1 },
    { type: "Malicious Packet", severity: "Low", chance: 0.2 },
    { type: "Cross-Site Scripting", severity: "Medium", chance: 0.15 },
  ];

  const roll = Math.random();
  let cumulative = 0;
  for (const t of threats) {
    cumulative += t.chance;
    if (roll < cumulative) {
      threatsBlocked += 1;
      const entry = `⚠️ [INTRUSION] ${t.type} (${t.severity}) | Action: Blocked`;
      console.log(chalk.redBright(entry));
      writeLog(entry);
      return {
        detected: true,
        type: t.type,
        severity: t.severity,
        action: "Blocked",
        timestamp: new Date().toLocaleTimeString(),
      };
    }
  }
  return { detected: false };
}

// ------------------------------------------------------------
// 🧩 Helper – reset VPN session
// ------------------------------------------------------------
function resetVpnSession() {
  vpnStatus = false;
  currentIP = "0.0.0.0";
  threatsBlocked = 0;
  connectedAt = null;
}

// ------------------------------------------------------------
// 1️⃣ Toggle VPN Connection
// ------------------------------------------------------------
app.post("/vpn/toggle", (_req, res) => {
  vpnStatus = !vpnStatus;

  if (vpnStatus) {
    currentIP = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 256)
    ).join(".");
    connectedAt = Date.now();
    writeLog(`✅ VPN Connected | IP: ${currentIP}`);
  } else {
    writeLog("❌ VPN Disconnected");
    resetVpnSession();
  }

  const response = {
    connected: vpnStatus,
    ip: currentIP,
    country: vpnStatus ? "India" : "N/A",
    message: vpnStatus ? "VPN Connected ✅" : "VPN Disconnected ❌",
  };

  console.log(chalk.cyan(`[TOGGLE] ${response.message} | IP: ${response.ip}`));
  res.json(response);
});

// ------------------------------------------------------------
// 2️⃣ Live Status Endpoint
// ------------------------------------------------------------
app.get("/vpn/status", (_req, res) => {
  // Auto-disconnect after 10 minutes idle
  if (vpnStatus && connectedAt && Date.now() - connectedAt > 10 * 60 * 1000) {
    writeLog("⏱️ Auto-disconnected due to inactivity.");
    console.log(chalk.yellow("[TIMEOUT] Auto-disconnected after 10 minutes."));
    resetVpnSession();
  }

  const status = {
    connected: vpnStatus,
    ip: currentIP,
    bandwidth: vpnStatus
      ? `${(Math.random() * 100).toFixed(2)} Mbps`
      : "0 Mbps",
    threatsBlocked: vpnStatus ? threatsBlocked : 0,
    uptime: vpnStatus
      ? `${((Date.now() - connectedAt) / 60000).toFixed(1)} min`
      : "N/A",
    timestamp: new Date().toLocaleTimeString(),
  };

  const intrusion = vpnStatus ? detectIntrusion() : { detected: false };

  console.log(
    chalk.greenBright(
      `[STATUS] ${status.timestamp} | ${status.bandwidth} | Threats Blocked: ${status.threatsBlocked}`
    )
  );

  res.json({
    ...status,
    intrusion: intrusion.detected ? intrusion : null,
  });
});

// ------------------------------------------------------------
// 3️⃣ Logs Endpoint
// ------------------------------------------------------------
app.get("/vpn/logs", (_req, res) => {
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim() !== "");
    console.log(chalk.yellow("[LOGS] Logs sent to client"));
    res.json({ logs: lines });
  } catch (err) {
    console.error(chalk.redBright(`❌ Failed to read logs: ${err.message}`));
    res.status(500).json({ error: "Failed to read logs." });
  }
});

// ------------------------------------------------------------
// 4️⃣ Homepage Route
// ------------------------------------------------------------
app.get("/", (_req, res) => {
  const file = path.join(PUBLIC_DIR, "vpn.html");
  if (fs.existsSync(file)) return res.sendFile(file);
  res.status(404).send("vpn.html not found in /public.");
});

// ------------------------------------------------------------
// 5️⃣ Health Check
// ------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ------------------------------------------------------------
// 🚀 Start Server + Graceful Shutdown
// ------------------------------------------------------------
const PORT = Number(process.env.PORT || 5000);
const server = app.listen(PORT, () => {
  console.log(
    chalk.greenBright(
      `\n✅ SentinelVPN Backend v2 running on http://localhost:${PORT}`
    )
  );
  console.log(chalk.gray("------------------------------------------------------------"));
  console.log(chalk.cyan("Available Endpoints:"));
  console.log(chalk.yellow("POST /vpn/toggle → Connect/Disconnect VPN"));
  console.log(chalk.yellow("GET /vpn/status → Live stats + Intrusion detection"));
  console.log(chalk.yellow("GET /vpn/logs   → Persistent security logs"));
  console.log(chalk.yellow("GET /health     → Health check"));
  console.log(chalk.yellow("Frontend served from /public (vpn.html & dashboard.html)"));
  console.log(chalk.gray("------------------------------------------------------------\n"));
});

function shutdown(signal) {
  console.log(chalk.gray(`\n${signal} received. Shutting down SentinelVPN Backend...`));
  server.close(() => {
    console.log(chalk.gray("HTTP server closed."));
    process.exit(0);
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
