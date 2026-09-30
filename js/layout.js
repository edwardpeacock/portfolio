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
    const h = new Date().getHours();
    const text = h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.";
    g.innerHTML = text.split(" ").map((w,i) => `<span class="word"><span style="--i:${i}">${w}</span></span>`).join(" ");
  }
})();
