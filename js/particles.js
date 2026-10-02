/* Particle background + soft diffusion glow that follows the cursor.
   Tweak the look with the CONFIG block below. */
(function () {
  const CONFIG = {
    density: 0.00006,        // particles per px² of screen (higher = more)
    maxParticles: 110,
    speed: 0.12,             // base drift speed
    size: [1.2, 3.2],        // particle radius range (px)
    linkDistance: 130,       // max distance for connecting lines
    linkOpacity: 0.12,
    color: [238, 236, 232],  // particle colour (matches --text)
    glowColor: [217, 65, 76],// cursor glow colour (matches --accent-hi)
    mouseRadius: 160,        // how far the cursor nudges particles
    cursorGlow: 0.10         // strength of the soft glow under the cursor (0 = off)
  };

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = document.createElement("canvas");
  cv.id = "bg-particles";
  cv.setAttribute("aria-hidden", "true");
  const glow = document.createElement("div");
  glow.id = "bg-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.insertBefore(glow, document.body.firstChild);
  document.body.insertBefore(cv, document.body.firstChild);

  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, parts = [], raf = 0;
  const mouse = { x: -9999, y: -9999, gx: -9999, gy: -9999, on: false };
  const [r, g, b] = CONFIG.color, [gr, gg, gb] = CONFIG.glowColor;

  // Pre-rendered soft sprite so each particle gets a glow without costly shadowBlur
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  (function () {
    const s = sprite.getContext("2d");
    const grad = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.18, `rgba(${r},${g},${b},.85)`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},.18)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    s.fillStyle = grad;
    s.fillRect(0, 0, 64, 64);
  })();

  const rand = (a, b) => a + Math.random() * (b - a);

  function make() {
    const a = Math.random() * Math.PI * 2, v = rand(0.4, 1) * CONFIG.speed;
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      r: rand(CONFIG.size[0], CONFIG.size[1]),
      o: rand(0.25, 0.8),
      ph: Math.random() * Math.PI * 2,   // twinkle phase
      tw: rand(0.4, 1.2)                 // twinkle speed
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(CONFIG.maxParticles, Math.round(W * H * CONFIG.density));
    while (parts.length < n) parts.push(make());
    parts.length = n;
    parts.forEach(p => { p.x = Math.min(p.x, W); p.y = Math.min(p.y, H); });
    if (reduce) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // Soft diffusion glow trailing the cursor
    if (CONFIG.cursorGlow > 0 && mouse.on) {
      mouse.gx += (mouse.x - mouse.gx) * 0.08;
      mouse.gy += (mouse.y - mouse.gy) * 0.08;
      const R = Math.max(260, Math.min(W, H) * 0.42);
      const gg2 = ctx.createRadialGradient(mouse.gx, mouse.gy, 0, mouse.gx, mouse.gy, R);
      gg2.addColorStop(0, `rgba(${gr},${gg},${gb},${CONFIG.cursorGlow})`);
      gg2.addColorStop(0.5, `rgba(${gr},${gg},${gb},${CONFIG.cursorGlow * 0.3})`);
      gg2.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
      ctx.fillStyle = gg2;
      ctx.fillRect(mouse.gx - R, mouse.gy - R, R * 2, R * 2);
    }

    // Move
    for (const p of parts) {
      if (!reduce) {
        p.x += p.vx; p.y += p.vy;
        if (mouse.on) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < CONFIG.mouseRadius && d > 0.1) {
            const f = (1 - d / CONFIG.mouseRadius) * 0.5;
            p.x += (dx / d) * f; p.y += (dy / d) * f;
          }
        }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      }
    }

    // Connecting lines
    const L = CONFIG.linkDistance, L2 = L * L;
    ctx.lineWidth = 1;
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y, d2 = dx * dx + dy * dy;
        if (d2 < L2) {
          ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - d2 / L2) * CONFIG.linkOpacity})`;
          ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j].x, parts[j].y); ctx.stroke();
        }
      }
    }

    // Glowing dots
    for (const p of parts) {
      const tw = reduce ? 1 : 0.65 + 0.35 * Math.sin(t * 0.001 * p.tw + p.ph);
      ctx.globalAlpha = p.o * tw;
      const s = p.r * 5;           // sprite is larger than the core so the halo shows
      ctx.drawImage(sprite, p.x - s, p.y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
  function start() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  addEventListener("resize", resize);
  addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    if (!mouse.on) { mouse.gx = e.clientX; mouse.gy = e.clientY; }
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
  }, { passive: true });
  document.addEventListener("mouseleave", () => { mouse.on = false; });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

  resize();
  start();
})();
