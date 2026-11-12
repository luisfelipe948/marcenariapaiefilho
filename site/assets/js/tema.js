/* ===================================================================
   TEMA.JS — alternar entre modo escuro e modo claro

   Carregue em TODAS as páginas, no <head>, como script comum (sem
   type="module"): assim o tema salvo é aplicado antes da página aparecer
   e não há "piscada" de uma cor para a outra.

   - A escolha fica salva neste aparelho (localStorage, chave "tema").
   - Sem escolha salva, o site abre no modo escuro (a identidade da marca).
   - O botão (sol/lua) é colocado no fim da lista .nav__links, então no
     celular ele aparece dentro do menu hambúrguer.
   =================================================================== */
(function () {
  var CHAVE = "tema";
  var raiz = document.documentElement;
  var COR_BARRA = { escuro: "#1A130B", claro: "#F3EBDD" };

  function lerSalvo() {
    try {
      var t = localStorage.getItem(CHAVE);
      return t === "claro" || t === "escuro" ? t : null;
    } catch (e) { return null; }
  }

  function atual() { return raiz.getAttribute("data-tema") === "claro" ? "claro" : "escuro"; }

  function aplicar(tema) {
    raiz.setAttribute("data-tema", tema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", COR_BARRA[tema]);
  }

  aplicar(lerSalvo() || "escuro");

  var botoes = [];

  function atualizarBotoes() {
    var claro = atual() === "claro";
    var texto = claro ? "Ativar modo escuro" : "Ativar modo claro";
    botoes.forEach(function (b) {
      b.setAttribute("aria-label", texto);
      b.title = texto;
      b.querySelector(".tema-btn__rotulo").textContent = claro ? "Modo escuro" : "Modo claro";
    });
  }

  function alternar() {
    var novo = atual() === "claro" ? "escuro" : "claro";
    aplicar(novo);
    try { localStorage.setItem(CHAVE, novo); } catch (e) {}
    atualizarBotoes();
  }

  function montar() {
    aplicar(atual());     // garante a cor da barra do navegador, que o <meta> só existe depois do head
    document.querySelectorAll(".nav__links").forEach(function (lista) {
      var li = document.createElement("li");
      li.className = "tema-li";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tema-btn";
      b.innerHTML =
        '<svg class="i-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' +
        '<svg class="i-lua" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' +
        '<span class="tema-btn__rotulo"></span>';
      b.addEventListener("click", alternar);
      li.appendChild(b);
      lista.appendChild(li);
      botoes.push(b);
    });
    atualizarBotoes();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();

  // várias abas abertas: a troca numa aba vale nas outras
  window.addEventListener("storage", function (e) {
    if (e.key === CHAVE && (e.newValue === "claro" || e.newValue === "escuro")) {
      aplicar(e.newValue);
      atualizarBotoes();
    }
  });
})();
