/* Work page: Photography section. The photos and their order come from assets/photos/photos.json, which is rebuilt
   automatically from whatever is in assets/photos/ (see tools/build_photos.py and assets/photos/order.txt).
   Clicking a photo opens it full screen: close with the X, Esc, or a click outside it; arrow keys move between photos. */
(function () {
  const sec = document.getElementById("photography"), grid = document.getElementById("photo-grid");
  if (!sec || !grid) return;
  fetch("assets/photos/photos.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : []).catch(() => []).then(list => {
  if (!Array.isArray(list) || !list.length) return;
  sec.hidden = false;
  if (location.hash === "#photography") requestAnimationFrame(() => sec.scrollIntoView());
  const count = document.getElementById("photo-count");
  if (count) count.textContent = `${list.length} ${list.length === 1 ? "photo" : "photos"}`;
  const small = p => p.thumb || p.src.replace(/([^/]+)$/, "small/$1");   // grid-size copy (900px) of each photo
  const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  grid.innerHTML = list.map((p, i) => `<figure class="photo${p.h > p.w ? " tall" : ""}" data-photo="${esc(p.src.split("/").pop().split("?")[0].replace(/\.jpg$/, ""))}"><button type="button" data-i="${i}" aria-label="Open photo${p.caption ? ": " + esc(p.caption) : ""}"><img src="${esc(small(p))}" srcset="${esc(small(p))} 900w, ${esc(p.src)} 2000w" sizes="${i === 0 ? "(max-width:760px) 100vw, 66vw" : "(max-width:760px) 100vw, 33vw"}" alt="${esc(p.alt || p.caption || "Photograph by Edward Peacock")}" loading="lazy" decoding="async"></button>${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""}</figure>`).join("");

  // Phone (upright) gallery: some photos get a full row; the rest go two per row. Tall photos are paired with each other
  // and small ones with each other, so the grid has no holes. Other screens keep the normal order.
  const WIDE = ["tealights", "shutters-graffiti", "graffiti-wall", "hillside", "woodland-road", "cathedral-organ"];
  const figs = [...grid.children];
  figs.forEach((f, i) => { if (i === 0 || i === figs.length - 1 || WIDE.includes(f.dataset.photo)) f.classList.add("wide-phone"); });
  const portraitPhone = matchMedia("(max-width:760px) and (orientation:portrait)");
  const layoutPhone = () => {
    figs.forEach(f => { f.style.order = ""; f.classList.remove("solo-phone"); });
    if (!portraitPhone.matches) return;
    let o = 0; const wait = { tall: [], small: [] };
    figs.forEach(f => {
      if (f.classList.contains("wide-phone")) { f.style.order = o++; return; }
      const q = wait[f.classList.contains("tall") ? "tall" : "small"]; q.push(f);
      if (q.length === 2) { q.forEach(x => x.style.order = o++); q.length = 0; }
    });
    [...wait.tall, ...wait.small].forEach(f => { f.classList.add("solo-phone"); f.style.order = o++; });   // an odd one out gets a full row
  };
  layoutPhone(); portraitPhone.addEventListener("change", layoutPhone);

  let box = null, cur = 0, opener = null;
  const show = i => {
    cur = (i + list.length) % list.length;
    const p = list[cur];
    box.querySelector("img").src = p.src;
    box.querySelector("img").alt = p.alt || p.caption || "Photograph by Edward Peacock";
    box.querySelector(".pv-cap").textContent = p.caption || "";
    box.classList.toggle("pv-tall", p.h > p.w);   // upright photos sit higher on phones so the details fit under them
    box.querySelectorAll(".pv-count").forEach(c => c.textContent = `${cur + 1} / ${list.length}`);
    resetZoom();
    // Photo details, bottom-left corner of the photo (full-screen view only)
    const line1 = [p.camera, p.settings].filter(Boolean).join(" · ");
    const line2 = [p.location, p.date].filter(Boolean).join(" · ");
    const meta = box.querySelector(".pv-meta");
    meta.innerHTML = (line1 ? `<span class="pv-cam">${esc(line1)}</span>` : "") + (line2 ? `<span>${esc(line2)}</span>` : "");
    meta.hidden = !(line1 || line2);
    // Phones: the same details as a list under the photo, behind an "Info" button
    const rows = [["Camera", p.camera], ["Settings", p.settings], ["Location", p.location], ["Date", p.date]].filter(r => r[1]);
    box.querySelector(".pv-info").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");
    box.querySelector(".pv-info-btn").hidden = !rows.length;
  };
  let infoOpen = false;   // stays open while flicking between photos
  // Opening a photo adds a history step, so the phone/browser Back button closes the photo instead of leaving the page
  const shut = () => { if (!box) return; box.remove(); box = null; document.removeEventListener("keydown", key); document.documentElement.style.overflow = ""; if (opener) opener.focus({ preventScroll: true }); };
  const close = () => { if (!box) return; if (history.state && history.state.pv) history.back(); else shut(); };
  addEventListener("popstate", () => { if (box) shut(); });

  // Phones: pinch (or double-tap) to zoom, drag to look around when zoomed; swipe left/right for the next photo, swipe down to close
  let z = 1, tx = 0, ty = 0;
  const apply = () => { const im = box && box.querySelector(".pv-frame img"); if (im) { im.style.transform = z > 1 ? `translate(${tx}px,${ty}px) scale(${z})` : ""; box.classList.toggle("pv-zoomed", z > 1); } };
  function resetZoom() { z = 1; tx = 0; ty = 0; apply(); }
  const phone = () => matchMedia("(max-width:760px), (orientation:landscape) and (max-height:500px)").matches;   // phones, either way up
  const touchSetup = () => {
    const frame = box.querySelector(".pv-frame");
    let start = null, pinch = null, lastTap = 0;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const clamp = () => { const im = frame.querySelector("img"), mx = im.offsetWidth * (z - 1) / 2, my = im.offsetHeight * (z - 1) / 2; tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty)); };
    box.addEventListener("touchstart", e => {
      if (!phone()) return;
      if (e.touches.length === 2 && e.target.closest(".pv-frame")) { pinch = { d: dist(e.touches), z }; start = null; return; }
      if (e.touches.length === 1) start = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx, ty, t: Date.now() };
    }, { passive: true });
    box.addEventListener("touchmove", e => {
      if (!phone()) return;
      if (pinch && e.touches.length === 2) { e.preventDefault(); z = Math.max(1, Math.min(4, pinch.z * dist(e.touches) / pinch.d)); clamp(); apply(); return; }
      if (start && z > 1 && e.touches.length === 1) { e.preventDefault(); tx = start.tx + e.touches[0].clientX - start.x; ty = start.ty + e.touches[0].clientY - start.y; clamp(); apply(); }
    }, { passive: false });
    box.addEventListener("touchend", e => {
      if (!phone()) return;
      if (pinch) { if (e.touches.length < 2) { pinch = null; if (z < 1.05) resetZoom(); } return; }
      if (!start || e.touches.length) return;
      const t = e.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y, quick = Date.now() - start.t < 600;
      const onPhoto = e.target.closest(".pv-frame");
      if (z === 1 && quick && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(cur + (dx < 0 ? 1 : -1));
      else if (z === 1 && quick && dy > 80 && dy > Math.abs(dx) * 1.3) close();
      else if (onPhoto && Math.abs(dx) < 10 && Math.abs(dy) < 10) {   // double-tap the photo to zoom in / out
        if (Date.now() - lastTap < 300) { if (z > 1) resetZoom(); else { z = 2.5; tx = 0; ty = 0; apply(); } lastTap = 0; } else lastTap = Date.now();
      }
      start = null;
    });
  };
  const key = e => { if (e.key === "Escape") close(); else if (e.key === "ArrowRight") show(cur + 1); else if (e.key === "ArrowLeft") show(cur - 1); };
  const open = (i, btn) => {
    opener = btn;
    box = document.createElement("div");
    box.className = "pv"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Photo");
    box.innerHTML = `<p class="pv-count pv-count-desk" aria-live="polite"></p>
      <figure class="pv-fig"><div class="pv-top"><button type="button" class="pv-close" aria-label="Close">&times;</button></div>
      <div class="pv-frame"><img alt=""><p class="pv-meta"></p></div><figcaption class="pv-cap"></figcaption>
      <div class="pv-below"><div class="pv-row"><button type="button" class="pv-info-btn" aria-expanded="${infoOpen}" aria-controls="pv-info"><span>Info</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button><p class="pv-count pv-count-phone"></p></div>
      <dl class="pv-info" id="pv-info"${infoOpen ? "" : " hidden"}></dl></div></figure>
      ${list.length > 1 ? `<button type="button" class="pv-nav pv-prev" aria-label="Previous photo">&#8249;</button><button type="button" class="pv-nav pv-next" aria-label="Next photo">&#8250;</button>` : ""}`;
    box.addEventListener("click", e => {
      const ib = e.target.closest(".pv-info-btn");
      if (ib) { infoOpen = !infoOpen; ib.setAttribute("aria-expanded", String(infoOpen)); box.querySelector(".pv-info").hidden = !infoOpen; return; }
      if (e.target.closest(".pv-close") || e.target === box || e.target.classList.contains("pv-fig")) close();
      else if (e.target.closest(".pv-prev")) show(cur - 1);
      else if (e.target.closest(".pv-next")) show(cur + 1);
    });
    document.body.appendChild(box);
    touchSetup();
    history.pushState({ pv: true }, "");
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    show(i);
    if (matchMedia("(hover:hover)").matches) box.querySelector(".pv-close").focus();   // keyboard/mouse users; no focus box on phones
  };
  grid.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (b) open(+b.dataset.i, b); });
  });
})();
