/* Shared header, footer, home status lines. */
(function () {
  const S = window.SITE;
  const links = [["index.html","Home"],["work.html","Work"],["info.html","About me"],["cv.html","CV"]];   // CV: a short page asking people to email for it
  // Hosts like Cloudflare Pages serve /about.html as /about, so compare names without ".html".
  const strip = s => s.replace(/\.html$/, "");
  const page = strip(location.pathname.split("/").pop() || "index");
  const current = page === "project" ? "work" : page;

  // Location / availability lines: shown only on the home page, at the bottom left of the showreel (not in the header)
  // One plain line, no icons. Each half stays whole, so on narrow phones it breaks at the dot rather than mid-phrase.
  const statusHTML = `<span class="st-part">London, UK</span><span class="st-sep" aria-hidden="true"> · </span><span class="st-part">Available for Compositor roles</span>`;

  const header = document.getElementById("site-header");
  if (header) {
    header.innerHTML = `<div class="hdr-blur" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="bar">
      <div class="brand"><div class="brand-line"><a class="brand-name" href="index.html">${S.name}</a><span class="brand-tail"><span class="brand-sep" aria-hidden="true">|</span><span class="brand-role">${S.role}</span></span></div>
        ${current === "index" ? "" : `<a class="home-btn" href="index.html" aria-label="Home"><svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg></a>`}</div>
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
  // Email button goes in the middle of the row so the (wider) email doesn't pull the group off-centre. On phones CSS moves it to its own line.
  const socialBtns = S.socials.map(x => `<a class="btn btn-social" href="${x.url}" target="_blank" rel="noopener">${icoSvg(ico[x.label] || "")}<span>${x.label}</span></a>`);
  const mailBtn = `<a class="btn btn-mail" href="mailto:${S.email}">${icoSvg(ico.Mail)}<span>${S.email}</span></a>`;
  const mid = Math.ceil(socialBtns.length / 2);
  const contactBtns = socialBtns.slice(0, mid).join("") + mailBtn + socialBtns.slice(mid).join("");
  if (footer) footer.innerHTML = `<div class="wrap ft">
    <p class="ft-say">Like what you see?<br>Let’s work together.</p>
    <div class="ft-cols">
      <div class="ft-col"><h2>Contact</h2><a href="mailto:${S.email}">${S.email}</a></div>
      <div class="ft-col"><h2>Follow</h2>${S.socials.map(x => `<a href="${x.url}" target="_blank" rel="noopener">${x.label}</a>`).join("")}</div>
      <div class="ft-col"><h2>Based in</h2><p>London, UK</p><p>Available for Compositor roles</p></div>
    </div></div>`;

  // Home: location and availability sit at the bottom left of the showreel (copied from the header's status lines)
  const st = document.getElementById("stage-status");
  if (st) st.innerHTML = statusHTML;
})();

/* Same-page links glide back to the top instead of reloading; video fitting. */
(function () {
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (u.protocol !== location.protocol || u.host !== location.host) return;
    const norm = p => p.replace(/\/index(\.html)?$/, "/").replace(/\.html$/, "");
    // Already on this page: don't reload, just go back to the top. Links with a #hash use the normal in-page jump.
    if (norm(u.pathname) === norm(location.pathname) && u.search === location.search && !u.hash) { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }
  });

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
