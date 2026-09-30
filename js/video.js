/* Click-to-play Vimeo embeds: <div class="video" data-vimeo="URL" data-poster="optional.jpg"></div>
   Plays on-site in an iframe. Nothing loads from the player until the visitor clicks. */
(function () {
  function parse(url) {
    const m = /vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i.exec(url || "");
    return m ? { id: m[1], hash: m[2] || new URLSearchParams((url.split("?")[1] || "")).get("h") } : null;
  }
  function setup(el) {
    const v = parse(el.dataset.vimeo);
    if (!v) { el.classList.add("empty"); el.innerHTML = "<span>Video coming soon</span>"; return; }
    const poster = el.dataset.poster;
    el.innerHTML = `<button class="play" aria-label="Play video"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button>`;
    if (poster) el.style.backgroundImage = `url(${poster})`;
    else fetch("https://vimeo.com/api/oembed.json?width=1280&url=" + encodeURIComponent("https://vimeo.com/" + v.id + (v.hash ? "/" + v.hash : "")))
      .then(r => r.ok ? r.json() : null).then(d => { if (d && d.thumbnail_url) el.style.backgroundImage = `url(${d.thumbnail_url})`; }).catch(() => {});
    el.querySelector(".play").addEventListener("click", () => {
      const q = (v.hash ? "h=" + v.hash + "&" : "") + "autoplay=1&dnt=1&title=0&byline=0&portrait=0";
      el.innerHTML = `<iframe src="https://player.vimeo.com/video/${v.id}?${q}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video player"></iframe>`;
    });
  }
  window.initVideos = (root = document) => root.querySelectorAll(".video[data-vimeo]").forEach(setup);
})();
