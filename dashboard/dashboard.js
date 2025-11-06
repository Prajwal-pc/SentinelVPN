const ws = new WebSocket("ws://localhost:8080");

const ctx = document.getElementById("trafficChart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Bytes Sent", data: [], borderWidth: 2 },
      { label: "Bytes Received", data: [], borderWidth: 2 }
    ]
  },
  options: {
    scales: { y: { beginAtZero: true } }
  }
});

ws.onmessage = event => {
  const data = JSON.parse(event.data);

  if (data.type === "stats") {
    const stats = data.payload;
    document.getElementById("clients").textContent = stats.activeConnections;
    document.getElementById("sent").textContent = stats.totalBytesSent;
    document.getElementById("received").textContent = stats.totalBytesReceived;

    // Update chart
    const now = new Date().toLocaleTimeString();
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(stats.totalBytesSent);
    chart.data.datasets[1].data.push(stats.totalBytesReceived);
    chart.update();

    // Update logs
    document.getElementById("logs").textContent = stats.logs.join("\n");
  }
};
