// ============================================================
// 🔒 SentinelVPN Core Socket Server (Final Integrated Build)
// ------------------------------------------------------------
// ✅ Features:
// 1. Real-time TCP <-> WebSocket bridge for dashboard updates
// 2. AES-256-CBC encryption (Python-compatible)
// 3. Active client tracking, message + byte counters
// 4. Per-second throughput broadcast for charts
// 5. Error handling, heartbeats, and log streaming
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import http from 'http';
import net from 'net';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- Path Setup ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Config ----------
const HTTP_PORT = Number(process.env.HTTP_PORT || 9091);
const TCP_PORT = Number(process.env.TCP_PORT || 9000);

// AES-256-CBC CONFIG
const KEY_PASSPHRASE = process.env.SECRET_KEY || 'sentinelvpn-dev-key';
const IV_PASSPHRASE = process.env.SECRET_IV || 'sentinelvpn-dev-iv';
const KEY = crypto.createHash('sha256').update(KEY_PASSPHRASE).digest(); // 32 bytes
const IV = crypto.createHash('md5').update(IV_PASSPHRASE).digest(); // 16 bytes

// ---------- State & Metrics ----------
const state = {
  startedAt: new Date(),
  activeTCPClients: 0,
  totalMessages: 0,
  totalBytesIn: 0,
  totalBytesOut: 0,
  lastMessageAt: null,
  perSecond: { t: 0, count: 0, bytes: 0 },
};

// ---------- Utility Functions ----------
function decryptBase64AES256CBC(b64) {
  try {
    const buf = Buffer.from(b64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
    const dec = Buffer.concat([decipher.update(buf), decipher.final()]);
    return dec.toString('utf8');
  } catch (err) {
    console.error("❌ AES Decrypt Error:", err.message);
    return null;
  }
}

function encryptBase64AES256CBC(plaintext) {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
  const enc = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);
  return enc.toString('base64');
}

// ---------- Express Setup ----------
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static dashboard (optional)
const dashboardDir = path.join(__dirname, 'dashboard');
app.use('/', express.static(dashboardDir));

// Health check
app.get('/status', (_req, res) => {
  res.json({
    ok: true,
    startedAt: state.startedAt,
    activeTCPClients: state.activeTCPClients,
    totalMessages: state.totalMessages,
    totalBytesIn: state.totalBytesIn,
    totalBytesOut: state.totalBytesOut,
    lastMessageAt: state.lastMessageAt,
    uptimeSeconds: Math.floor(
      (Date.now() - state.startedAt.getTime()) / 1000
    ),
  });
});

const server = http.createServer(app);

// ---------- WebSocket Setup ----------
const wss = new WebSocketServer({ server, path: '/ws' });

// Broadcast helper
function broadcast(type, payload = {}) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

// ---------- Heartbeat + Throughput ----------
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  if (state.perSecond.t === 0) state.perSecond.t = now;

  if (now !== state.perSecond.t) {
    broadcast('throughput', {
      second: state.perSecond.t,
      messages: state.perSecond.count,
      bytes: state.perSecond.bytes,
    });
    state.perSecond = { t: now, count: 0, bytes: 0 };
  }

  // Realtime heartbeat → keeps dashboard in sync
  broadcast('heartbeat', {
    activeTCPClients: state.activeTCPClients,
    totalMessages: state.totalMessages,
    totalBytesIn: state.totalBytesIn,
    totalBytesOut: state.totalBytesOut,
  });
}, 1000);

// ---------- TCP Server (Python Client Tunnel) ----------
const tcpServer = net.createServer((socket) => {
  state.activeTCPClients++;
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`🔌 Client connected: ${remote}`);
  broadcast('client_join', { remote });

  let lineBuf = '';

  socket.on('data', (chunk) => {
    // Update metrics
    state.totalBytesIn += chunk.length;
    state.lastMessageAt = new Date();
    state.perSecond.bytes += chunk.length;

    // Accumulate until newline (framed message)
    lineBuf += chunk.toString('utf8');
    let idx;
    while ((idx = lineBuf.indexOf('\n')) !== -1) {
      const line = lineBuf.slice(0, idx).trim();
      lineBuf = lineBuf.slice(idx + 1);

      if (!line) continue;
      state.totalMessages++;
      state.perSecond.count++;

      const plaintext = decryptBase64AES256CBC(line);
      if (!plaintext) {
        broadcast('error', { remote, error: 'decrypt_failed' });
        continue;
      }

      // Log + broadcast message preview
      const safeMsg =
        plaintext.length > 200 ? plaintext.slice(0, 200) + '…' : plaintext;
      console.log(`💬 ${remote} → ${safeMsg}`);
      broadcast('log', { remote, message: safeMsg });

      // Send real-time stats update
      broadcast('stats_update', {
        activeTCPClients: state.activeTCPClients,
        totalMessages: state.totalMessages,
        totalBytesIn: state.totalBytesIn,
        totalBytesOut: state.totalBytesOut,
        lastMessageAt: state.lastMessageAt,
      });

      // Encrypted ACK
      const ack = JSON.stringify({
        ok: true,
        receivedBytes: Buffer.byteLength(plaintext, 'utf8'),
        at: Date.now(),
      });
      const encAck = encryptBase64AES256CBC(ack) + '\n';
      state.totalBytesOut += Buffer.byteLength(encAck, 'utf8');
      socket.write(encAck);
    }
  });

  socket.on('close', () => {
    console.log(`❌ Client disconnected: ${remote}`);
    state.activeTCPClients--;
    broadcast('client_leave', { remote });
    broadcast('stats_update', {
      activeTCPClients: state.activeTCPClients,
      totalMessages: state.totalMessages,
      totalBytesIn: state.totalBytesIn,
      totalBytesOut: state.totalBytesOut,
    });
  });

  socket.on('error', (err) => {
    console.error(`⚠️ TCP error (${remote}):`, err.message);
    broadcast('error', { remote, error: 'tcp_error', details: err.message });
  });
});

// ---------- Start Servers ----------
tcpServer.listen(TCP_PORT, () => {
  console.log(`🔒 TCP server for VPN client listening on :${TCP_PORT}`);
});

server.listen(HTTP_PORT, () => {
  console.log(`🌐 Dashboard running → http://localhost:${HTTP_PORT}`);
  console.log(`📡 WebSocket active → ws://localhost:${HTTP_PORT}/ws`);
});
