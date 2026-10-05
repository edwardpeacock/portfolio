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
      <h3>${p.title}</h3><p class="desc meta">${[...p.tags, p.year].join(", ")}</p></a>`).join("");
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
    root.innerHTML = `<header class="wrap"><h1>${p.title}</h1><p class="lede desc meta">${[...p.tags, p.year].join(", ")}</p></header>
      <div class="wrap wide"><div class="video" data-vimeo="${p.vimeo}" ${p.image ? `data-poster="${p.image}"` : ""}></div></div>
      ${p.body.length ? `<section class="wrap desc-block"><h2 class="desc-title">Description</h2>${p.body.map(t => `<p class="desc">${t}</p>`).join("")}</section>` : ""}
      ${specs ? `<div class="specs"><dl>${specs}</dl></div>` : ""}
      <div id="bd-mount"></div>`;
    document.body.classList.add("proj-fit");   // no breakdown (yet): fit the whole page on screen; removed below if one is found
    loadBreakdown(p, root.querySelector("#bd-mount"));
  }

  // ---- Interactive breakdown ----
  // Each project's breakdown is controlled by assets/breakdowns/<slug>/README.txt.
  // Every line like   01-original-plate  ->  Original plate   adds one step: the file name (without
  // the extension) on the left, the name shown on the website on the right. The order of the lines
  // is the order of the steps and you can list as many as you need. Only steps whose image exists
  // in that folder are shown, and the numbering ("03 / 05") follows what is found.
  // If README.txt can't be read (e.g. the site is opened straight from disk), the list in
  // data/site.js is used instead.
  function parseReadme(txt) {
    const out = [];
    String(txt).replace(/^\uFEFF/, "").split(/\r?\n/).forEach(raw => {
      const line = raw.trim();
      if (!line || line[0] === "#") return;
      let file, label;
      const m = line.match(/^([\w.\-]+)\s*(?:->|=>|\u2192)\s*(.+)$/);
      if (m) { file = m[1]; label = m[2].trim(); }
      else if (/^[\w\-]+(\.(jpe?g|png|webp))?$/i.test(line)) { file = line; }   // file name only
      else return;                                                               // normal text: ignore
      let ext;
      const e = file.match(/^(.*)\.(jpe?g|png|webp)$/i);
      if (e) { file = e[1]; ext = e[2].toLowerCase(); }
      if (!label) {
        label = file.replace(/^\d+[-_ ]*/, "").replace(/[-_]+/g, " ").trim() || file;
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
      out.push({ label, file, ext });
    });
    return out;
  }

  function loadBreakdown(p, mount) {
    const dir = `assets/breakdowns/${p.slug}/`;
    const fallback = () => (p.breakdown || []).map((s, k) => {
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
    fetch(`${dir}README.txt`, { cache: "no-cache" })
      .then(r => { if (!r.ok) throw new Error("no readme"); return r.text(); })
      .then(t => { const d = parseReadme(t); return d.length ? d : fallback(); })
      .catch(fallback)
      .then(defs => Promise.all(defs.map(probe)))
      .then(found => {
        const st = found.filter(Boolean);
        if (!st.length) return;                     // no images at all: no Breakdown section
        document.body.classList.remove("proj-fit");
        dispatchEvent(new Event("resize"));
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
    const head = bd.querySelector(".bd-head");
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
    const STEP_VH = 0.6, HOLD_VH = 0.1, END_VH = 0.1;  // scroll distance per layer / pause once pinned / rest on the final image
    const TAU_WIPE = 90, TAU_FOCUS = 150;   // ms; bigger = softer, more glide
    const ease = x => x * x * (3 - 2 * x), clamp01 = x => Math.min(1, Math.max(0, x));

    // Geometry, re-measured on resize
    let vh, pin, W0, W1, wipeLen, holdIn;
    function measure() {
      vh = innerHeight;
      bd.style.removeProperty("--bd-w");
      pin = parseFloat(getComputedStyle(sticky).top) || 0;
      const stickyH = sticky.offsetHeight;
      const headH = head.offsetHeight;
      W0 = stage.offsetWidth;
      const stepsH = steps.offsetHeight + 12 + 16;
      W1 = Math.max(W0, Math.min(document.documentElement.clientWidth * 0.96, (stickyH - headH - stepsH) * 16 / 9));
      holdIn = HOLD_VH * vh; wipeLen = (N - 1) * STEP_VH * vh;
      // The page ends exactly when the track does: the final image stays pinned and there is nothing further down to scroll to.
      track.style.height = (stickyH + holdIn + wipeLen + END_VH * vh) + "px";
    }

    // Where the scroll position says we should be (target) vs what is drawn (eased)
    let tu = 0, tf = 0, cu = 0, cf = 0, raf = 0, lastT = 0, shown = -1;
    function readScroll() {
      const top = track.getBoundingClientRect().top, scrolled = pin - top;      // px scrolled since the box pinned
      const into = clamp01((vh * 0.8 - top) / (vh * 0.8 - pin));                 // box rising into view -> 1 when pinned
      tf = ease(into);
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
      // The nav stays above the black layer, faded back so it does not compete (full strength on hover)
      if (header) { header.style.zIndex = cf > 0.01 ? 13 : ""; header.style.opacity = cf > 0.01 ? (1 - cf * 0.7).toFixed(3) : ""; }
      document.body.classList.toggle("bd-on", cf > 0.01);
      dim.style.opacity = (cf * DIM).toFixed(3);
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
    document.body.classList.add("bd-end");            // no footer below: the work page ends on the final image
    measure(); readScroll(); cu = tu; cf = tf; render();
  }
})();
