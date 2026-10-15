/* "Still cooking" page for unfinished projects (wip: true in data/site.js). Shows the project's name if one is given (wip.html?p=the-diner). */
(function () {
  var slug = new URLSearchParams(location.search).get("p");
  var p = (window.PROJECTS || []).filter(function (x) { return x.slug === slug; })[0];
  if (p) { document.getElementById("wip-eyebrow").textContent = p.title + " · Work in progress"; document.title = p.title + " is still cooking | Edward Peacock"; }
})();
