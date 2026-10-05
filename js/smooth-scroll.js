/* Smooth mouse-wheel scrolling.
   Wheel notches normally jump the page in steps. This turns each notch into a short glide so the
   page eases to a stop, like dragging the scrollbar. Scrollbar, keyboard, touch and trackpad
   behaviour is left alone. Runs for everyone, including visitors with "reduce motion" switched on. */
(function () {
  const root = document.documentElement;
  const TAU = 120;                      // ms: bigger = longer, softer glide
  let target = scrollY, pos = scrollY, raf = 0, last = 0;

  const max = () => Math.max(0, root.scrollHeight - innerHeight);
  const clamp = v => Math.min(max(), Math.max(0, v));

  function frame(now) {
    const dt = Math.min(64, now - last || 16); last = now;
    pos += (target - pos) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - pos) < 0.4) { pos = target; raf = 0; } else raf = requestAnimationFrame(frame);
    root.style.scrollBehavior = "auto";            // stop the page's CSS smooth-scroll fighting us (works in older browsers too)
    scrollTo(0, pos);
  }

  // Scrollbar drag, keyboard, links etc: follow wherever the page actually is.
  addEventListener("scroll", () => {
    if (raf && Math.abs(scrollY - pos) > 2) { cancelAnimationFrame(raf); raf = 0; }
    if (!raf) pos = target = scrollY;
  }, { passive: true });
  addEventListener("resize", () => { target = clamp(target); });

  // Slow, eased glide to a position (used by the Work page "Selected work" button). Any wheel / touch / key / click stops it.
  const GLIDE_MIN_MS = 1500, GLIDE_MS_PER_PX = 1.6, GLIDE_MAX_MS = 2600;   // longer = slower
  let glideRaf = 0;
  const stopGlide = () => { if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = 0; } };
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(ev => addEventListener(ev, stopGlide, { passive: true }));
  window.glideTo = y => {
    stopGlide();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    const from = scrollY, to = clamp(y), dist = to - from;
    if (Math.abs(dist) < 2) return;
    const dur = Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, Math.abs(dist) * GLIDE_MS_PER_PX)), t0 = performance.now();
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // slow start, slow finish
    root.style.scrollBehavior = "auto";
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + dist * ease(t));
      glideRaf = t < 1 ? requestAnimationFrame(step) : 0;
    };
    glideRaf = requestAnimationFrame(step);
  };

  addEventListener("wheel", e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;               // pinch-zoom / browser zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;                    // sideways gestures
    const header = document.getElementById("site-header");
    if (header && header.classList.contains("open")) return;                // mobile menu open
    for (let el = e.target; el && el !== root && el !== document.body; el = el.parentElement) {   // inner scroll areas
      if (el.nodeType === 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return;
    }
    e.preventDefault();
    const d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
    if (!raf) pos = target = scrollY;
    target = clamp(target + d);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }, { passive: false });
})();
