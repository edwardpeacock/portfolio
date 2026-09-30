/* Fills the showreel, about and contact pages, then starts the video players. */
(function () {
  const S = window.SITE, $ = id => document.getElementById(id);
  const reel = $("reel"); if (reel) { reel.dataset.vimeo = S.showreel; reel.classList.add("video"); }
  const about = $("about-text");
  if (about) about.innerHTML = S.about.map(t => `<p>${t}</p>`).join("") + `<ul class="skills">${S.skills.map(s => `<li>${s}</li>`).join("")}</ul>`;
  const mail = $("mail"); if (mail) { mail.href = "mailto:" + S.email; mail.textContent = S.email; }
  const soc = $("social"); if (soc) soc.innerHTML = S.socials.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join("");
  window.initVideos();
})();
