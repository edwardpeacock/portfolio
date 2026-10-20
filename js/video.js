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
    el.querySelector(".play").addEventListener("click", () => {
      el.classList.add("playing");
      const stage = el.closest(".home-stage"); if (stage) stage.classList.add("playing");   // home page: shrink the full-screen frame so the player controls fit
      dispatchEvent(new Event("resize"));
      const q = (v.hash ? "h=" + v.hash + "&" : "") + "autoplay=1&dnt=1&title=0&byline=0&portrait=0";
      el.innerHTML = `<iframe src="https://player.vimeo.com/video/${v.id}?${q}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video player"></iframe>`;
    });
  }

  window.vimeo = { parse, thumb };
  window.initVideos = (root = document) => root.querySelectorAll(".video[data-vimeo]").forEach(setup);
})();
