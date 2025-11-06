// ============================================================
// 🔒 SentinelVPN Backend v2 (Enhanced + Modularized)
// ------------------------------------------------------------
// ✅ Features:
// 1. Connect / Disconnect toggle with auto timeout
// 2. Live status info + AI-style intrusion simulation
// 3. Persistent logs (in /logs folder)
// 4. Frontend integration (vpn.html + dashboard.html)
// 5. Ready for future Python-AI hook (security_layer.py)
// ============================================================

const express = require("express");
const cors = require("cors");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve frontend files from /public
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------
// 🌐 Global VPN State
// ------------------------------------------------------------
let vpnStatus = false;
let currentIP = "0.0.0.0";
let threatsBlocked = 0;
let connectedAt = null;
const LOG_FILE = path.join(__dirname, "logs", "activity.log");

// Ensure log directory exists
if (!fs.existsSync(path.join(__dirname, "logs"))) {
  fs.mkdirSync(path.join(__dirname, "logs"));
}

// Utility: Write persistent logs
function writeLog(entry) {
  const timestamp = new Date().toLocaleString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${entry}\n`);
}

// ============================================================
// 🧠 Intrusion Detection Engine (Simulated AI Logic)
// ============================================================
function detectIntrusion() {
  const threats = [
    { type: "Port Scan", severity: "Medium", chance: 0.15 },
    { type: "SQL Injection", severity: "High", chance: 0.1 },
    { type: "DDoS Attempt", severity: "Critical", chance: 0.05 },
    { type: "Unauthorized Access", severity: "High", chance: 0.1 },
    { type: "Malicious Packet", severity: "Low", chance: 0.2 },
    { type: "Cross-Site Scripting", severity: "Medium", chance: 0.15 },
  ];

  // Weighted intrusion probability (≈30% overall)
  const roll = Math.random();
  let cumulative = 0;
  for (const t of threats) {
    cumulative += t.chance;
    if (roll < cumulative) {
      threatsBlocked++;
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

// ============================================================
// 1️⃣ Toggle VPN Connection
// ============================================================
app.post("/vpn/toggle", (req, res) => {
  vpnStatus = !vpnStatus;
  if (vpnStatus) {
    currentIP = `${Math.floor(Math.random() * 255)}.${Math.floor(
      Math.random() * 255
    )}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    connectedAt = Date.now();
    writeLog(`✅ VPN Connected | IP: ${currentIP}`);
  } else {
    writeLog(`❌ VPN Disconnected`);
    currentIP = "0.0.0.0";
    threatsBlocked = 0;
    connectedAt = null;
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

// ============================================================
// 2️⃣ Live Status Endpoint
// ============================================================
app.get("/vpn/status", (req, res) => {
  // Auto disconnect after 10 minutes idle
  if (vpnStatus && connectedAt && Date.now() - connectedAt > 10 * 60 * 1000) {
    vpnStatus = false;
    writeLog(`⏱️ Auto-disconnected due to inactivity.`);
    console.log(chalk.yellow(`[TIMEOUT] Auto-disconnected after 10 minutes.`));
  }

  const status = {
    connected: vpnStatus,
    ip: currentIP,
    bandwidth: vpnStatus
      ? (Math.random() * 100).toFixed(2) + " Mbps"
      : "0 Mbps",
    threatsBlocked: vpnStatus ? threatsBlocked : 0,
    uptime: vpnStatus
      ? `${((Date.now() - connectedAt) / 1000 / 60).toFixed(1)} min`
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

// ============================================================
// 3️⃣ Logs Endpoint (Persistent)
// ============================================================
app.get("/vpn/logs", (req, res) => {
  const logs = fs.readFileSync(LOG_FILE, "utf8") || "No logs yet.";
  console.log(chalk.yellow("[LOGS] Logs sent to client"));
  res.json({ logs: logs.split("\n").filter((l) => l.trim() !== "") });
});

// ============================================================
// 4️⃣ Homepage Route
// ============================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "vpn.html"));
});

// ============================================================
// 🚀 Start Server
// ============================================================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(
    chalk.greenBright(
      `\n✅ SentinelVPN Backend v2 running on http://localhost:${PORT}`
    )
  );
  console.log(chalk.gray("------------------------------------------------------------"));
  console.log(chalk.cyan("Available Endpoints:"));
  console.log(chalk.yellow("POST  /vpn/toggle   → Connect/Disconnect VPN"));
  console.log(
    chalk.yellow("GET   /vpn/status   → Live connection stats + Intrusion detection")
  );
  console.log(chalk.yellow("GET   /vpn/logs     → Persistent security logs"));
  console.log(
    chalk.yellow("Frontend served from /public (vpn.html & dashboard.html)")
  );
  console.log(chalk.gray("------------------------------------------------------------\n"));
});
