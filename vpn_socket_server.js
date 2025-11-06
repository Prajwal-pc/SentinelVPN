// ============================================================
// 🔒 SentinelVPN Encrypted Tunnel Server (FINAL v12 - Binary Mode)
// ============================================================

const net = require("net");
const crypto = require("crypto");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

let chalk;
try { chalk = require("chalk"); } catch { chalk = new Proxy({}, { get: () => (x) => x }); }

// ============================================================
// AES CONFIGURATION
// ============================================================
const SECRET_KEY = Buffer.from("SentinelVPNKey32BytesSecure!!!!!", "utf8");
const BLOCK_SIZE = 16;

function pad(buffer) {
  const padLen = BLOCK_SIZE - (buffer.length % BLOCK_SIZE);
  const pad = Buffer.alloc(padLen, padLen);
  return Buffer.concat([buffer, pad]);
}

function unpad(buffer) {
  const padLen = buffer[buffer.length - 1];
  return buffer.slice(0, buffer.length - padLen);
}

function encryptBinary(buffer) {
  const cipher = crypto.createCipheriv("aes-256-ecb", SECRET_KEY, null);
  cipher.setAutoPadding(false); // ✅ disable built-in padding
  return Buffer.concat([cipher.update(pad(buffer)), cipher.final()]);
}

function decryptBinary(buffer) {
  const decipher = crypto.createDecipheriv("aes-256-ecb", SECRET_KEY, null);
  decipher.setAutoPadding(false); // ✅ disable built-in unpadding
  const dec = Buffer.concat([decipher.update(buffer), decipher.final()]);
  return unpad(dec);
}

// ============================================================
// SMART URL SANITIZER
// ============================================================
function sanitizeUrl(raw) {
  if (!raw) return "";
  let url = raw.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g, "").trim();
  if (/^https?:[^/]/i.test(url)) url = url.replace(/^https?:/, (m) => m + "//");
  if (!/^https?:\/\//i.test(url) && /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(url)) url = "https://" + url;
  return url;
}

// ============================================================
// MAIN HANDLER
// ============================================================
async function handleMessage(base64Chunk, socket) {
  try {
    console.log(chalk.yellow(`🧠 Received encrypted Base64 (${base64Chunk.length} chars)`));

    const encryptedBuffer = Buffer.from(base64Chunk, "base64");
    console.log(chalk.gray(`🔍 Ciphertext size: ${encryptedBuffer.length} bytes`));

    const decryptedBuffer = decryptBinary(encryptedBuffer);
    console.log(chalk.gray(`🧩 Decrypted buffer length: ${decryptedBuffer.length}`));

    const rawUrl = decryptedBuffer.toString("utf8").replace(/\x00/g, "").trim();
    console.log(chalk.cyan(`🌐 Raw decrypted URL: '${rawUrl}'`));

    const url = sanitizeUrl(rawUrl);
    if (!/^https?:\/\//i.test(url)) throw new Error(`Invalid URL — received '${url}'`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const text = await res.text();
    const encRes = encryptBinary(Buffer.from(text, "utf8")).toString("base64");
    socket.write(encRes + "\n");

    console.log(chalk.magenta(`📤 Sent ${text.length} bytes (status ${res.status})`));
  } catch (err) {
    console.error(chalk.red(`❌ Error: ${err.message}`));
    const msg = encryptBinary(Buffer.from(`Error fetching URL: ${err.message}`, "utf8")).toString("base64");
    socket.write(msg + "\n");
  }
}

// ============================================================
// SERVER STARTUP
// ============================================================
const server = net.createServer((socket) => {
  console.log(chalk.green("🟢 Client connected"));
  let buffer = "";

  socket.on("data", async (chunk) => {
    buffer += chunk.toString("utf8");
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const msg = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (msg) await handleMessage(msg, socket);
    }
  });

  socket.on("close", () => console.log(chalk.yellow("🔴 Client disconnected")));
  socket.on("error", (err) => console.error(chalk.red(`⚠️ Socket error: ${err.message}`)));
});

server.listen(9090, "127.0.0.1", () => console.log(chalk.greenBright("🚀 SentinelVPN running on port 9090")));
