// ============================================================
// 🖥️ SentinelVPN Dashboard Frontend (Fixed)
// ------------------------------------------------------------
// ✅ Correctly parses WebSocket data payloads
// ✅ Displays Active Clients, Messages, Bytes
// ✅ Shows live logs & throughput updates
// ============================================================

const ws = new WebSocket(`ws://${window.location.host}/ws`);

// UI elements
const elActive = document.getElementById("k_active");
const elMsgs = document.getElementById("k_msgs");
const elIn = document.getElementById("k_in");
const elOut = document.getElementById("k_out");
const elLogs = document.getElementById("logs");
const ctx = document.getElementById("throughputChart").getContext("2d");

const chartData = {
  labels: [],
  datasets: [{
    label: "Bytes/sec",
    data: [],
    borderWidth: 2,
    borderColor: "#00e0ff",
    backgroundColor: "rgba(0, 240, 255, 0.3)",
    fill: true,
    tension: 0.3
  }]
};

const chart = new Chart(ctx, {
  type: "line",
  data: chartData,
  options: {
    responsive: true,
    scales: {
      x: { ticks: { color: "#aaa" } },
      y: { beginAtZero: true, ticks: { color: "#aaa" } }
    },
    plugins: { legend: { labels: { color: "#fff" } } }
  }
});

// helper
function addLog(line) {
  const li = document.createElement("li");
  li.textContent = line;
  elLogs.prepend(li);
  while (elLogs.childElementCount > 15) elLogs.lastChild.remove();
}

// WebSocket events
ws.onopen = () => addLog("WebSocket connected ✅");

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  const type = msg.type;
  const p = msg.payload || {};

  switch (type) {
    case "init":
    case "stats":
      elActive.textContent = p.vpnClients ?? 0;
      elMsgs.textContent = p.totalMessages ?? 0;
      elIn.textContent = p.totalBytesIn ?? 0;
      elOut.textContent = p.totalBytesOut ?? 0;
      break;

    case "log": {
      const remote = p.remote || "client";
      const message = p.message || "undefined";
      addLog(`[LOG] ${remote}: ${message}`);
      break;
    }

    case "client_join":
      addLog(`Client joined: ${p.remote || "unknown"}`);
      break;

    case "client_leave":
      addLog(`Client left: ${p.remote || "unknown"}`);
      break;

    case "throughput": {
      const bytes = p.bytes ?? 0;
      const label = new Date(msg.ts).toLocaleTimeString();
      chart.data.labels.push(label);
      chart.data.datasets[0].data.push(bytes);
      if (chart.data.labels.length > 25) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }
      chart.update();
      break;
    }

    case "error":
      addLog(`⚠️ Error: ${p.details || p.error || "Unknown error"}`);
      break;

    default:
      // optional: console.log("Unhandled:", msg);
      break;
  }
};

ws.onclose = () => addLog("WebSocket disconnected ❌");
ws.onerror = (err) => addLog(`WebSocket error ⚠️ ${err.message}`);
