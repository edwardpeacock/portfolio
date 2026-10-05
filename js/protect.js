/* Image protection (deterrents). Stops right-click "open image in new tab" / "save image as", dragging images out of the page,
   long-press save on phones, and Ctrl/Cmd+S. Breakdown images are CSS backgrounds rather than <img> tags (see js/projects.js).
   Honest limit: nothing in a browser can fully stop a determined person (screenshots, dev tools, the network tab), so for real
   protection also upload web-sized, watermarked copies of your images. Links stay right-clickable. */
(function () {
  const GUARD = "img, picture, canvas, .bd-stage, .bd-viewer, .bd-img, .portrait";
  const guarded = e => e.target && e.target.closest && e.target.closest(GUARD);
  document.addEventListener("contextmenu", e => { if (guarded(e)) e.preventDefault(); }, true);
  document.addEventListener("dragstart", e => { if (guarded(e)) e.preventDefault(); }, true);
  document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && String(e.key).toLowerCase() === "s") e.preventDefault(); }, true);
})();
