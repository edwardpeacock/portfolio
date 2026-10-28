/* Fills the homepage showreel and the About me page (about text, software strip and contact buttons), then starts the video players. */
(function () {
  const S = window.SITE, $ = id => document.getElementById(id);
  const reel = $("reel");
  if (reel) {
    reel.dataset.vimeo = S.showreel; reel.classList.add("video");
    if (reel.hasAttribute("data-home")) { reel.dataset.label = "Showreel 2026"; if (S.showreelLoop) reel.dataset.loop = S.showreelLoop; }   // home page only: looping clip instead of a thumbnail
  }
  const portrait = $("portrait");
  if (portrait) {
    portrait.setAttribute("role", "img");
    portrait.setAttribute("aria-label", `Portrait of ${S.name} holding a Canon camera`);
    ["contextmenu", "dragstart", "selectstart"].forEach(ev => portrait.addEventListener(ev, e => e.preventDefault()));
  }
  // Home: "See all 6 projects" button under the cards shown there (2 on phones, 4 on computers)
  const more = $("more-work");
  const nAll = (window.PROJECTS || []).length;
  if (more) more.querySelector("span").textContent = `See all ${nAll} projects`;
  // Home (computers): the link beside "VFX Projects" says how many there are too
  const headLink = document.querySelector("#work .section-head a");
  if (headLink && nAll) headLink.textContent = `All ${nAll} projects`;
  // About me: first paragraph always shown; on phones the rest folds away behind "Read more" (desktop shows everything)
  const about = $("about-text");
  if (about) {
    // keep the last two words of each paragraph together so a single word never sits alone on the last line
    const keep = t => t.replace(/ (\S+)$/, "\u00a0$1");
    const [first, ...rest] = S.about.map(keep);
    about.innerHTML = `<p>${first}</p>` + (rest.length ? `<div class="about-more" id="about-more">${rest.map(t => `<p>${t}</p>`).join("")}</div>
      <button type="button" class="about-toggle" aria-expanded="false" aria-controls="about-more"><span>Read more</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button>` : "");
    const tog = about.querySelector(".about-toggle");
    if (tog) tog.addEventListener("click", () => {
      const open = about.classList.toggle("open");
      tog.setAttribute("aria-expanded", String(open));
      tog.querySelector("span").textContent = open ? "Read less" : "Read more";
    });
  }
  // Software strip: two identical halves, slid right by half its width, loop seamlessly (see .marquee in style.css)
  // Phones: the same software as a plain list (the scrolling strip only fits about three names on a phone)
  const list = $("skills-list");
  if (list) list.innerHTML = S.skills.map(s => `<li>${s}</li>`).join("");
  const skills = $("skills");
  if (skills) {
    // Redesign: a plain, still line of software (no scrolling strip)
    skills.innerHTML = `<div class="wrap sw"><h2>Software</h2><ul>${S.skills.map(s => `<li>${s}</li>`).join("")}</ul></div>`;
  }
  // Work page: "Selected work - 7 projects". The number is counted from the PROJECTS list in data/site.js.
  const wc = $("work-count");
  if (wc) { const n = (window.PROJECTS || []).length; wc.textContent = `Selected work — ${n} ${n === 1 ? "project" : "projects"}`; }
  const acts = $("actions");
  if (acts) {
    const svg = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const icons = {
      LinkedIn: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
      Instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
      Mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'
    };
    // Email button in the middle so the row looks centred (on phones CSS moves it to its own line)
    const soc = S.socials.map(s => `<a class="btn btn-social" href="${s.url}" target="_blank" rel="noopener">${svg(icons[s.label] || "")}<span>${s.label}</span></a>`);
    const mail = `<a class="btn btn-mail" href="mailto:${S.email}">${svg(icons.Mail)}<span>${S.email}</span></a>`;
    const mid = Math.ceil(soc.length / 2);
    acts.innerHTML = soc.slice(0, mid).join("") + mail + soc.slice(mid).join("");
  }
  window.initVideos();
})();
