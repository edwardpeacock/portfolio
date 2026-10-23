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

  const meta = new Map();   // url -> oEmbed data (thumbnail + the video's real width / height)
  const oe = u => fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const json = u => oe(u).then(d => (d && d.thumbnail_url) || null);
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

  // The video's real shape (e.g. 1.9:1 for a scope shot), so the player can be cropped to it: no letterbox bars
  function ratio(url) {
    const v = parse(url);
    if (!v) return Promise.resolve(null);
    if (!meta.has(url)) {
      const h = v.hash ? "/" + v.hash : "";
      meta.set(url, oe("https://vimeo.com/api/oembed.json?url=" + encodeURIComponent("https://vimeo.com/" + v.id + h))
        .then(d => (d && d.width && d.height ? d.width / d.height : null)));
    }
    return meta.get(url);
  }
  const embed = (v, extra) => `https://player.vimeo.com/video/${v.id}?${v.hash ? "h=" + v.hash + "&" : ""}autoplay=1&dnt=1&title=0&byline=0&portrait=0&transparent=0${extra || ""}`;

  // ---------- Home page: the showreel opens in a pop-up player ----------
  function openReel(v, url, opener) {
    if (document.querySelector(".reel-pop")) return;
    const pop = document.createElement("div");
    pop.className = "reel-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-modal", "true"); pop.setAttribute("aria-label", "Showreel");
    pop.innerHTML = `<div class="reel-pop-box"><iframe src="${embed(v)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Showreel"></iframe></div>
      <button type="button" class="reel-pop-close" aria-label="Close showreel"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>Close</span></button>`;
    document.body.appendChild(pop);
    const box = pop.querySelector(".reel-pop-box");
    ratio(url).then(r => { if (r) box.style.setProperty("--ar", r); });
    document.documentElement.style.overflow = "hidden";
    const loop = document.querySelector(".home-stage video.loop"); if (loop) loop.pause();   // nothing moving behind the player
    requestAnimationFrame(() => pop.classList.add("on"));
    const close = () => {
      removeEventListener("keydown", key);
      pop.classList.remove("on"); document.documentElement.style.overflow = "";
      box.innerHTML = "";                       // stops the video
      if (loop) { const go = loop.play(); if (go && go.catch) go.catch(() => {}); }
      setTimeout(() => pop.remove(), 200);
      if (opener) opener.focus();
    };
    const key = e => { if (e.key === "Escape") close(); };
    addEventListener("keydown", key);
    pop.addEventListener("click", e => { if (!box.contains(e.target)) close(); });   // click anywhere outside the player closes it
    pop.querySelector(".reel-pop-close").focus();
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
      // no "Save video as" / "Open video in new tab" / picture-in-picture / cast (right-click is also blocked in js/protect.js)
      vid.disablePictureInPicture = true; vid.setAttribute("disablepictureinpicture", ""); vid.setAttribute("disableremoteplayback", "");
      vid.setAttribute("controlslist", "nodownload noplaybackrate noremoteplayback"); vid.draggable = false;
      vid.addEventListener("error", () => vid.remove());
      el.prepend(vid);
      const go = vid.play(); if (go && go.catch) go.catch(() => {});
    } else if (el.dataset.poster) el.style.backgroundImage = `url(${el.dataset.poster})`;
    else thumb(el.dataset.vimeo).then(u => { if (u) el.style.backgroundImage = `url(${u})`; });
    // Crop the player to the video's own shape once Vimeo tells us what it is (project pages)
    if (!el.hasAttribute("data-home")) ratio(el.dataset.vimeo).then(r => { if (r && Math.abs(r - 16 / 9) > 0.01) { el.style.aspectRatio = String(r); el.classList.add("custom-ar"); dispatchEvent(new Event("resize")); } });
    el.querySelector(".play").addEventListener("click", e => {
      if (el.hasAttribute("data-home")) return openReel(v, el.dataset.vimeo, e.currentTarget);   // home: pop-up player, the loop keeps running behind
      el.classList.add("playing");
      const stage = el.closest(".home-stage"); if (stage) stage.classList.add("playing");   // home page: shrink the full-screen frame so the player controls fit
      dispatchEvent(new Event("resize"));
      el.innerHTML = `<iframe src="${embed(v)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video player"></iframe>`;
    });
  }

  window.vimeo = { parse, thumb };
  window.initVideos = (root = document) => root.querySelectorAll(".video[data-vimeo]").forEach(setup);
})();
