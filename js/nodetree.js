/* Nuke node tree: draws a Nuke script's node graph (made from the .nk by tools/nk2tree.py) so visitors can zoom right in.
   Everything is drawn as vectors on a canvas at the screen's own resolution, so it stays sharp at any zoom.
   - On the project page: a preview of the whole tree (click to open).
   - window.openNodeTree(data, title, opener): full-screen explorer. Scroll / pinch to zoom, drag to move, double-click to zoom in,
     hover (or tap) a node for its name and type, and the chips along the top jump to each backdrop (CG, RELIGHT, LENS FX...).
   Project data: nodeTree: "assets/nodetrees/<slug>.json" in data/site.js. */
(function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const NODE_W = 80, NODE_H = 18, DOT = 12;
  // Heights as Nuke draws them when the script does not tell us (most nodes come with their real size from tools/nk2tree.py)
  const defH = c => /^(Read|DeepRead)$/.test(c) ? 78 : NODE_H;
  const NUKE_FONT = "Verdana, 'DejaVu Sans', 'Bitstream Vera Sans', Arial, sans-serif";

  // Nuke's default node colours by type (a node's own tile_color wins when it has one)
  const CAT = [
    [/^(Read|Write|DeepRead|ReadGeo\d*|WriteGeo|Input|Output|Viewer)$/, 0xb4b4b4],
    [/^(Merge2|Merge|Copy|CopyBBox|ChannelMerge|Switch|Dissolve|Keymix|MergeExpression|ShuffleCopy|Premult|Unpremult|AddMix|ContactSheet|LayerContactSheet)$/, 0x4b5ec6],
    [/^(Grade|ColorCorrect|Multiply|Gamma|Clamp|Saturation|Invert|Add|Expression|Colorspace|OCIOColorSpace|OCIOCDLTransform|HueCorrect|HueShift|ColorLookup|Exposure|Histogram|Toe2|Log2Lin|Posterize|Grain2|F_ReGrain|DegrainSimple|Denoise2|Noise)$/, 0x7aa9ff],
    [/^(Blur|Defocus|ZDefocus2|EdgeBlur|EdgeExtend|Erode|FilterErode|Dilate|Sharpen|Soften|Glow|Median|MotionBlur|VectorBlur2|VectorBlur|Convolve2|Laplacian|EdgeDetectWrapper|Matrix|DirBlurWrapper|NoTimeBlur)$/, 0xcc804e],
    [/^(Transform|TransformMasked|Reformat|Crop|Mirror|Mirror2|STMap|IDistort|Tracker4|CornerPin2D|AdjBBox|BlackOutside|OutputBBox|Position|SplineWarp3|GridWarp3|LensDistortion2|Card3D|Tile|Flip|Flop|Reconcile3D)$/, 0xa57aaa],
    [/^(Shuffle|Shuffle2|Remove|AddChannels|Achannels|Bchannels|Cryptomatte|ChannelMerge2)$/, 0x9e3c63],
    [/^(Keyer|Keylight|Primatte3|Primatte|IBKColourV3|IBKGizmoV3|ChromaKeyer|HueKeyer|Difference|Ultimatte)$/, 0x6cc14e],
    [/^(Roto|RotoPaint|Constant|Ramp|Radial|Rectangle|Text2|CheckerBoard2|ColorBars|ColorWheel)$/, 0xc8c8c8],
    [/^(Scene|TransformGeo|Camera|Camera2|Camera3|Card|Card2|ScanlineRender|ScanlineRender2|Axis|Axis2|Axis3|Sphere|Cube|ReadGeo2|ApplyMaterial|Project3D|Project3D2|Light|Light2|DirectLight|Spotlight|PointCloudGenerator|Constant3D)$/, 0x5f9f5f],
    [/^(FrameHold|FrameRange|TimeOffset|Retime|TimeWarp|Kronos|OFlow2|TimeEcho|FrameBlend|Oflow2)$/, 0xb2a45e],
    [/^(Group|LiveGroup|Gizmo)$/, 0xb8b8b8],
    [/^(NoOp|Dot|Clone)$/, 0xa0a0a0]
  ];
  const defColour = c => { for (const [re, col] of CAT) if (re.test(c)) return col; return 0xa0a0a0; };
  const rgb = v => [(v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const css = (v, a) => { const [r, g, b] = rgb(v); return a == null ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`; };
  const shade = (v, k) => { const [r, g, b] = rgb(v), f = x => Math.round(clamp(k > 1 ? x + (255 - x) * (k - 1) * .6 : x * k, 0, 255)); return `rgb(${f(r)},${f(g)},${f(b)})`; };
  const lum = v => { const [r, g, b] = rgb(v); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  // Prepare a tree once: sizes, colours, bounds and a label list for the backdrop chips
  function prepare(d) {
    if (d._ready) return d;
    d.nodes.forEach(n => {
      const dot = n.c === "Dot";
      n.w = dot ? DOT : (n.w || NODE_W); n.h = dot ? DOT : (n.h || defH(n.c));
      n.col = n.t ? n.t >>> 8 : defColour(n.c);
    });
    d.backdrops.forEach(b => { b.col = b.t ? b.t >>> 8 : 0x7f7f7f; b.area = b.w * b.h; });
    d.backdrops.sort((a, b) => (a.z - b.z) || (b.area - a.area));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (x, y, w, h) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h); };
    d.nodes.forEach(n => grow(n.x, n.y, n.w, n.h));
    d.backdrops.forEach(b => grow(b.x, b.y, b.w, b.h));
    d.bounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    // Backdrops with a short title become jump chips, top to bottom
    const seen = new Set();
    d.chips = d.backdrops.map(b => ({ b, t: (b.l || "").split("\n")[0].trim() }))
      .filter(c => c.t && c.t.length <= 28 && c.t === c.t.toUpperCase() && /[A-Z]/.test(c.t) && !seen.has(c.t) && seen.add(c.t))
      .sort((a, b) => (a.b.y - b.b.y) || (a.b.x - b.b.x));
    d._ready = true;
    return d;
  }

  // Line from centre to centre, trimmed to the two boxes' edges
  function trim(ax, ay, bx, by, w, h) {
    const dx = bx - ax, dy = by - ay;
    if (!dx && !dy) return [bx, by];
    const tx = dx ? (w / 2) / Math.abs(dx) : Infinity, ty = dy ? (h / 2) / Math.abs(dy) : Infinity;
    const t = Math.min(tx, ty, 1);
    return [bx - dx * t, by - dy * t];
  }

  // Draw the tree. view = {s: scale, x, y: screen offset of graph origin}. hi = hovered node index (its links are highlighted).
  function draw(ctx, d, view, W, H, opt) {
    opt = opt || {};
    const s = view.s, px = 1 / s;   // px = one screen pixel in graph units
    ctx.setTransform(opt.dpr, 0, 0, opt.dpr, 0, 0);
    ctx.fillStyle = opt.bg || "#323232"; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(opt.dpr * s, 0, 0, opt.dpr * s, opt.dpr * view.x, opt.dpr * view.y);
    const vx0 = -view.x / s, vy0 = -view.y / s, vx1 = vx0 + W / s, vy1 = vy0 + H / s;
    const vis = (x, y, w, h) => x + w >= vx0 && y + h >= vy0 && x <= vx1 && y <= vy1;
    const font = (size, weight) => `${weight || 500} ${size}px Inter, system-ui, sans-serif`;

    // Backdrops
    d.backdrops.forEach(b => {
      if (!vis(b.x, b.y, b.w, b.h)) return;
      ctx.fillStyle = css(b.col); ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = px; ctx.strokeRect(b.x, b.y, b.w, b.h);
    });
    // Connections
    const hiSet = opt.hi != null ? opt.hi : -1;
    const drawEdges = highlighted => {
      d.edges.forEach(([a, b]) => {
        const on = a === hiSet || b === hiSet;
        if (on !== highlighted) return;
        const A = d.nodes[a], B = d.nodes[b];
        const ax = A.x + A.w / 2, ay = A.y + A.h / 2, bx = B.x + B.w / 2, by = B.y + B.h / 2;
        if (!vis(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + 1, Math.abs(by - ay) + 1)) return;
        const [ex, ey] = trim(ax, ay, bx, by, B.w, B.h);
        ctx.strokeStyle = on ? (opt.accent || "#7cc4bd") : "#0d0d0d";
        ctx.lineWidth = Math.max(1, on ? 2 : 1) * px * (s > 1 ? Math.min(s, 2) : 1);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
        if (B.c !== "Dot" && s > 0.18) {         // arrowhead into the node (not into Dots, as in Nuke)
          const len = Math.hypot(ex - ax, ey - ay) || 1, ux = (ex - ax) / len, uy = (ey - ay) / len, sz = Math.max(7, 4 * px);
          ctx.fillStyle = ctx.strokeStyle; ctx.beginPath();
          ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * sz - uy * sz * .45, ey - uy * sz + ux * sz * .45); ctx.lineTo(ex - ux * sz + uy * sz * .45, ey - uy * sz - ux * sz * .45);
          ctx.fill();
        }
      });
    };
    drawEdges(false); drawEdges(true);
    // Nodes
    const showText = s * 11 >= 6;
    d.nodes.forEach((n, i) => {
      if (!vis(n.x, n.y, n.w, n.h)) return;
      ctx.globalAlpha = n.d ? 0.45 : 1;
      if (n.c === "Dot") {
        ctx.fillStyle = css(n.col); ctx.beginPath(); ctx.arc(n.x + DOT / 2, n.y + DOT / 2, DOT / 2 - 1, 0, 7); ctx.fill();
        ctx.strokeStyle = i === hiSet ? (opt.accent || "#7cc4bd") : "#111"; ctx.lineWidth = (i === hiSet ? 2 : 1) * px; ctx.stroke();
      } else {
        // Nuke's "Shade Nodes" look: each tile has a soft vertical gradient, lighter at the top
        const g = ctx.createLinearGradient(0, n.y, 0, n.y + Math.min(n.h, 40));
        g.addColorStop(0, shade(n.col, 1.18)); g.addColorStop(0.5, css(n.col)); g.addColorStop(1, shade(n.col, 0.8));
        ctx.fillStyle = g; ctx.fillRect(n.x, n.y, n.w, n.h);
        const stamp = /^(Read|DeepRead)$/.test(n.c) && n.h > 40;
        if (stamp) {   // postage stamp: the thumbnail area of a Read (the real frame isn't published)
          const tg = ctx.createLinearGradient(0, n.y + 3, 0, n.y + n.h - 17);
          tg.addColorStop(0, "#2a2a2a"); tg.addColorStop(1, "#141414");
          ctx.fillStyle = tg; ctx.fillRect(n.x + 3, n.y + 3, n.w - 6, n.h - 18);
        }
        ctx.strokeStyle = i === hiSet ? (opt.accent || "#7cc4bd") : "#000"; ctx.lineWidth = (i === hiSet ? 2.5 : 1) * px; ctx.strokeRect(n.x, n.y, n.w, n.h);
        if (n.d) { ctx.strokeStyle = "rgba(200,40,40,.9)"; ctx.lineWidth = 1.5 * px; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.x + n.w, n.y + n.h); ctx.stroke(); }
        if (showText) {
          // Nuke writes node names in black (white only on very dark tiles), in its plain UI font
          ctx.fillStyle = lum(n.col) > 0.22 ? "#000" : "#e6e6e6"; ctx.font = `400 11px ${NUKE_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const ty = stamp ? n.y + n.h - 8 : n.y + 9.5;
          ctx.fillText(n.n, n.x + n.w / 2, ty, n.w - 4);
          if (n.l && !stamp) {   // the node's label, inside the tile under its name, as in Nuke
            ctx.font = `400 10px ${NUKE_FONT}`;
            n.l.split("\n").slice(0, Math.max(0, Math.floor((n.h - 18) / 12))).forEach((t, k) => ctx.fillText(t, n.x + n.w / 2, n.y + 21 + k * 12, n.w - 4));
          }
        }
      }
      ctx.globalAlpha = 1;
      if (showText && n.l && n.c !== "Dot" && n.h < 30) {   // no room inside the tile: the label sits just under it
        ctx.fillStyle = "rgba(235,235,235,.85)"; ctx.font = font(9.5, 400); ctx.textAlign = "center"; ctx.textBaseline = "top";
        n.l.split("\n").slice(0, 3).forEach((t, k) => ctx.fillText(t, n.x + n.w / 2, n.y + n.h + 3 + k * 11, 160));
      }
    });
    // Backdrop titles last, so nodes never cover them. Kept readable when zoomed out (but never bigger than their backdrop).
    d.backdrops.forEach(b => {
      if (!b.l || !vis(b.x, b.y, b.w, b.h)) return;
      const onScreen = b.w * s; if (onScreen < 50) return;
      const size = Math.max(b.fs || 14, 11 * px), lines = b.l.split("\n").filter((t, k, a) => t || k < a.length - 1);
      ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
      ctx.fillStyle = lum(b.col) > 0.6 ? "rgba(0,0,0,.85)" : "rgba(255,255,255,.92)";
      ctx.font = `400 ${size}px ${NUKE_FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
      lines.slice(0, s * size < 13 ? 1 : 12).forEach((t, k) => ctx.fillText(t, b.x + size * .45, b.y + size * .35 + k * size * 1.2));
      ctx.restore();
    });
  }

  const hitTest = (d, gx, gy) => {
    for (let i = d.nodes.length - 1; i >= 0; i--) { const n = d.nodes[i], m = 3; if (gx >= n.x - m && gx <= n.x + n.w + m && gy >= n.y - m && gy <= n.y + n.h + m) return i; }
    return -1;
  };
  const fitView = (d, W, H, pad) => {
    const b = d.bounds, s = Math.min((W - pad * 2) / b.w, (H - pad * 2) / b.h);
    return { s, x: (W - b.w * s) / 2 - b.x * s, y: (H - b.h * s) / 2 - b.y * s };
  };
  const cache = {};
  const load = url => cache[url] || (cache[url] = fetch(url, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error("missing"); return r.json(); }).then(prepare));
  const accent = () => getComputedStyle(document.documentElement).getPropertyValue("--accent-hi").trim() || "#7cc4bd";

  window.NodeTreeRender = { draw, prepare };   // used for testing / other pages

  // ---------- Preview on the project page ----------
  window.mountNodeTree = function (mount, url, title) {
    load(url).then(d => {
      mount.innerHTML = `<section class="wrap nt-block"><h2 class="desc-title">Node tree</h2>
        <p class="desc">The full Nuke script behind this shot: ${d.nodes.filter(n => n.c !== "Dot").length} nodes${d.chips.length ? ` across ${d.chips.length} labelled sections` : ""}. Open it and zoom in to read every node.</p>
        <button type="button" class="nt-preview" aria-label="Open the node tree to zoom in"><canvas aria-hidden="true"></canvas>
          <span class="nt-open"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>Explore the node tree</span></button></section>`;
      const btn = mount.querySelector(".nt-preview"), cv = btn.querySelector("canvas"), ctx = cv.getContext("2d");
      const paint = () => {
        const W = btn.clientWidth, H = btn.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
        if (!W || !H) return;
        cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
        draw(ctx, d, fitView(d, W, H, 18), W, H, { dpr, bg: "#232326", accent: accent() });
      };
      paint(); addEventListener("resize", paint);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
      btn.addEventListener("click", () => window.openNodeTree(d, title, btn));
    }).catch(() => { mount.innerHTML = ""; });
  };

  // ---------- Full-screen explorer ----------
  const ic = p => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  window.openNodeTree = function (d, title, opener) {
    if (document.querySelector(".nt-viewer")) return;
    const touch = matchMedia("(pointer:coarse)").matches;
    const el = document.createElement("div");
    el.className = "bd-viewer nt-viewer"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", `Node tree of ${title}`);
    el.innerHTML = `<canvas class="nt-canvas" aria-hidden="true"></canvas>
      <div class="bdv-top"><div class="bdv-title"><span class="bdv-num">Node tree</span><span class="bdv-name">${title}</span></div>
        <button type="button" class="bdv-exit" aria-label="Close node tree">${ic('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')}<span>Close</span></button></div>
      ${d.chips.length ? `<div class="nt-chips" role="toolbar" aria-label="Jump to a section">${d.chips.map((c, k) => `<button type="button" data-k="${k}">${c.t}</button>`).join("")}</div>` : ""}
      <div class="nt-tip" hidden></div>
      <p class="bdv-hint">${touch ? "Pinch to zoom · drag to move · tap a node for its name" : "Scroll to zoom · drag to move · hover a node for its name · Esc to close"}</p>
      <div class="bdv-bar">
        <button type="button" class="bdv-btn" data-a="out" aria-label="Zoom out">${ic('<line x1="5" y1="12" x2="19" y2="12"/>')}</button>
        <span class="bdv-pct" aria-live="polite"></span>
        <button type="button" class="bdv-btn" data-a="in" aria-label="Zoom in">${ic('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>')}</button>
        <button type="button" class="bdv-btn" data-a="fit" aria-label="Show the whole tree">${ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</button>
      </div>`;
    document.body.appendChild(el);
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(() => el.classList.add("on"));
    setTimeout(() => { const h = el.querySelector(".bdv-hint"); if (h) h.classList.add("gone"); }, 5000);
    const cv = el.querySelector("canvas"), ctx = cv.getContext("2d"), tip = el.querySelector(".nt-tip"), pct = el.querySelector(".bdv-pct");
    const col = accent();
    let W = 0, H = 0, dpr = 1, view = { s: 1, x: 0, y: 0 }, fit = view, hi = -1, raf = 0, anim = null;
    const MAXS = 3;
    const minS = () => fit.s * 0.6;
    const paint = () => { raf = 0; draw(ctx, d, view, W, H, { dpr, hi, accent: col }); pct.textContent = (view.s < 0.1 ? (view.s * 100).toFixed(1) : Math.round(view.s * 100)) + "%"; };   // 100% = Nuke at 1:1
    const req = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const size = () => {
      W = el.clientWidth; H = el.clientHeight; dpr = Math.min(3, devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
      const top = 130, bot = 90; const f = fitView(d, W, H - top - bot, 24); f.y += top; fit = f;
    };
    const zoomAt = (k, sx, sy) => {
      const ns = clamp(view.s * k, minS(), MAXS); k = ns / view.s;
      view = { s: ns, x: sx - (sx - view.x) * k, y: sy - (sy - view.y) * k }; req();
    };
    const animateTo = (to, ms) => {
      const from = { ...view }, t0 = performance.now(); ms = ms || 450;
      cancelAnimationFrame(anim);
      const step = now => {
        const t = clamp((now - t0) / ms, 0, 1), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        // zoom in log space so it feels even
        const s = Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * e);
        const cx = (W / 2 - from.x) / from.s + ((W / 2 - to.x) / to.s - (W / 2 - from.x) / from.s) * e;
        const cy = (H / 2 - from.y) / from.s + ((H / 2 - to.y) / to.s - (H / 2 - from.y) / from.s) * e;
        view = { s, x: W / 2 - cx * s, y: H / 2 - cy * s }; paint();
        if (t < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    size(); view = { ...fit }; paint();

    // Tooltip
    const showTip = (i, sx, sy) => {
      if (i < 0) { tip.hidden = true; return; }
      const n = d.nodes[i];
      tip.innerHTML = `<strong></strong><span></span>`; tip.firstChild.textContent = n.n; tip.lastChild.textContent = n.c + (n.d ? " · disabled" : "") + (n.l ? " · " + n.l.replace(/\n/g, " ") : "");
      tip.hidden = false;
      const r = tip.getBoundingClientRect();
      tip.style.left = clamp(sx + 14, 8, W - r.width - 8) + "px"; tip.style.top = clamp(sy + 16, 8, H - r.height - 8) + "px";
    };
    const toGraph = (sx, sy) => [(sx - view.x) / view.s, (sy - view.y) / view.s];

    // Pointer: drag to pan, two fingers to pinch, tap a node for its name
    const pts = new Map(); let last = null, pinch = null, moved = 0;
    cv.addEventListener("pointerdown", e => {
      cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; cancelAnimationFrame(anim);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; }
      last = { x: e.clientX, y: e.clientY }; el.classList.add("dragging");
    });
    cv.addEventListener("pointermove", e => {
      const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      if (!pts.has(e.pointerId)) {     // hover
        if (e.pointerType === "mouse") { const i = hitTest(d, ...toGraph(sx, sy)); if (i !== hi) { hi = i; req(); } showTip(i, sx, sy); cv.style.cursor = i >= 0 ? "pointer" : "grab"; }
        return;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()], dist = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt(dist / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); pinch.d = dist; moved += 10; return;
      }
      if (last && pts.size === 1) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y; moved += Math.abs(dx) + Math.abs(dy);
        view = { ...view, x: view.x + dx, y: view.y + dy }; last = { x: e.clientX, y: e.clientY }; req();
        if (moved > 4) tip.hidden = true;
      }
    });
    const up = e => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (!pts.size) {
        el.classList.remove("dragging");
        if (moved < 5) { const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, i = hitTest(d, ...toGraph(sx, sy)); hi = i; req(); showTip(i, sx, sy); }
      }
      const p = [...pts.values()][0]; last = p ? { ...p } : null;
    };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", e => {
      e.preventDefault(); cancelAnimationFrame(anim);
      const r = cv.getBoundingClientRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
      tip.hidden = true;
    }, { passive: false });
    cv.addEventListener("dblclick", e => { const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, k = Math.min(MAXS, view.s * 2.5) / view.s; animateTo({ s: view.s * k, x: sx - (sx - view.x) * k + (W / 2 - sx), y: sy - (sy - view.y) * k + (H / 2 - sy) }, 380); });

    // Buttons and chips
    el.querySelectorAll(".bdv-btn").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.a;
      if (a === "fit") return animateTo(fit);
      const k = a === "in" ? 1.8 : 1 / 1.8, ns = clamp(view.s * k, minS(), MAXS), kk = ns / view.s;
      animateTo({ s: ns, x: W / 2 - (W / 2 - view.x) * kk, y: H / 2 - (H / 2 - view.y) * kk }, 280);
    }));
    el.querySelectorAll(".nt-chips button").forEach(b => b.addEventListener("click", () => {
      const bd = d.chips[+b.dataset.k].b, top = 130, bot = 90;
      const s = clamp(Math.min((W - 60) / bd.w, (H - top - bot - 40) / bd.h), minS(), MAXS);
      animateTo({ s, x: W / 2 - (bd.x + bd.w / 2) * s, y: top + (H - top - bot) / 2 - (bd.y + bd.h / 2) * s });
      el.querySelectorAll(".nt-chips button").forEach(o => o.classList.toggle("on", o === b));
    }));

    // Keyboard and closing
    const close = () => {
      removeEventListener("keydown", key); removeEventListener("resize", onResize);
      el.classList.remove("on"); document.documentElement.style.overflow = "";
      setTimeout(() => el.remove(), 250); if (opener) opener.focus();
    };
    const key = e => {
      if (e.key === "Escape") return close();
      const m = { "+": 1.4, "=": 1.4, "-": 1 / 1.4, "_": 1 / 1.4 }[e.key];
      if (m) zoomAt(m, W / 2, H / 2);
      else if (e.key === "0" || e.key === "f") animateTo(fit);
      else { const p = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }[e.key]; if (p) { e.preventDefault(); view = { ...view, x: view.x + p[0], y: view.y + p[1] }; req(); } }
    };
    const onResize = () => { const c = [(W / 2 - view.x) / view.s, (H / 2 - view.y) / view.s]; size(); view = { ...view, x: W / 2 - c[0] * view.s, y: H / 2 - c[1] * view.s }; paint(); };
    addEventListener("keydown", key); addEventListener("resize", onResize);
    el.querySelector(".bdv-exit").addEventListener("click", close);
    el.querySelector(".bdv-exit").focus();
  };
})();
