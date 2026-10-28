/* CV page: a friendly "email me for my CV" message. The email button is filled in here so the address isn't sitting in the page source for bots. */
(function () {
  var a = document.getElementById("cv-mail"), e = window.SITE && window.SITE.email;
  if (a && e) {
    a.href = "mailto:" + e + "?subject=" + encodeURIComponent("CV request");
    a.textContent = e;
  }
})();
