/* Breakdown "examine" mode: a full-screen viewer opened by the Zoom button on the breakdown.
   Mouse wheel / pinch / + - buttons zoom (towards the cursor), drag to move around, double-click toggles a close-up,
   arrow keys or the side buttons step through the breakdown images keeping the same zoom (handy for comparing),
   and the Exit button or Esc leaves examine mode. Images are drawn as CSS backgrounds, never as <img>, so there is no
   "open / save image" menu. window.openBreakdownViewer(steps, startIndex, openerButton) is called from js/projects.js. */
(function () {
  let current = null;
  const pad = n => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ic = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    x: ic('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    plus: ic('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
    minus: ic('<line x1="5" y1="12" x2="19" y2="12"/>'),
    fit: ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    prev: ic('<polyline points="15 18 9 12 15 6"/>'),
    next: ic('<polyline points="9 18 15 12 9 6"/>')
  };

  window.openBreakdownViewer = function (steps, start, opener) {
    if (current || !steps || !steps.length) return;
    const N = steps.length, TOP = 64, BOT = 76;
    let k = clamp(start | 0, 0, N - 1);

    const el = document.createElement("div");
    el.className = "bd-viewer"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Zoomed view of breakdown image");
    el.innerHTML = `<div class="bdv-canvas"><div class="bdv-img"></div></div>
      <div class="bdv-top"><div class="bdv-title"><span class="bdv-num"></span><span class="bdv-name"></span></div>
        <button type="button" class="bdv-exit" aria-label="Exit zoom">${I.x}<span>Exit zoom</span></button></div>
      <p class="bdv-hint">${matchMedia("(pointer:coarse)").matches ? "Pinch to zoom · drag to move" : "Scroll to zoom · drag to move · double-click for a close-up · Esc to exit"}</p>
      <div class="bdv-bar">
        <button type="button" class="bdv-btn" data-a="prev" aria-label="Previous image">${I.prev}</button>
        <button type="button" class="bdv-btn" data-a="out" aria-label="Zoom out">${I.minus}</button>
        <span class="bdv-pct" aria-live="polite"></span>
        <button type="button" class="bdv-btn" data-a="in" aria-label="Zoom in">${I.plus}</button>
        <button type="button" class="bdv-btn" data-a="fit" aria-label="Fit to screen">${I.fit}</button>
        <button type="button" class="bdv-btn" data-a="next" aria-label="Next image">${I.next}</button>
      </div>`;
    document.body.appendChild(el);
    const $ = s => el.querySelector(s);
    const canvas = $(".bdv-canvas"), img = $(".bdv-img"), pct = $(".bdv-pct"), hint = $(".bdv-hint");
    const bPrev = $('[data-a="prev"]'), bNext = $('[data-a="next"]');

    // z = zoom (1 = fit to screen), x/y = screen position of the image's top-left. t* = where we are heading, the rest is what is drawn.
    let W, H, iw, ih, fit, bw, bh, maxZ, z = 1, x = 0, y = 0, tz = 1, tx = 0, ty = 0, raf = 0, last = 0;

    function bounds(nz) {
      const sw = bw * nz, sh = bh * nz, ah = H - TOP - BOT;
      return {
        x: sw <= W ? [(W - sw) / 2, (W - sw) / 2] : [W - sw, 0],
        y: sh <= ah ? [TOP + (ah - sh) / 2, TOP + (ah - sh) / 2] : sh <= H ? [(H - sh) / 2, (H - sh) / 2] : [H - sh, 0]
      };
    }
    function limit() { const b = bounds(tz); tx = clamp(tx, b.x[0], b.x[1]); ty = clamp(ty, b.y[0], b.y[1]); }
    function paint() {
      img.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(${z.toFixed(4)})`;
      pct.textContent = Math.round(tz * fit * 100) + "%";
      canvas.classList.toggle("zoomed", tz > 1.01);
    }
    function frame(now) {
      const f = 1 - Math.exp(-Math.min(64, now - last || 16) / 85); last = now;
      z += (tz - z) * f; x += (tx - x) * f; y += (ty - y) * f;
      const done = Math.abs(tz - z) < 0.0005 && Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1;
      if (done) { z = tz; x = tx; y = ty; }
      paint(); raf = done ? 0 : requestAnimationFrame(frame);
    }
    const kick = () => { limit(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const snap = () => { limit(); z = tz; x = tx; y = ty; paint(); };
    function zoomAt(nz, cx, cy) {
      nz = clamp(nz, 1, maxZ); const r = nz / tz;
      tx = cx - (cx - tx) * r; ty = cy - (cy - ty) * r; tz = nz; kick();
    }
    function toFit() { tz = 1; const b = bounds(1); tx = b.x[0]; ty = b.y[0]; kick(); }

    function size() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      iw = steps[k].w || 1600; ih = steps[k].h || 900;
      fit = Math.max(0.01, Math.min(W * 0.98 / iw, (H - TOP - BOT) / ih));
      bw = iw * fit; bh = ih * fit; maxZ = Math.max(3, 4 / fit);          // up to 400% of the image's real pixels
      img.style.width = bw + "px"; img.style.height = bh + "px";
      tz = Math.min(tz, maxZ);
    }
    function show(n) {
      // keep looking at the same part of the picture when stepping, so two stages can be compared
      const fx = (W / 2 - tx) / (bw * tz), fy = (H / 2 - ty) / (bh * tz);
      k = n; size();
      tx = W / 2 - fx * bw * tz; ty = H / 2 - fy * bh * tz;
      img.style.backgroundImage = `url('${steps[k].src}')`;
      $(".bdv-num").textContent = `${pad(k + 1)} / ${pad(N)}`; $(".bdv-name").textContent = steps[k].label;
      bPrev.disabled = k === 0; bNext.disabled = k === N - 1;
      snap();
    }

    // Pointer: drag to pan, two fingers to pinch
    const ptrs = new Map(); let drag = null, pinch = null;
    const mid = () => { const a = [...ptrs.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1 }; };
    canvas.addEventListener("pointerdown", e => {
      if (e.button) return;
      canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { const m = mid(); pinch = { z: tz, d: m.d, ix: (m.x - tx) / tz, iy: (m.y - ty) / tz }; drag = null; }
      else { drag = { sx: e.clientX, sy: e.clientY, ox: tx, oy: ty }; canvas.classList.add("drag"); }
    });
    canvas.addEventListener("pointermove", e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) {
        const m = mid(); tz = clamp(pinch.z * m.d / pinch.d, 1, maxZ);
        tx = m.x - pinch.ix * tz; ty = m.y - pinch.iy * tz; snap();
      } else if (drag) { tx = drag.ox + e.clientX - drag.sx; ty = drag.oy + e.clientY - drag.sy; snap(); }
    });
    const up = e => {
      ptrs.delete(e.pointerId); pinch = null;
      const r = [...ptrs.values()][0];
      drag = r ? { sx: r.x, sy: r.y, ox: tx, oy: ty } : null;
      if (!r) canvas.classList.remove("drag");
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("dblclick", e => { if (tz > 1.05) toFit(); else zoomAt(Math.min(maxZ, 3), e.clientX, e.clientY); });
    el.addEventListener("wheel", e => {
      e.preventDefault();                                     // stops the page behind from scrolling (js/smooth-scroll.js ignores handled wheel events)
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? H : 1);
      zoomAt(tz * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX, e.clientY);
    }, { passive: false });

    // Buttons
    const act = { in: () => zoomAt(tz * 1.5, W / 2, H / 2), out: () => zoomAt(tz / 1.5, W / 2, H / 2), fit: toFit, prev: () => k > 0 && show(k - 1), next: () => k < N - 1 && show(k + 1) };
    el.querySelectorAll(".bdv-btn").forEach(b => b.addEventListener("click", () => act[b.dataset.a]()));
    $(".bdv-exit").addEventListener("click", close);

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); return close(); }
      if (e.key === "Tab") {                                   // keep keyboard focus inside the viewer
        const f = [...el.querySelectorAll("button:not(:disabled)")], i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const m = { "+": "in", "=": "in", "-": "out", "_": "out", "0": "fit", ArrowLeft: "prev", ArrowRight: "next" }[e.key];
      if (m) { e.preventDefault(); act[m](); }
      else if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) e.preventDefault();   // do not scroll the page behind
    }
    const onResize = () => { const fx = (W / 2 - tx) / (bw * tz), fy = (H / 2 - ty) / (bh * tz); size(); tx = W / 2 - fx * bw * tz; ty = H / 2 - fy * bh * tz; snap(); };
    document.addEventListener("keydown", onKey, true); addEventListener("resize", onResize);

    function close() {
      if (!current) return; current = null;
      document.removeEventListener("keydown", onKey, true); removeEventListener("resize", onResize); cancelAnimationFrame(raf);
      el.classList.remove("on"); setTimeout(() => el.remove(), 240);
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }
    current = { close };

    size(); show(k); toFit(); snap();
    requestAnimationFrame(() => el.classList.add("on"));
    $(".bdv-exit").focus({ preventScroll: true });
    setTimeout(() => hint.classList.add("gone"), 4500);
  };
})();
