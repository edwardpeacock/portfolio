/* Vimeo helpers.
   <div class="video" data-vimeo="URL" data-poster="optional.jpg"></div> becomes a click-to-play on-site player.
   window.vimeo.thumb(url) resolves to the video's thumbnail URL (used for project covers). */
(function () {
  const cache = new Map();

  function parse(url) {
    const m = /vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i.exec(url || "");
    return m ? { id: m[1], hash: m[2] || new URLSearchParams((url.split("?")[1] || "")).get("h") } : null;
  }

  function thumb(url) {
    const v = parse(url);
    if (!v) return Promise.resolve(null);
    if (!cache.has(url)) {
      const canonical = "https://vimeo.com/" + v.id + (v.hash ? "/" + v.hash : "");
      cache.set(url, fetch("https://vimeo.com/api/oembed.json?width=1280&url=" + encodeURIComponent(canonical))
        .then(r => (r.ok ? r.json() : null)).then(d => (d && d.thumbnail_url) || null).catch(() => null));
    }
    return cache.get(url);
  }

  function setup(el) {
    const v = parse(el.dataset.vimeo);
    if (!v) { el.classList.add("empty"); el.innerHTML = "<span>Video coming soon</span>"; return; }
    el.innerHTML = `<button class="play" aria-label="Play video"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button>`;
    if (el.dataset.poster) el.style.backgroundImage = `url(${el.dataset.poster})`;
    else thumb(el.dataset.vimeo).then(u => { if (u) el.style.backgroundImage = `url(${u})`; });
    el.querySelector(".play").addEventListener("click", () => {
      const q = (v.hash ? "h=" + v.hash + "&" : "") + "autoplay=1&dnt=1&title=0&byline=0&portrait=0";
      el.innerHTML = `<iframe src="https://player.vimeo.com/video/${v.id}?${q}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video player"></iframe>`;
    });
  }

  window.vimeo = { parse, thumb };
  window.initVideos = (root = document) => root.querySelectorAll(".video[data-vimeo]").forEach(setup);
})();
