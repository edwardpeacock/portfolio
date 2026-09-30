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

/* Click sounds (synthesised, no files) and page transitions. */
(function () {
  const icon = on => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>${on ? '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' : '<line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'}</svg>`;
  let muted = false;
  try { muted = localStorage.getItem("sfx") === "off"; } catch (e) {}
  let ctx;

  // A soft filtered "tick" with a tiny low body. Keep gain low so it stays subtle.
  function tick(freq, gain) {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1.1;
      const g = ctx.createGain(); g.gain.value = gain;
      src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(t);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(freq / 3, t); o.frequency.exponentialRampToValueAtTime(freq / 6, t + 0.05);
      og.gain.setValueAtTime(gain * 0.5, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(og); og.connect(ctx.destination); o.start(t); o.stop(t + 0.07);
    } catch (e) {}
  }

  const btn = document.querySelector(".sound-btn");
  const paint = () => {
    if (!btn) return;
    btn.innerHTML = icon(!muted) + `<span>Sound ${muted ? "off" : "on"}</span>`;
    btn.setAttribute("aria-pressed", String(!muted));
  };
  paint();

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("click", e => {
    if (btn && e.target.closest(".sound-btn")) {
      muted = !muted;
      try { localStorage.setItem("sfx", muted ? "off" : "on"); } catch (err) {}
      paint(); tick(2000, 0.05); return;
    }
    const el = e.target.closest("a, button");
    if (!el) return;
    // Slightly different pitch per kind of element
    if (el.closest("nav, .brand, .menu-btn")) tick(2300, 0.05);
    else if (el.classList.contains("btn")) tick(2700, 0.05);
    else if (el.classList.contains("play")) tick(1700, 0.06);
    else tick(1500, 0.05);

    // Fade out, then go to the next page
    const a = el.closest("a[href]");
    if (!a || reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (u.protocol !== location.protocol || u.host !== location.host) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    e.preventDefault();
    document.body.classList.add("leaving");
    setTimeout(() => { location.href = u.href; }, 320);
  });
  window.addEventListener("pageshow", e => { if (e.persisted) document.body.classList.remove("leaving"); });
})();
