const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
const el = (id) => document.getElementById(id);
const kActive = el('k_active'), kMsgs = el('k_msgs'), kIn = el('k_in'), kOut = el('k_out');
const logs = el('logs');

const tCtx = document.getElementById('throughputChart').getContext('2d');
const tData = {
  labels: [],
  datasets: [{ label: 'Bytes/sec', data: [] }]
};
const throughputChart = new Chart(tCtx, {
  type: 'line',
  data: tData,
  options: { responsive: true, animation: false, scales:{x:{title:{display:false}}, y:{beginAtZero:true}}}
});

function addLog(text){
  const li = document.createElement('li');
  li.textContent = text;
  logs.prepend(li);
  while (logs.childNodes.length > 200) logs.removeChild(logs.lastChild);
}

ws.onopen = () => addLog('WebSocket connected ✅');
ws.onclose = () => addLog('WebSocket disconnected ❌');

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === 'heartbeat') {
    kActive.textContent = msg.activeTCPClients;
    kMsgs.textContent = msg.totalMessages;
    kIn.textContent   = msg.totalBytesIn;
    kOut.textContent  = msg.totalBytesOut;
  } else if (msg.type === 'log') {
    addLog(`[LOG] ${msg.remote}: ${msg.message}`);
  } else if (msg.type === 'error') {
    addLog(`[ERROR] ${msg.remote}: ${msg.details}`);
  } else if (msg.type === 'client_join') {
    addLog(`Client joined: ${msg.remote}`);
  } else if (msg.type === 'client_leave') {
    addLog(`Client left: ${msg.remote}`);
  } else if (msg.type === 'throughput') {
    const ts = new Date(msg.t * 1000).toLocaleTimeString();
    tData.labels.push(ts);
    tData.datasets[0].data.push(msg.bytes);
    if (tData.labels.length > 60) { tData.labels.shift(); tData.datasets[0].data.shift(); }
    throughputChart.update();
  }
};
