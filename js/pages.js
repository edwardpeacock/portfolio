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
  const about = $("about-text");
  if (about) about.innerHTML = S.about.map(t => `<p>${t}</p>`).join("");
  // Software strip: two identical halves, slid right by half its width, loop seamlessly (see .marquee in style.css)
  const skills = $("skills");
  if (skills) {
    const half = `<ul>${S.skills.concat(S.skills).map(s => `<li>${s}</li>`).join("")}</ul>`;
    skills.innerHTML = `<div class="marquee-track">${half}${half.replace("<ul>", '<ul aria-hidden="true">')}</div>`;
    // The strip is deliberately wider than the text column: it fades in and out near the edges of the screen instead of at the content margins
    const fitMarquee = () => {
      const l = innerWidth * 0.03, r = innerWidth * 0.97;
      skills.style.setProperty("--mq-l", Math.round(l) + "px");
      skills.style.setProperty("--mq-r", Math.round(r) + "px");
      skills.style.setProperty("--mq-f", Math.round(Math.min(140, (r - l) * .1)) + "px");
    };
    fitMarquee(); addEventListener("resize", fitMarquee); addEventListener("load", fitMarquee);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMarquee);
  }
  // About me (desktop): the photo is exactly as tall as the text beside it, top of the heading to bottom of the last line
  const sr = document.querySelector(".split-right");
  if (portrait && sr) {
    const fitPortrait = () => {
      if (innerWidth <= 980) { portrait.style.removeProperty("--portrait-h"); return; }
      const h = Math.round(sr.getBoundingClientRect().height);
      if (h > 0) portrait.style.setProperty("--portrait-h", h + "px");
    };
    fitPortrait(); addEventListener("resize", fitPortrait); addEventListener("load", fitPortrait);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPortrait);
    if (window.ResizeObserver) new ResizeObserver(fitPortrait).observe(sr);
  }
  const acts = $("actions");
  if (acts) {
    const svg = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const icons = {
      LinkedIn: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
      Instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
      Mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'
    };
    acts.innerHTML = S.socials.map(s => `<a class="btn" href="${s.url}" target="_blank" rel="noopener">${svg(icons[s.label] || "")}<span>${s.label}</span></a>`).join("")
      + `<a class="btn" href="mailto:${S.email}">${svg(icons.Mail)}<span>${S.email}</span></a>`;
  }
  window.initVideos();
})();
