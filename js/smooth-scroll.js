/* Smooth mouse-wheel scrolling.
   Wheel notches normally jump the page in steps. This turns each notch into a short glide so the
   page eases to a stop, like dragging the scrollbar. Scrollbar, keyboard, touch and trackpad
   behaviour is left alone. Skipped if the visitor has "reduce motion" switched on. */
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  const TAU = 120;                      // ms: bigger = longer, softer glide
  let target = scrollY, pos = scrollY, raf = 0, last = 0;

  const max = () => Math.max(0, root.scrollHeight - innerHeight);
  const clamp = v => Math.min(max(), Math.max(0, v));

  function frame(now) {
    const dt = Math.min(64, now - last || 16); last = now;
    pos += (target - pos) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - pos) < 0.4) { pos = target; raf = 0; } else raf = requestAnimationFrame(frame);
    scrollTo({ top: pos, behavior: "instant" });   // "instant" so the page's CSS smooth-scroll doesn't fight us
  }

  // Scrollbar drag, keyboard, links etc: follow wherever the page actually is.
  addEventListener("scroll", () => {
    if (raf && Math.abs(scrollY - pos) > 2) { cancelAnimationFrame(raf); raf = 0; }
    if (!raf) pos = target = scrollY;
  }, { passive: true });
  addEventListener("resize", () => { target = clamp(target); });

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
