/* CV page: opens assets/cv.pdf if it's there, otherwise shows a short "on its way" message with the email link. */
(function () {
  var pdf = "assets/cv.pdf";
  var show = function () {
    var a = document.getElementById("cv-mail"), e = ["epeacockvfx", "gmail.com"].join("@");
    if (a) { a.href = "mailto:" + e; a.textContent = e; }
    document.getElementById("msg").style.display = "block";
  };
  // Check the PDF really exists (some hosts answer missing files with a web page instead of an error)
  fetch(pdf, { method: "HEAD", cache: "no-store" }).then(function (r) {
    var type = r.headers.get("content-type") || "";
    if (r.ok && type.indexOf("pdf") !== -1) location.replace(pdf); else show();
  }).catch(show);
})();
