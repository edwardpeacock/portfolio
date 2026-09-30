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
