/* About me page layout fitting (desktop):
   - the photo is exactly as tall as the text beside it (top of "About me" to the bottom of the last line)
   - the software strip is wider than the text block and fades in and out beyond its left and right edges */
(function () {
  const $ = id => document.getElementById(id);
  const skills = $("skills"), portrait = $("portrait");
  const split = document.querySelector(".split"), sr = document.querySelector(".split-right");
  if (!split || !sr) return;
  const RATIO = 1197 / 1600;
  function fit() {
    const desk = innerWidth > 980 && innerHeight >= 640;
    // Photo: the grid row is exactly as tall as the text, the photo stretches to fill it; here we only set its width so the whole photo is shown
    if (desk) split.style.setProperty("--photo-w", Math.round((sr.getBoundingClientRect().height + 3) * RATIO) + "px");
    else split.style.removeProperty("--photo-w");
    // Software strip: extend past the content edges by ~11% of the content width on each side
    if (skills) {
      let l = innerWidth * 0.03, r = innerWidth * 0.97;
      if (desk && portrait) {
        const a = portrait.getBoundingClientRect().left, b = sr.getBoundingClientRect().right, ext = (b - a) * 0.11;
        l = Math.max(innerWidth * 0.02, a - ext); r = Math.min(innerWidth * 0.98, b + ext);
      }
      skills.style.setProperty("--mq-l", Math.round(l) + "px");
      skills.style.setProperty("--mq-r", Math.round(r) + "px");
      skills.style.setProperty("--mq-f", Math.round(Math.min(120, (r - l) * .12)) + "px");
    }
  }
  fit();
  addEventListener("resize", fit); addEventListener("load", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(sr);
})();
