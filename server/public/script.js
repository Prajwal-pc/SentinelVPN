// vpn.js
// === Core SentinelVPN Logic ===

// -----------------------------
// 1. Footer Typing Animation
// -----------------------------
const footerText = "SentinelVPN v1.0 | Secure AI-Driven Networking";
const footerEl = document.querySelector('.footer-text');
let charIndex = 0;

function typeFooter() {
  if (charIndex < footerText.length) {
    footerEl.textContent += footerText.charAt(charIndex);
    charIndex++;
    setTimeout(typeFooter, 80);
  }
}
typeFooter();

// -----------------------------
// 2. VPN Connection Simulation
// -----------------------------
document.getElementById('startBtn').addEventListener('click', () => {
  const status = document.getElementById('vpn-status');
  status.textContent = 'Connecting...';
  status.style.color = '#ffaa00';
  setTimeout(() => {
    status.textContent = 'Connected ✅';
    status.style.color = '#00ff88';
  }, 2000);
});

// -----------------------------
// 3. Dashboard Placeholder
// -----------------------------
document.getElementById('dashboardBtn').addEventListener('click', () => {
  alert('Redirecting to SentinelVPN Dashboard...');
});

// -----------------------------
// 4. Monitoring Simulation
// -----------------------------
document.getElementById('monitorToggle').addEventListener('click', () => {
  const logBox = document.getElementById('log-box');
  const logs = [
    'Initializing VPN module...',
    'Encrypting traffic...',
    'Inspecting packets with ML model...',
    'Normal traffic detected ✅',
    '⚠️ Suspicious activity detected: Port Scan attempt!',
    'Response: Blocking malicious IP...',
    'Network secure.'
  ];

  logBox.innerHTML = '';
  logs.forEach((log, i) => {
    setTimeout(() => {
      logBox.innerHTML += `<p>${log}</p>`;
      logBox.scrollTop = logBox.scrollHeight;
    }, i * 1000);
  });
});

// -----------------------------
// 5. Cyber Grid Background Animation
// -----------------------------
const canvas = document.getElementById('network-bg');
const ctx = canvas.getContext('2d');
let particles = [];
const numParticles = 80;
let mouse = { x: null, y: null };

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

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
    ctx.fillStyle = 'rgba(0, 245, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f5ff';
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

// Initialize particles
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

// Connect particles with lines
function connectParticles() {
  for (let a = 0; a < particles.length; a++) {
    for (let b = a; b < particles.length; b++) {
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

// Track mouse movement
window.addEventListener('mousemove', (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
});

// Animate background
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => p.update());
  connectParticles();
  requestAnimationFrame(animate);
}
animate();
