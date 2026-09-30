/* Shared header, footer, greeting. */
(function () {
  const S = window.SITE;
  const links = [["index.html","Home"],["showreel.html","Showreel"],["work.html","Work"],["about.html","About"],["contact.html","Contact"]];
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

/* Click sounds and page fade.
   Sound: if you add assets/click.mp3 (or .wav / .ogg) that file is used; otherwise a soft synthesised tap plays. */
(function () {
  const icon = on => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>${on ? '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' : '<line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'}</svg>`;
  let muted = false;
  try { muted = localStorage.getItem("sfx") === "off"; } catch (e) {}

  // Optional sound file. The browser tries each format in turn and ignores ones that are missing.
  let sample = null;
  try {
    const probe = document.createElement("audio");
    probe.preload = "auto";
    probe.innerHTML = '<source src="assets/click.mp3" type="audio/mpeg"><source src="assets/click.wav" type="audio/wav"><source src="assets/click.ogg" type="audio/ogg">';
    probe.addEventListener("canplaythrough", () => { sample = probe; }, { once: true });
    probe.load();
  } catch (e) {}

  // Synth: two soft layers with a gentle attack and a smooth decay, so nothing clicks or cuts off.
  let ctx, master;
  function audioReady() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.9;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200;
      const comp = ctx.createDynamicsCompressor();
      master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  }
  function voice(type, f0, f1, peak, dur, at) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur * 0.7);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + dur + 0.03);
  }
  function play(pitch) {
    if (muted) return;
    if (sample) {
      try { const a = sample.cloneNode(true); a.volume = 0.5; a.play().catch(() => {}); return; } catch (e) {}
    }
    try {
      audioReady();
      const t = ctx.currentTime + 0.005, f = 620 * pitch * (0.97 + Math.random() * 0.06);
      voice("sine", f, f * 0.5, 0.22, 0.17, t);            // soft body of the tap
      voice("triangle", f * 2.6, f * 1.6, 0.05, 0.07, t);  // light top edge
      voice("sine", f * 1.3, f * 0.8, 0.07, 0.1, t + 0.06); // quiet release
    } catch (e) {}
  }
  // Wake the audio system on the first touch so the first click isn't late.
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
      paint(); play(1.1); return;
    }
    const el = e.target.closest("a, button");
    if (!el) return;
    if (el.closest("nav, .brand, .menu-btn")) play(1.15);
    else if (el.classList.contains("btn")) play(1.3);
    else if (el.classList.contains("play")) play(0.8);
    else play(1);

    // Fade the page out, then go to the next one (long enough for the sound to finish)
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
})();
