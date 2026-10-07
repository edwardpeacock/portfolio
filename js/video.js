/* Vimeo helpers.
   <div class="video" data-vimeo="URL" data-poster="optional.jpg" data-loop="clip.mp4"></div> becomes a click-to-play on-site player
   (data-loop shows a silent looping local clip behind the play button instead of the thumbnail).
   window.vimeo.thumb(url) resolves to the video's thumbnail URL (used for project covers). */
(function () {
  const cache = new Map();

  function parse(url) {
    const m = /vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i.exec(url || "");
    return m ? { id: m[1], hash: m[2] || new URLSearchParams((url.split("?")[1] || "")).get("h") } : null;
  }

  const json = u => fetch(u).then(r => (r.ok ? r.json() : null)).then(d => (d && d.thumbnail_url) || null).catch(() => null);
  const loads = u => new Promise(ok => { const im = new Image(); im.onload = () => ok(u); im.onerror = () => ok(null); im.src = u; });

  // Tries, in order: Vimeo's oEmbed for the normal link, oEmbed for the player link, then a public thumbnail service.
  function thumb(url) {
    const v = parse(url);
    if (!v) return Promise.resolve(null);
    if (!cache.has(url)) {
      const h = v.hash ? "/" + v.hash : "";
      const oembed = target => "https://vimeo.com/api/oembed.json?width=1280&url=" + encodeURIComponent(target);
      cache.set(url, json(oembed("https://vimeo.com/" + v.id + h))
        .then(u => u || json(oembed("https://player.vimeo.com/video/" + v.id + (v.hash ? "?h=" + v.hash : ""))))
        .then(u => u || loads("https://vumbnail.com/" + v.id + ".jpg")));
    }
    return cache.get(url);
  }

  function setup(el) {
    const v = parse(el.dataset.vimeo);
    if (!v) { el.classList.add("empty"); el.innerHTML = "<span>Video coming soon</span>"; return; }
    el.innerHTML = `<button class="play" aria-label="Play video"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>${el.dataset.label ? `<span class="play-label">${el.dataset.label}</span>` : ""}</button>`;
    if (el.dataset.loop) {
      // Looping local clip (no thumbnail). If the file is missing the box simply stays dark behind the play button.
      const vid = document.createElement("video");
      vid.className = "loop"; vid.src = el.dataset.loop;
      vid.muted = vid.loop = vid.autoplay = vid.playsInline = true;
      vid.setAttribute("muted", ""); vid.setAttribute("playsinline", ""); vid.setAttribute("aria-hidden", "true");
      vid.addEventListener("error", () => vid.remove());
      el.prepend(vid);
      const go = vid.play(); if (go && go.catch) go.catch(() => {});
    } else if (el.dataset.poster) el.style.backgroundImage = `url(${el.dataset.poster})`;
    else thumb(el.dataset.vimeo).then(u => { if (u) el.style.backgroundImage = `url(${u})`; });
    glass(el.querySelector(".play"));
    el.querySelector(".play").addEventListener("click", () => {
      el.classList.add("playing");
      const stage = el.closest(".home-stage"); if (stage) stage.classList.add("playing");   // home page: shrink the full-screen frame so the player controls fit
      dispatchEvent(new Event("resize"));
      const q = (v.hash ? "h=" + v.hash + "&" : "") + "autoplay=1&dnt=1&title=0&byline=0&portrait=0";
      el.innerHTML = `<iframe src="https://player.vimeo.com/video/${v.id}?${q}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video player"></iframe>`;
    });
  }

  // ---- Liquid-glass lens (Chrome / Edge) ----
  // A displacement map pushes the video behind the button outward near its rim (like a glass dome) and is split per colour channel
  // (R/G/B displaced by slightly different amounts) for the rainbow fringe. Other browsers keep the plain CSS blur.
  const lensOK = /Chrome\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
  const lenses = {};
  function lens(size) {
    if (lenses[size]) return lenses[size];
    const c = document.createElement("canvas"); c.width = c.height = size;
    const ctx = c.getContext("2d"), img = ctx.createImageData(size, size), R = size / 2, bevel = R * 0.6;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - R, dy = y + 0.5 - R, d = Math.hypot(dx, dy), k = (y * size + x) * 4;
      let vx = 0, vy = 0;
      if (d <= R && d > 0) { const f = Math.pow(1 - Math.min(1, (R - d) / bevel), 2.2); vx = dx / d * f; vy = dy / d * f; }
      img.data[k] = 128 + 127 * vx; img.data[k + 1] = 128 + 127 * vy; img.data[k + 2] = 128; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const S = size * 0.42, id = "lens" + size, ns = "http://www.w3.org/2000/svg";
    const chan = (n, sc, m) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${sc}" xChannelSelector="R" yChannelSelector="G" result="d${n}"/><feColorMatrix in="d${n}" type="matrix" values="${m}" result="c${n}"/>`;
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", 0); svg.setAttribute("height", 0); svg.setAttribute("aria-hidden", "true"); svg.style.cssText = "position:absolute;pointer-events:none";
    svg.innerHTML = `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}" color-interpolation-filters="sRGB">
      <feImage href="${c.toDataURL()}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="none" result="map"/>
      ${chan("r", S * 1.0, "1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0")}${chan("g", S * 0.92, "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0")}${chan("b", S * 0.84, "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0")}
      <feBlend in="cr" in2="cg" mode="screen" result="rg"/><feBlend in="rg" in2="cb" mode="screen"/></filter>`;
    document.body.appendChild(svg);
    return (lenses[size] = id);
  }
  function glass(btn, self) {
    if (!lensOK) return;
    const icon = self ? btn : btn.querySelector("svg"); if (!icon) return;
    const size = Math.round(icon.getBoundingClientRect().width) || 84;
    const v = `blur(3px) url(#${lens(size)}) saturate(1.5)`;
    icon.style.backdropFilter = v; icon.style.webkitBackdropFilter = v;
  }

  // Home page scroll arrow gets the same glass lens as the play button (the arrow itself is the circle)
  const arrow = document.querySelector(".home-stage .cue-arrow");
  if (arrow) glass(arrow, true);

  window.vimeo = { parse, thumb };
  window.initVideos = (root = document) => root.querySelectorAll(".video[data-vimeo]").forEach(setup);
})();
