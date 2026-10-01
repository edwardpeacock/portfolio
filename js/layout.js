/* Shared header, footer, greeting. */
(function () {
  const S = window.SITE;
  const links = [["index.html","Home"],["work.html","Work"],["about.html","About"],["contact.html","Contact"]];
  // Hosts like Cloudflare Pages serve /about.html as /about, so compare names without ".html".
  const strip = s => s.replace(/\.html$/, "");
  const page = strip(location.pathname.split("/").pop() || "index");
  const current = page === "project" ? "work" : page;

  const header = document.getElementById("site-header");
  if (header) {
    header.innerHTML = `<div class="bar">
      <a class="brand" href="index.html">${S.name}</a>
      <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
      <nav id="nav">${links.map(([h,t]) => `<a href="${h}"${strip(h)===current?' aria-current="page"':""}>${t}</a>`).join("")}</nav></div>`;
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
    g.textContent = hello + ", welcome to my website!";
  }
})();

/* Old-school mouse click sound (synthesised), page fade, custom cursor, video fitting. */
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
    if (norm(u.pathname) === norm(location.pathname) && u.search === location.search) return;
    e.preventDefault();
    if (document.body.classList.contains("leaving")) return;
    document.body.classList.add("leaving");
    setTimeout(() => { location.href = u.href; }, 420);
  });
  window.addEventListener("pageshow", e => { if (e.persisted) document.body.classList.remove("leaving"); });

  // Custom cursor: liquid-glass lens (mouse devices only)
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const root = document.documentElement;
    // Lens map: flat in the middle, bending only through the outer bevel (like the Liquid Glass pill)
    const N = 128, cv = document.createElement("canvas"); cv.width = cv.height = N;
    const cx = cv.getContext("2d"), px = cx.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const nx = (i + 0.5) / N * 2 - 1, ny = (j + 0.5) / N * 2 - 1, r = Math.hypot(nx, ny);
      let dx = 0, dy = 0;
      if (r > 0.001) { const m = Math.pow(Math.min(1, Math.max(0, (r - 0.58) / 0.42)), 1.6); dx = nx / r * m; dy = ny / r * m; }
      const k = (j * N + i) * 4;
      px.data[k] = 128 + dx * 127; px.data[k + 1] = 128 + dy * 127; px.data[k + 2] = 128; px.data[k + 3] = 255;
    }
    cx.putImageData(px, 0, 0);
    const uri = cv.toDataURL("image/png");
    const defs = document.createElement("div");
    defs.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="lg-distort" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage href="${uri}" preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="32" xChannelSelector="R" yChannelSelector="G" result="dR"/><feColorMatrix in="dR" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="R"/><feDisplacementMap in="SourceGraphic" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G" result="dG"/><feColorMatrix in="dG" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="G"/><feDisplacementMap in="SourceGraphic" in2="map" scale="24" xChannelSelector="R" yChannelSelector="G" result="dB"/><feColorMatrix in="dB" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="B"/><feBlend in="R" in2="G" mode="screen" result="RG"/><feBlend in="RG" in2="B" mode="screen"/></filter></svg>`;
    document.body.appendChild(defs.firstChild);

    const dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "cur-dot"; ring.className = "cur-ring"; ring.innerHTML = "<div class='ri'></div>";
    document.body.append(ring, dot); // dot sits above the glass
    let shown = false;
    window.addEventListener("mousemove", e => {
      const t = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      if (!shown) { shown = true; root.classList.add("cc"); dot.classList.add("on"); ring.classList.add("on"); }
      dot.style.transform = t; ring.style.transform = t;
    }, { passive: true });
    document.addEventListener("mouseover", e => {
      const t = e.target;
      root.classList.toggle("cc-native", !!t.closest("iframe")); // let Vimeo's own player cursor show
      ring.classList.toggle("link", !!t.closest("a, button"));
    });
    document.addEventListener("mousedown", () => ring.classList.add("down"));
    document.addEventListener("mouseup", () => ring.classList.remove("down"));
    root.addEventListener("mouseleave", () => { shown = false; dot.classList.remove("on"); ring.classList.remove("on"); root.classList.remove("cc"); });
  }

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
