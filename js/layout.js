/* Shared header, footer, greeting. */
(function () {
  const S = window.SITE;
  const links = [["index.html","Home"],["work.html","Work"],["info.html","About me"]];
  // Hosts like Cloudflare Pages serve /about.html as /about, so compare names without ".html".
  const strip = s => s.replace(/\.html$/, "");
  const page = strip(location.pathname.split("/").pop() || "index");
  const current = page === "project" ? "work" : page;

  const header = document.getElementById("site-header");
  if (header) {
    header.innerHTML = `<div class="bar">
      <div class="brand"><div class="brand-line"><span class="brand-name">${S.name}</span><span class="brand-tail"><span class="brand-sep" aria-hidden="true">|</span><span class="brand-role">${S.role}</span></span></div>
        <div class="brand-status"><span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>London, UK</span><span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/></svg>Available for Junior Compositor roles</span></div>
        <a class="home-btn" href="index.html" aria-label="Home"${current === "index" ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg></a></div>
      <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
      <nav id="nav">${links.map(([h,t]) => `<a href="${h}"${strip(h)===current?' aria-current="page"':""}>${t}</a>`).join("")}</nav></div>`;
    const btn = header.querySelector(".menu-btn");
    btn.addEventListener("click", () => {
      const open = header.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
      document.body.classList.toggle("menu-open", open);
    });
  }

  // Scrolled: the name shrinks slightly and the role line fades away (see .scrolled in style.css)
  const onScroll = () => document.body.classList.toggle("scrolled", window.scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const footer = document.getElementById("site-footer");
  const icoSvg = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ico = {
    LinkedIn: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    Instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
    Mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'
  };
  const contactBtns = S.socials.map(x => `<a class="btn" href="${x.url}" target="_blank" rel="noopener">${icoSvg(ico[x.label] || "")}<span>${x.label}</span></a>`).join("")
    + `<a class="btn" href="mailto:${S.email}">${icoSvg(ico.Mail)}<span>${S.email}</span></a>`;
  if (footer) footer.innerHTML = `<div class="wrap foot">
    <p>${S.name}, ${S.role}</p>
    <button class="sound-btn" type="button" aria-pressed="true"></button>
    <div class="foot-contact"><h2 class="foot-title">Contact info</h2><div class="actions">${contactBtns}</div></div></div>`;

  const g = document.getElementById("greeting");
  if (g) {
    // Uses the visitor's own clock, so it follows their time zone.
    const h = new Date().getHours();
    const hello = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    g.textContent = hello + ", welcome to my website!";
  }
})();

/* Old-school mouse click sound (synthesised), page fade, video fitting. */
(function () {
  const icon = on => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>${on ? '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' : '<line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'}</svg>`;
  let muted = false;
  try { muted = localStorage.getItem("sfx") === "off"; } catch (e) {}

  // Synthesised microswitch click: a sharp "click" with a dull plastic thunk, then a lighter release click.
  let ctx, master;
  function audioReady() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.85;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 8000;
      const comp = ctx.createDynamicsCompressor();
      const out = ctx.createGain(); out.gain.value = 0.6; // 40% quieter than before
      master.connect(lp); lp.connect(comp); comp.connect(out); out.connect(ctx.destination);
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
  const prime = () => { if (!muted) { try { audioReady(); } catch (e) {} } };
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
    const norm = p => p.replace(/\/index(\.html)?$/, "/").replace(/\.html$/, "");
    if (norm(u.pathname) === norm(location.pathname) && u.search === location.search) {
      // Already on this page: don't reload (that cut the click sound off); just glide back to the top. Links with a #hash use the normal in-page jump.
      if (!u.hash) { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }
      return;
    }
    e.preventDefault();
    if (document.body.classList.contains("leaving")) return;
    document.body.classList.add("leaving");
    setTimeout(() => { location.href = u.href; }, 420);
  });
  window.addEventListener("pageshow", e => { if (e.persisted) document.body.classList.remove("leaving"); });

  // Size videos so the whole frame fits on screen: measure the space above each video.
  const fit = () => {
    const set = (box, v) => box.style.setProperty("--chrome", (v.getBoundingClientRect().top + window.scrollY) + "px");
    document.querySelectorAll(".wrap.wide>.video").forEach(v => set(v, v));
    document.querySelectorAll(".reel-wrap").forEach(w => { const v = w.querySelector("#reel"); if (v) set(w, v); });
  };
  document.addEventListener("DOMContentLoaded", fit);
  window.addEventListener("load", fit);
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
