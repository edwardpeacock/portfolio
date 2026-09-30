/* Renders project cards (#work-grid, optional data-limit) and the project detail page (#project). */
(function () {
  const P = window.PROJECTS;
  const media = p => p.image ? `<img src="${p.image}" alt="${p.title}" loading="lazy">` : `<div class="ph" aria-hidden="true"></div>`;

  const grid = document.getElementById("work-grid");
  if (grid) {
    const list = P.slice(0, +grid.dataset.limit || P.length);
    grid.innerHTML = list.map(p => `<a class="card" href="project.html?p=${p.slug}">
      <div class="thumb">${media(p)}</div>
      <h3>${p.title}</h3><p>${p.type}, ${p.role}, ${p.year}</p></a>`).join("");
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .15 });
    grid.querySelectorAll(".card").forEach(c => io.observe(c));
  }

  const root = document.getElementById("project");
  if (root) {
    const slug = new URLSearchParams(location.search).get("p");
    const i = P.findIndex(p => p.slug === slug);
    if (i < 0) { root.innerHTML = `<section class="wrap"><h1>Not found</h1><p class="lede"><a href="work.html">Back to all work</a></p></section>`; return; }
    const p = P[i], next = P[(i + 1) % P.length];
    document.title = `${p.title} · ${window.SITE.name}`;
    root.innerHTML = `<header class="wrap"><h1>${p.title}</h1><p class="lede">${p.summary}</p></header>
      <div class="wrap wide"><div class="video" data-vimeo="${p.vimeo}" ${p.image ? `data-poster="${p.image}"` : ""}></div></div>
      <div class="wrap detail">
        <dl><dt>Role</dt><dd>${p.role}</dd><dt>Year</dt><dd>${p.year}</dd><dt>Type</dt><dd>${p.type}</dd>
        ${p.tools.length ? `<dt>Tools</dt><dd>${p.tools.join(", ")}</dd>` : ""}
        ${p.credits.length ? `<dt>Credits</dt><dd>${p.credits.join("<br>")}</dd>` : ""}</dl>
        <div class="prose">${p.body.map(t => `<p>${t}</p>`).join("")}</div></div>
      <a class="next wrap" href="project.html?p=${next.slug}"><span>Next project</span><strong>${next.title}</strong></a>`;
  }
})();
