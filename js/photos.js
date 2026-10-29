/* Work page: Photography section. The photos and their order come from assets/photos/photos.json, which is rebuilt
   automatically from whatever is in assets/photos/ (see tools/build_photos.py and assets/photos/order.txt).
   Clicking a photo opens it full screen: close with the X, Esc, or a click outside it; arrow keys move between photos. */
(function () {
  const sec = document.getElementById("photography"), grid = document.getElementById("photo-grid");
  if (!sec || !grid) return;
  fetch("assets/photos/photos.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : []).catch(() => []).then(list => {
  if (!Array.isArray(list) || !list.length) return;
  sec.hidden = false;
  const count = document.getElementById("photo-count");
  if (count) count.textContent = `${list.length} ${list.length === 1 ? "photo" : "photos"}`;
  const small = p => p.thumb || p.src.replace(/([^/]+)$/, "small/$1");   // grid-size copy (900px) of each photo
  const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  grid.innerHTML = list.map((p, i) => `<figure class="photo"><button type="button" data-i="${i}" aria-label="Open photo${p.caption ? ": " + esc(p.caption) : ""}"><img src="${esc(small(p))}" srcset="${esc(small(p))} 900w, ${esc(p.src)} 2000w" sizes="${i === 0 ? "(max-width:760px) 100vw, 66vw" : "(max-width:760px) 100vw, 33vw"}" alt="${esc(p.alt || p.caption || "Photograph by Edward Peacock")}" loading="lazy" decoding="async"></button>${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""}</figure>`).join("");

  let box = null, cur = 0, opener = null;
  const show = i => {
    cur = (i + list.length) % list.length;
    const p = list[cur];
    box.querySelector("img").src = p.src;
    box.querySelector("img").alt = p.alt || p.caption || "Photograph by Edward Peacock";
    box.querySelector(".pv-cap").textContent = p.caption || "";
  };
  const close = () => { if (!box) return; box.remove(); box = null; document.removeEventListener("keydown", key); document.documentElement.style.overflow = ""; if (opener) opener.focus(); };
  const key = e => { if (e.key === "Escape") close(); else if (e.key === "ArrowRight") show(cur + 1); else if (e.key === "ArrowLeft") show(cur - 1); };
  const open = (i, btn) => {
    opener = btn;
    box = document.createElement("div");
    box.className = "pv"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Photo");
    box.innerHTML = `<figure class="pv-fig"><img alt=""><figcaption class="pv-cap"></figcaption></figure>
      <button type="button" class="pv-close" aria-label="Close">&times;</button>
      ${list.length > 1 ? `<button type="button" class="pv-nav pv-prev" aria-label="Previous photo">&#8249;</button><button type="button" class="pv-nav pv-next" aria-label="Next photo">&#8250;</button>` : ""}`;
    box.addEventListener("click", e => {
      if (e.target.closest(".pv-close") || e.target === box) close();
      else if (e.target.closest(".pv-prev")) show(cur - 1);
      else if (e.target.closest(".pv-next")) show(cur + 1);
    });
    document.body.appendChild(box);
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    show(i);
    box.querySelector(".pv-close").focus();
  };
  grid.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (b) open(+b.dataset.i, b); });
  });
})();
