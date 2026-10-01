/* Renders project cards (#work-grid, optional data-limit) and the project detail page (#project). */
(function () {
  const P = window.PROJECTS;
  const EXTS = ["jpg", "png", "webp", "jpeg"];
  const pad = n => String(n).padStart(2, "0");
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const media = p => p.image ? `<img src="${p.image}" alt="${p.title}" loading="lazy">` : `<div class="ph" aria-hidden="true"></div>`;

  const grid = document.getElementById("work-grid");
  if (grid) {
    const list = P.slice(0, +grid.dataset.limit || P.length);
    grid.innerHTML = list.map(p => `<a class="card" href="project.html?p=${p.slug}">
      <div class="thumb"${!p.image && p.vimeo ? ` data-vimeo="${p.vimeo}"` : ""}>${media(p)}</div>
      <h3>${p.title}</h3><p class="desc">${[...p.tags, p.year].join(", ")}</p></a>`).join("");
    grid.querySelectorAll(".thumb[data-vimeo]").forEach(t => window.vimeo.thumb(t.dataset.vimeo).then(u => {
      if (!u) return;
      const img = new Image(); img.alt = ""; img.src = u;
      t.querySelector(".ph").replaceWith(img);
    }));
  }

  const root = document.getElementById("project");
  if (root) {
    const slug = new URLSearchParams(location.search).get("p");
    const i = P.findIndex(p => p.slug === slug);
    if (i < 0) { root.innerHTML = `<section class="wrap"><h1>Not found</h1><p class="lede"><a href="work.html">Back to all work</a></p></section>`; return; }
    const p = P[i];
    document.title = `${p.title} · ${window.SITE.name}`;
    const md = document.querySelector('meta[name="description"]');
    if (md && p.body[0]) {
      const txt = p.body[0].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      md.content = txt.length > 155 ? txt.slice(0, 155).replace(/\s+\S*$/, "") + "…" : txt;
    }
    const specs = [p.tools.length ? `<dt>Tools</dt><dd>${p.tools.join(", ")}</dd>` : "", p.credits.length ? `<dt>Credits</dt><dd>${p.credits.join("<br>")}</dd>` : ""].join("");
    root.innerHTML = `<header class="wrap"><h1>${p.title}</h1><p class="lede desc">${[...p.tags, p.year].join(", ")}</p></header>
      <div class="wrap wide"><div class="video" data-vimeo="${p.vimeo}" ${p.image ? `data-poster="${p.image}"` : ""}></div></div>
      <section class="wrap desc-block"><h2 class="desc-title">Description</h2>${p.body.map(t => `<p class="desc">${t}</p>`).join("")}</section>
      <div id="bd-mount"></div>
      ${specs ? `<div class="specs"><dl>${specs}</dl></div>` : ""}`;
    loadBreakdown(p, root.querySelector("#bd-mount"));
  }

  // ---- Interactive breakdown ----
  // data/site.js lists the possible steps; this checks which images actually exist in
  // assets/breakdowns/<slug>/ and builds the section from only those. So the number of steps,
  // the numbering ("03 / 05") and the step names always match the images you have added.
  function loadBreakdown(p, mount) {
    const dir = `assets/breakdowns/${p.slug}/`;
    const defs = (p.breakdown || []).map((s, k) => {
      if (typeof s === "string") s = { label: s };
      return { label: s.label, file: s.file || `${pad(k + 1)}-${slugify(s.label)}`, ext: s.ext };
    });
    const probe = s => new Promise(done => {
      const exts = s.ext ? [s.ext] : EXTS;
      const attempt = n => {
        if (n >= exts.length) return done(null);
        const src = `${dir}${s.file}.${exts[n]}`, im = new Image();
        im.onload = () => done({ label: s.label, src });
        im.onerror = () => attempt(n + 1);
        im.src = src;
      };
      attempt(0);
    });
    Promise.all(defs.map(probe)).then(found => {
      const st = found.filter(Boolean);
      if (!st.length) return;                       // no images at all: no Breakdown section
      mount.innerHTML = breakdown(p, st);
      initBreakdown(mount.querySelector(".bd"), st);
    });
  }

  function breakdown(p, st) {
    return `<section class="bd" style="--n:${st.length}">
      <div class="bd-track"><div class="bd-sticky">
        <div class="bd-head"><div class="bd-head-in"><h2 class="desc-title">Breakdown</h2><p class="desc">${st.length > 1 ? "Scroll down to build the shot, one element at a time." : ""}</p></div></div>
        <div class="bd-stage" role="img" aria-label="Breakdown of ${p.title}">
          ${st.map((s, k) => `<div class="bd-layer" data-k="${k}"${k ? ' style="clip-path:inset(0 100% 0 0)"' : ""}><img src="${s.src}" alt="${s.label}" draggable="false"></div>`).join("")}
          <div class="bd-line"></div>
          <div class="bd-tag"><span class="bd-num"></span><span class="bd-name"></span></div>
        </div>
        <ol class="bd-steps">${st.map((s, k) => `<li><button type="button" data-k="${k}"><span>${pad(k + 1)}</span>${s.label}</button></li>`).join("")}</ol>
      </div></div></section>`;
  }

  function initBreakdown(bd, st) {
    if (!bd) return;
    const track = bd.querySelector(".bd-track"), sticky = bd.querySelector(".bd-sticky");
    const head = bd.querySelector(".bd-head"), headIn = bd.querySelector(".bd-head-in");
    const stage = bd.querySelector(".bd-stage"), steps = bd.querySelector(".bd-steps");
    const layers = [...bd.querySelectorAll(".bd-layer")];
    const line = bd.querySelector(".bd-line"), num = bd.querySelector(".bd-num"), name = bd.querySelector(".bd-name");
    const btns = [...bd.querySelectorAll(".bd-steps button")], N = layers.length;
    const header = document.getElementById("site-header");

    // Full-screen black layer: fades the rest of the page out while the breakdown is being used.
    const dim = document.createElement("div");
    dim.className = "bd-dim"; dim.setAttribute("aria-hidden", "true");
    document.body.appendChild(dim);

    const DIM = 0.94;                                  // how black the page gets (1 = fully)
    const STEP_VH = 0.6, HOLD_VH = 0.1, EXIT_VH = 0.45; // scroll distance per layer / pause once pinned / zoom-out runway
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const TAU_WIPE = reduce ? 0 : 90, TAU_FOCUS = reduce ? 0 : 150;   // ms; bigger = softer, more glide
    const ease = x => x * x * (3 - 2 * x), clamp01 = x => Math.min(1, Math.max(0, x));

    // Geometry, re-measured on resize
    let vh, pin, W0, W1, headH, wipeLen, holdIn, exitLen;
    function measure() {
      vh = innerHeight;
      bd.style.removeProperty("--bd-w"); head.style.height = "";
      pin = parseFloat(getComputedStyle(sticky).top) || 0;
      const stickyH = sticky.offsetHeight;
      headH = headIn.offsetHeight;
      W0 = stage.offsetWidth;
      const stepsH = steps.offsetHeight + 12 + 16;
      W1 = Math.max(W0, Math.min(document.documentElement.clientWidth * 0.96, (stickyH - stepsH) * 16 / 9));
      holdIn = HOLD_VH * vh; wipeLen = (N - 1) * STEP_VH * vh; exitLen = EXIT_VH * vh;
      track.style.height = (stickyH + holdIn + wipeLen + exitLen) + "px";
    }

    // Where the scroll position says we should be (target) vs what is drawn (eased)
    let tu = 0, tf = 0, cu = 0, cf = 0, raf = 0, lastT = 0, shown = -1;
    function readScroll() {
      const top = track.getBoundingClientRect().top, scrolled = pin - top;      // px scrolled since the box pinned
      const into = clamp01((vh * 0.8 - top) / (vh * 0.8 - pin));                 // box rising into view -> 1 when pinned
      const out = 1 - clamp01((scrolled - holdIn - wipeLen) / exitLen);          // after the last layer -> back to 0
      tf = ease(into) * ease(out);
      tu = N > 1 && wipeLen > 0 ? clamp01((scrolled - holdIn) / wipeLen) * (N - 1) : 0;
    }
    function render() {
      layers.forEach((l, k) => { if (k) l.style.clipPath = `inset(0 ${(1 - clamp01(cu - (k - 1))) * 100}% 0 0)`; });
      const c = Math.floor(cu) + 1, t = cu - (c - 1), wiping = c < N && t > 0.001;
      line.style.opacity = wiping ? 1 : 0; if (wiping) line.style.left = (t * 100) + "%";
      const a = Math.min(N - 1, Math.floor(cu + 0.5));
      if (a !== shown) {
        shown = a;
        num.textContent = `${pad(a + 1)} / ${pad(N)}`; name.textContent = st[a].label;
        btns.forEach((b, k) => { b.classList.toggle("on", k === a); k === a ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current"); });
      }
      if (W1 > W0 + 1) bd.style.setProperty("--bd-w", (W0 + (W1 - W0) * cf).toFixed(1) + "px");
      head.style.height = (headH * (1 - cf)).toFixed(1) + "px"; head.style.opacity = (1 - Math.min(1, cf * 1.6)).toFixed(3);
      dim.style.opacity = header && header.classList.contains("open") ? 0 : (cf * DIM).toFixed(3);
    }
    function tick(now) {
      const dt = Math.min(64, now - lastT || 16); lastT = now;
      const ku = TAU_WIPE ? 1 - Math.exp(-dt / TAU_WIPE) : 1, kf = TAU_FOCUS ? 1 - Math.exp(-dt / TAU_FOCUS) : 1;
      cu += (tu - cu) * ku; cf += (tf - cf) * kf;
      const done = Math.abs(tu - cu) < 0.0005 && Math.abs(tf - cf) < 0.0005;
      if (done) { cu = tu; cf = tf; }
      render();
      raf = done ? 0 : requestAnimationFrame(tick);
    }
    const kick = () => { readScroll(); if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } };

    addEventListener("scroll", kick, { passive: true });
    addEventListener("resize", () => { measure(); kick(); });
    btns.forEach((b, k) => b.addEventListener("click", () => {
      const top = track.getBoundingClientRect().top, want = holdIn + (N > 1 ? k / (N - 1) : 0) * wipeLen;
      scrollTo({ top: scrollY + want - (pin - top), behavior: "smooth" });
    }));
    // Layout settles after images/fonts load, so re-measure once more
    addEventListener("load", () => { measure(); kick(); });
    measure(); readScroll(); cu = tu; cf = tf; render();
  }
})();
