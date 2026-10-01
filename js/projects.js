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
        <div class="bd-head"><h2 class="desc-title">Breakdown</h2><p class="desc">${st.length > 1 ? "Scroll down to build the shot, one element at a time." : ""}</p></div>
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
    const track = bd.querySelector(".bd-track"), layers = [...bd.querySelectorAll(".bd-layer")];
    const line = bd.querySelector(".bd-line"), num = bd.querySelector(".bd-num"), name = bd.querySelector(".bd-name");
    const btns = [...bd.querySelectorAll(".bd-steps button")], N = layers.length;

    const range = () => { const r = track.getBoundingClientRect(); return { r, total: Math.max(1, r.height - innerHeight) }; };
    let queued = false, last = -1;
    const update = () => {
      queued = false;
      const { r, total } = range();
      const u = N > 1 ? Math.min(1, Math.max(0, -r.top / total)) * (N - 1) : 0;   // 0 .. N-1
      layers.forEach((l, k) => { if (k) l.style.clipPath = `inset(0 ${(1 - Math.min(1, Math.max(0, u - (k - 1)))) * 100}% 0 0)`; });
      const c = Math.floor(u) + 1, t = u - (c - 1);                    // layer currently wiping in
      const wiping = c < N && t > 0.001;
      line.style.opacity = wiping ? 1 : 0; if (wiping) line.style.left = (t * 100) + "%";
      const a = Math.min(N - 1, Math.floor(u + 0.5));
      if (a !== last) {
        last = a;
        num.textContent = `${pad(a + 1)} / ${pad(N)}`; name.textContent = st[a].label;
        btns.forEach((b, k) => { b.classList.toggle("on", k === a); k === a ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current"); });
      }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    btns.forEach((b, k) => b.addEventListener("click", () => {
      const { r, total } = range();
      scrollTo({ top: scrollY + r.top + (N > 1 ? k / (N - 1) : 0) * total, behavior: "smooth" });
    }));
    update();
  }
})();
