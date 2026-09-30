/* Shared header, footer, greeting. */
(function () {
  const S = window.SITE;
  const links = [["index.html","Home"],["work.html","Work"],["about.html","About"],["contact.html","Contact"]];
  const page = location.pathname.split("/").pop() || "index.html";
  const current = page === "project.html" ? "work.html" : page;

  const header = document.getElementById("site-header");
  if (header) {
    header.innerHTML = `<div class="bar">
      <a class="brand" href="index.html">${S.name}</a>
      <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
      <nav id="nav">${links.map(([h,t]) => `<a href="${h}"${h===current?' aria-current="page"':""}>${t}</a>`).join("")}</nav></div>`;
    const btn = header.querySelector(".menu-btn");
    btn.addEventListener("click", () => {
      const open = header.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
  }

  const footer = document.getElementById("site-footer");
  if (footer) footer.innerHTML = `<div class="wrap foot">
    <p>${S.name}, ${S.role}</p>
    <button class="sound-btn" type="button" aria-pressed="true"></button>
    <p><a href="mailto:${S.email}">${S.email}</a></p></div>`;

  const g = document.getElementById("greeting");
  if (g) {
    // Uses the visitor's own clock, so it follows their time zone.
    const h = new Date().getHours();
    const hello = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const lines = [[g, hello + ", welcome to my website!"],
                   [document.getElementById("greeting-sub"), "Here you will find my most up to date work."]];
    let n = 0;
    const glitchEls = [];
    lines.forEach(([el, text]) => {
      if (!el) return;
      el.setAttribute("aria-label", text);
      el.textContent = "";
      const wrap = document.createElement("span");
      wrap.className = "glitch"; wrap.dataset.text = text; wrap.setAttribute("aria-hidden", "true");
      text.split(" ").forEach((word, wi, arr) => {
        const w = document.createElement("span"); w.className = "w";
        [...word].forEach(c => {
          const s = document.createElement("span"); s.className = "ch"; s.textContent = c;
          s.style.setProperty("--d", Math.round(Math.random() * 900 + n * 18)); n++;
          w.appendChild(s);
        });
        wrap.appendChild(w);
        if (wi < arr.length - 1) wrap.appendChild(document.createTextNode(" "));
      });
      el.appendChild(wrap); glitchEls.push(wrap);
    });
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const burst = el => { el.classList.add("burst"); setTimeout(() => el.classList.remove("burst"), 450); };
      const loop = () => {
        glitchEls.forEach((el, i) => setTimeout(() => burst(el), i * 120));
        setTimeout(loop, 2800 + Math.random() * 3200);
      };
      setTimeout(loop, 2600);
      glitchEls.forEach(el => el.addEventListener("mouseenter", () => burst(el)));
    }
  }
})();

/* Old-school mouse click sound, page fade, custom cursor, video fitting.
   Sound: if you add assets/click.mp3 (or .wav / .ogg) that file is used; otherwise a synthesised mechanical click plays. */
(function () {
  const icon = on => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>${on ? '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' : '<line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'}</svg>`;
  let muted = false;
  try { muted = localStorage.getItem("sfx") === "off"; } catch (e) {}

  let sample = null;
  try {
    const probe = document.createElement("audio");
    probe.preload = "auto";
    probe.innerHTML = '<source src="assets/click.mp3" type="audio/mpeg"><source src="assets/click.wav" type="audio/wav"><source src="assets/click.ogg" type="audio/ogg">';
    probe.addEventListener("canplaythrough", () => { sample = probe; }, { once: true });
    probe.load();
  } catch (e) {}

  // Synthesised microswitch click: a sharp "click" with a dull plastic thunk, then a lighter release click.
  let ctx, master;
  function audioReady() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.85;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 8000;
      const comp = ctx.createDynamicsCompressor();
      master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  }
  function snap(at, dur, freq, q, gain) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(master); s.start(at);
  }
  function thunk(at, f0, f1, peak, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak, at + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + dur + 0.02);
  }
  function play() {
    if (muted) return;
    if (sample) {
      try { const a = sample.cloneNode(true); a.volume = 0.6; a.play().catch(() => {}); return; } catch (e) {}
    }
    try {
      audioReady();
      const v = 0.96 + Math.random() * 0.08, t = ctx.currentTime + 0.005;
      snap(t, 0.016, 3300 * v, 0.9, 0.9);      // button press: sharp click
      snap(t, 0.005, 7000 * v, 1, 0.35);       // bright transient
      thunk(t, 190 * v, 80, 0.3, 0.05);        // plastic body
      snap(t + 0.09, 0.011, 3900 * v, 1, 0.45); // release click
      thunk(t + 0.09, 240 * v, 120, 0.1, 0.035);
    } catch (e) {}
  }
  const prime = () => { if (!sample && !muted) { try { audioReady(); } catch (e) {} } };
  document.addEventListener("pointerdown", prime, { once: true });
  document.addEventListener("keydown", prime, { once: true });

  const btn = document.querySelector(".sound-btn");
  const paint = () => {
    if (!btn) return;
    btn.innerHTML = icon(!muted) + `<span>Sound ${muted ? "off" : "on"}</span>`;
    btn.setAttribute("aria-pressed", String(!muted));
  };
  paint();

  document.addEventListener("click", e => {
    if (btn && e.target.closest(".sound-btn")) {
      muted = !muted;
      try { localStorage.setItem("sfx", muted ? "off" : "on"); } catch (err) {}
      paint(); play(); return;
    }
    const el = e.target.closest("a, button");
    if (!el) return;
    play();

    // Fade the page out, then go to the next one
    const a = el.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (u.protocol !== location.protocol || u.host !== location.host) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    e.preventDefault();
    if (document.body.classList.contains("leaving")) return;
    document.body.classList.add("leaving");
    setTimeout(() => { location.href = u.href; }, 420);
  });
  window.addEventListener("pageshow", e => { if (e.persisted) document.body.classList.remove("leaving"); });

  // Custom cursor (mouse devices only)
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const root = document.documentElement;
    const dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "cur-dot"; ring.className = "cur-ring"; ring.innerHTML = "<div class='ri'><span></span></div>";
    document.body.append(dot, ring);
    const label = ring.querySelector("span");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = -100, y = -100, rx = -100, ry = -100, shown = false;
    window.addEventListener("mousemove", e => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; rx = x; ry = y; root.classList.add("cc"); dot.classList.add("on"); ring.classList.add("on"); }
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
    }, { passive: true });
    (function loop() {
      rx += (x - rx) * (still ? 1 : 0.18); ry += (y - ry) * (still ? 1 : 0.18);
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", e => {
      const t = e.target;
      root.classList.toggle("cc-native", !!t.closest("iframe")); // let Vimeo's own player cursor show
      ring.classList.toggle("link", !!t.closest("a, button"));
      const text = t.closest(".card") ? "View" : t.closest(".play") ? "Play" : "";
      label.textContent = text; ring.classList.toggle("label", !!text);
    });
    document.addEventListener("mousedown", () => ring.classList.add("down"));
    document.addEventListener("mouseup", () => ring.classList.remove("down"));
    root.addEventListener("mouseleave", () => { shown = false; dot.classList.remove("on"); ring.classList.remove("on"); root.classList.remove("cc"); });
  }

  // Size videos so the whole frame fits on screen: measure the space above each video.
  const fit = () => document.querySelectorAll(".wrap.wide>.video, .wrap.wide>#reel").forEach(v =>
    v.style.setProperty("--chrome", (v.getBoundingClientRect().top + window.scrollY) + "px"));
  document.addEventListener("DOMContentLoaded", fit);
  window.addEventListener("load", fit);
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
