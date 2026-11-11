/* ===================================================================
   MENU-MOBILE.JS — botão "hambúrguer" do topo, só visível no celular

   Procura cada <nav class="nav"> que tenha uma lista .nav__links, cria o
   botão e liga/desliga a classe .nav--aberto (o CSS faz o resto).
   Fecha ao tocar num link, tocar fora ou apertar Esc.
   =================================================================== */
(function () {
  var navs = document.querySelectorAll(".nav");
  var celular = window.matchMedia("(max-width: 700px)");

  navs.forEach(function (nav, i) {
    var links = nav.querySelector(".nav__links");
    if (!links) return;

    if (!links.id) links.id = "menu-principal-" + i;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav__toggle";
    btn.setAttribute("aria-label", "Abrir menu");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", links.id);
    btn.innerHTML = "<span></span><span></span><span></span>";
    links.parentElement.appendChild(btn);

    function abrir(v) {
      nav.classList.toggle("nav--aberto", v);
      btn.setAttribute("aria-expanded", v ? "true" : "false");
      btn.setAttribute("aria-label", v ? "Fechar menu" : "Abrir menu");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      abrir(!nav.classList.contains("nav--aberto"));
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) abrir(false);
    });
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) abrir(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") abrir(false);
    });
    var aoMudarTela = function (e) { if (!e.matches) abrir(false); };
    if (celular.addEventListener) celular.addEventListener("change", function (e) { if (!e.matches) abrir(false); });
    else if (celular.addListener) celular.addListener(aoMudarTela);
  });
})();
