/* Renders project cards (#work-grid, optional data-limit) and the project detail page (#project). */
(function () {
  const P = window.PROJECTS;
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
      ${breakdown(p)}
      ${specs ? `<div class="specs"><dl>${specs}</dl></div>` : ""}`;
    initBreakdown(root.querySelector(".bd"));
  }

  // ---- Interactive breakdown ----
  function breakdown(p) {
    const st = p.breakdown || [];
    if (!st.length) return "";
    const num = k => String(k + 1).padStart(2, "0");
    const dir = `assets/breakdowns/${p.slug}/`;
    return `<section class="bd" style="--n:${st.length}">
      <div class="wrap bd-head"><h2 class="desc-title">Breakdown</h2><p class="desc">Scroll down to build the shot, one element at a time.</p></div>
      <div class="bd-track"><div class="bd-sticky">
        <div class="bd-stage" role="img" aria-label="Breakdown of ${p.title}">
          ${st.map((s, k) => `<div class="bd-layer" data-k="${k}"${k ? ' style="clip-path:inset(0 100% 0 0)"' : ""}>
            <div class="bd-ph" style="--k:${k}"><b>${num(k)} · ${s.label}</b><span>${dir}${s.file}.jpg</span></div>
            <img data-src="${dir}${s.file}"${s.ext ? ` data-ext="${s.ext}"` : ""} alt="${s.label}" draggable="false"></div>`).join("")}
          <div class="bd-line"></div>
          <div class="bd-tag"><span class="bd-num"></span><span class="bd-name"></span></div>
        </div>
        <ol class="bd-steps">${st.map((s, k) => `<li><button type="button" data-k="${k}"><span>${num(k)}</span>${s.label}</button></li>`).join("")}</ol>
      </div></div></section>`;
  }

  function initBreakdown(bd) {
    if (!bd) return;
    const track = bd.querySelector(".bd-track"), layers = [...bd.querySelectorAll(".bd-layer")];
    const line = bd.querySelector(".bd-line"), num = bd.querySelector(".bd-num"), name = bd.querySelector(".bd-name");
    const btns = [...bd.querySelectorAll(".bd-steps button")], labels = btns.map(b => b.textContent.slice(2)), N = layers.length;

    // Try jpg, then png, webp, jpeg (or just step.ext if set in data/site.js).
    // Missing images leave the placeholder showing; if none of them exist the whole section is removed.
    let pending = N, loaded = 0, dead = false;
    const settle = ok => { if (ok) loaded++; if (--pending === 0 && !loaded) { dead = true; bd.remove(); } };
    bd.querySelectorAll("img[data-src]").forEach(img => {
      const exts = img.dataset.ext ? [img.dataset.ext] : ["jpg", "png", "webp", "jpeg"]; let n = 0;
      const next = () => { if (n >= exts.length) { img.remove(); settle(false); return; } img.src = `${img.dataset.src}.${exts[n++]}`; };
      img.addEventListener("load", () => { img.classList.add("ok"); const ph = img.previousElementSibling; if (ph) ph.style.display = "none"; settle(true); });
      img.addEventListener("error", next);
      next();
    });

    const range = () => { const r = track.getBoundingClientRect(); return { r, total: Math.max(1, r.height - innerHeight) }; };
    let queued = false, last = -1;
    const update = () => {
      queued = false;
      if (dead) return;
      const { r, total } = range();
      const u = Math.min(1, Math.max(0, -r.top / total)) * (N - 1);   // 0 .. N-1
      layers.forEach((l, k) => { if (k) l.style.clipPath = `inset(0 ${(1 - Math.min(1, Math.max(0, u - (k - 1)))) * 100}% 0 0)`; });
      const c = Math.floor(u) + 1, t = u - (c - 1);                    // layer currently wiping in
      const wiping = c < N && t > 0.001;
      line.style.opacity = wiping ? 1 : 0; if (wiping) line.style.left = (t * 100) + "%";
      const a = Math.min(N - 1, Math.floor(u + 0.5));
      if (a !== last) {
        last = a;
        num.textContent = String(a + 1).padStart(2, "0"); name.textContent = labels[a];
        btns.forEach((b, k) => { b.classList.toggle("on", k === a); k === a ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current"); });
      }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    btns.forEach((b, k) => b.addEventListener("click", () => {
      const { r, total } = range();
      scrollTo({ top: scrollY + r.top + (N > 1 ? k / (N - 1) : 0) * total });
    }));
    update();
  }
})();
