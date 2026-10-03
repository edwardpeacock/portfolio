/* Tiny, very subtle particles that move with scroll.
   They only animate while the page is scrolling (and settle smoothly afterwards).
   Tweak the look with the CONFIG block below. */
(function () {
  const CONFIG = {
    density: 0.00011,       // particles per px² of screen (higher = more)
    maxParticles: 160,
    size: [0.35, 0.8],      // particle radius range (px) - very tiny
    opacity: [0.4, 0.9],  // base opacity range
    parallax: [0.08, 0.45], // how far particles travel per px scrolled (depth range)
    sway: 14,               // sideways wobble (px) as you scroll
    twinkle: 0.3,          // how much opacity shimmers with scroll (0 = none)
    idleDrift: 0,           // px/sec of constant drift; 0 = completely still unless scrolling
    color: [238, 236, 232]  // particle colour (matches --text)
  };

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = document.createElement("canvas");
  cv.id = "bg-particles";
  cv.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cv, document.body.firstChild);

  const ctx = cv.getContext("2d");
  const [r, g, b] = CONFIG.color;
  let W = 0, H = 0, dpr = 1, parts = [], raf = 0, last = 0;
  let pos = scrollY, idle = 0;                 // smoothed scroll position, idle drift offset
  const rand = (a, b2) => a + Math.random() * (b2 - a);
  const mod = (n, m) => ((n % m) + m) % m;

  function make() {
    const depth = Math.random();               // 0 = far/slow, 1 = near/fast
    return {
      x: Math.random(), y: Math.random(),      // normalised start position
      d: CONFIG.parallax[0] + depth * (CONFIG.parallax[1] - CONFIG.parallax[0]),
      r: CONFIG.size[0] + depth * (CONFIG.size[1] - CONFIG.size[0]) * (0.6 + Math.random() * 0.4),
      o: rand(CONFIG.opacity[0], CONFIG.opacity[1]),
      ph: Math.random() * Math.PI * 2,
      tw: rand(0.6, 1.4)
    };
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(CONFIG.maxParticles, Math.round(W * H * CONFIG.density));
    while (parts.length < n) parts.push(make());
    parts.length = n;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const span = H + 20;
    for (const p of parts) {
      const y = mod(p.y * H - (pos + idle) * p.d, span) - 10;
      const x = p.x * W + Math.sin(pos * 0.0035 * p.tw + p.ph) * CONFIG.sway * p.d * 2;
      const tw = 1 - CONFIG.twinkle * (0.5 + 0.5 * Math.sin(pos * 0.006 * p.tw + p.ph * 2));
      ctx.globalAlpha = p.o * tw;
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(64, now - last || 16); last = now;
    const target = scrollY;
    pos += (target - pos) * (1 - Math.exp(-dt / 140));   // eases in/out so motion stays soft
    if (CONFIG.idleDrift) idle += CONFIG.idleDrift * dt / 1000;
    draw();
    if (Math.abs(target - pos) > 0.05 || CONFIG.idleDrift) raf = requestAnimationFrame(frame);
    else { pos = target; raf = 0; draw(); }
  }

  function kick() {
    if (reduce) return;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else { pos = scrollY; kick(); }
  });
  addEventListener("pageshow", () => { pos = scrollY; draw(); });

  resize();
  if (CONFIG.idleDrift) kick();
})();
