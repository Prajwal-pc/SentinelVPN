// ============================================================
// 🛡️ SentinelVPN Dashboard Script v5 (Final Stable Build)
// ------------------------------------------------------------
// 🔗 Connects to dashboard_server.js (ws://localhost:8080/ws)
// ✅ Real-time logs, metrics, reconnects, and uptime tracking
// 🌌 Animated footer + Cyber Particle Network Background
// ============================================================

// ============================================================
// 1️⃣ Typing Footer Animation
// ============================================================
const footerText = "SentinelVPN v5.0 | AI-Powered Network Guardian";
const footerEl = document.querySelector(".footer-text");
let charIndex = 0;

function typeFooter() {
  if (charIndex < footerText.length) {
    footerEl.textContent += footerText.charAt(charIndex);
    charIndex++;
    setTimeout(typeFooter, 50);
  }
}
typeFooter();

// ============================================================
// 2️⃣ DOM References
// ============================================================
const vpnStatus = document.getElementById("vpn-status");
const statsBox = document.getElementById("stats-box");
const logBox = document.getElementById("log-box");
const connectBtn = document.getElementById("startBtn");
const monitorBtn = document.getElementById("monitorToggle");
const dashboardBtn = document.getElementById("dashboardBtn");

// ============================================================
// 3️⃣ WebSocket Connection Handler (Dynamic + Auto-Reconnect)
// ============================================================
let ws;
let reconnectAttempts = 0;

function connectWebSocket() {
  const wsURL = `ws://${window.location.host}/ws`;
  console.log(`🌐 Connecting WebSocket → ${wsURL}`);
  ws = new WebSocket(wsURL);

  ws.onopen = () => {
    vpnStatus.textContent = "🟢 Connected to Dashboard Server";
    vpnStatus.style.color = "#00ff88";
    reconnectAttempts = 0;
    addLog("✅ WebSocket connected to dashboard bridge.");
  };

  ws.onclose = () => {
    vpnStatus.textContent = "🔴 Disconnected from Dashboard Server";
    vpnStatus.style.color = "#ff5555";

    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 30000);
    reconnectAttempts++;
    addLog(`⚠️ Connection lost. Retrying in ${delay / 1000}s...`);
    console.warn(`Reconnecting in ${delay / 1000}s...`);
    setTimeout(connectWebSocket, delay);
  };

  ws.onerror = (err) => {
    console.error("⚠️ WebSocket Error:", err);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleDashboardUpdate(msg);
    } catch (err) {
      console.error("❌ WS Parse Error:", err);
    }
  };
}

connectWebSocket();

// ============================================================
// 4️⃣ Handle Dashboard Data (from dashboard_server.js)
// ============================================================
function handleDashboardUpdate(msg) {
  const { type, payload } = msg;

  switch (type) {
    case "init":
    case "stats":
      updateStats(payload);
      break;

    case "log":
      addLog(`[LOG] ${payload.remote || "client"}: ${payload.message || ""}`);
      break;

    case "client_join":
      addLog(`🟢 Client joined: ${payload.remote || "unknown"}`);
      break;

    case "client_leave":
      addLog(`🔴 Client left: ${payload.remote || "unknown"}`);
      break;

    case "throughput":
      addLog(`📊 Throughput: ${payload.bytes || 0} bytes/sec`);
      break;

    case "error":
      addLog(`⚠️ Error: ${payload.details || payload.error || "Unknown error"}`);
      break;

    default:
      console.log("📩 Unknown WS message:", msg);
  }
}

// ============================================================
// 5️⃣ Stats + Logs Renderer (Live Updates)
// ============================================================
function updateStats(data = {}) {
  const uptime = data.startedAt
    ? `${((Date.now() - data.startedAt) / 1000).toFixed(1)}s`
    : `${data.uptime || 0}s`;

  statsBox.innerHTML = `
    <p>🕓 Uptime: <b>${uptime}</b></p>
    <p>🧠 Active VPN Clients: <b>${data.vpnClients || 0}</b></p>
    <p>📦 Total Messages: <b>${data.totalMessages || 0}</b></p>
    <p>⬆️ Bytes In: <b>${data.totalBytesIn || 0}</b></p>
    <p>⬇️ Bytes Out: <b>${data.totalBytesOut || 0}</b></p>
  `;

  if (Array.isArray(data.logs)) {
    logBox.innerHTML = data.logs
      .map((line) =>
        typeof line === "string"
          ? sanitize(line)
          : `${sanitize(line.remote)}: ${sanitize(line.message)}`
      )
      .join("<br>");
    logBox.scrollTop = logBox.scrollHeight;
  }
}

// ============================================================
// 6️⃣ Logging Utility
// ============================================================
function addLog(text) {
  const p = document.createElement("p");
  p.textContent = text;
  logBox.appendChild(p);
  logBox.scrollTop = logBox.scrollHeight;
}

function sanitize(str = "") {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============================================================
// 7️⃣ Control Buttons (Manual Simulation)
// ============================================================
connectBtn.addEventListener("click", () => {
  vpnStatus.textContent = "🟡 Connecting...";
  vpnStatus.style.color = "#ffaa00";
  setTimeout(() => {
    vpnStatus.textContent = "🟢 Connected ✅";
    vpnStatus.style.color = "#00ff88";
  }, 1000);
});

dashboardBtn.addEventListener("click", () => {
  alert("You are already on the SentinelVPN Dashboard ✅");
});

monitorBtn.addEventListener("click", () => {
  const fakeLogs = [
    "🔄 Initializing Sentinel Engine...",
    "🧩 Encrypting packets...",
    "🤖 AI analyzing network flow...",
    "✅ Safe traffic detected.",
    "⚠️ Suspicious IP flagged.",
    "🚫 Threat contained.",
    "🛡️ System stable and secure ✅",
  ];
  logBox.innerHTML = "";
  fakeLogs.forEach((line, i) => {
    setTimeout(() => addLog(line), i * 800);
  });
});

// ============================================================
// 8️⃣ Cyber Particle Network Animation
// ============================================================
const canvas = document.getElementById("network-bg");
const ctx = canvas.getContext("2d");
let particles = [];
const numParticles = 80;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

class Particle {
  constructor(x, y, dx, dy, size) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.size = size;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 245, 255, 0.8)";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00f5ff";
    ctx.fill();
  }
  update() {
    if (this.x < 0 || this.x > canvas.width) this.dx = -this.dx;
    if (this.y < 0 || this.y > canvas.height) this.dy = -this.dy;
    this.x += this.dx;
    this.y += this.dy;
    this.draw();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < numParticles; i++) {
    const size = Math.random() * 2 + 1;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const dx = (Math.random() - 0.5) * 0.8;
    const dy = (Math.random() - 0.5) * 0.8;
    particles.push(new Particle(x, y, dx, dy, size));
  }
}
initParticles();

function connectParticles() {
  for (let a = 0; a < particles.length; a++) {
    for (let b = a + 1; b < particles.length; b++) {
      const dx = particles[a].x - particles[b].x;
      const dy = particles[a].y - particles[b].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.strokeStyle = `rgba(0, 245, 255, ${1 - dist / 120})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p) => p.update());
  connectParticles();
  requestAnimationFrame(animate);
}
animate();
