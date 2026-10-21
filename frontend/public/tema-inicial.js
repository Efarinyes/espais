(function () {
  try {
    var mode = localStorage.getItem("espais.mode");
    if (mode !== "fosc" && mode !== "clar") {
      var legacy = localStorage.getItem("espais.aparenca");
      var d = legacy ? JSON.parse(legacy) : {};
      mode = d.mode === "fosc" ? "fosc" : "clar";
    }
    var paleta = "mar-cel";
    var sessio = localStorage.getItem("espais.sessio");
    if (sessio) {
      var s = JSON.parse(sessio);
      var permeses = { "mar-cel": 1, camps: 1, citrics: 1, vinyes: 1 };
      if (permeses[s.palette]) paleta = s.palette;
    }
    document.documentElement.setAttribute("data-theme", mode === "fosc" ? paleta + "-dark" : paleta);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "mar-cel");
  }
})();
