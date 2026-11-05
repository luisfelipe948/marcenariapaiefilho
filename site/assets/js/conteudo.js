/* ===================================================================
   CONTEUDO.JS — traz do Supabase o que o CMS publicou

   O CMS (cms.py) grava na tabela "site_content":
     portfolio          -> a lista de projetos (JSON)
     img_hero_desktop   -> imagem do topo da Home (computador)
     img_hero_mobile    -> imagem do topo da Home (celular)
     img_showcase       -> ilustração "Conheça nossos projetos"

   O site já abre com o que está nos arquivos (portfolio-data.js e a pasta
   img/), então nada fica em branco. Quando esta resposta chega, ela é
   aplicada por cima e as páginas se redesenham sozinhas. Se o Supabase
   estiver fora do ar ou sem nada publicado, o site segue como estava.

   A última resposta fica guardada neste aparelho para a próxima visita
   já abrir com as imagens certas, sem "piscar" a antiga.
   =================================================================== */

import { supabaseConfig } from "./supabase-config.js";

var BASE = String(supabaseConfig.url || "").replace(/\/$/, "");
var PASTA_PUBLICA = BASE + "/storage/v1/object/public/site-images/";
var CHAVE_CACHE = "conteudo:ultimo";

// Só aceita imagens do nosso próprio bucket (ou arquivos locais do site) e sem
// caracteres que pudessem escapar de um url("...") no CSS.
function urlSegura(u) {
  return typeof u === "string" && u.indexOf(PASTA_PUBLICA) === 0 && !/["'()\s\\<>]/.test(u);
}

function imagemPortfolioOk(u) {
  return u === null || urlSegura(u) || (typeof u === "string" && /^assets\/img\/portfolio\/[\w.-]+$/.test(u));
}

function textoOuVazio(v) { return typeof v === "string" ? v : ""; }

function lerPortfolio(texto) {
  try {
    var lista = JSON.parse(texto);
    if (!Array.isArray(lista)) return null;
    return lista.map(function (p) {
      return {
        id: p.id,
        titulo: textoOuVazio(p.titulo),
        descricao: textoOuVazio(p.descricao),
        cat: textoOuVazio(p.cat),
        catNome: textoOuVazio(p.catNome),
        imagem: imagemPortfolioOk(p.imagem) ? (p.imagem || null) : null,
        destaque: !!p.destaque
      };
    });
  } catch (e) { return null; }
}

function aplicar(m) {
  var raiz = document.documentElement;

  if (urlSegura(m.img_hero_desktop)) raiz.style.setProperty("--hero-desktop", 'url("' + m.img_hero_desktop + '")');
  if (urlSegura(m.img_hero_mobile)) raiz.style.setProperty("--hero-mobile", 'url("' + m.img_hero_mobile + '")');

  if (urlSegura(m.img_showcase)) {
    var img = document.querySelector(".showcase__guarda-roupa img");
    if (img && img.getAttribute("src") !== m.img_showcase) img.src = m.img_showcase;
  }

  if (typeof m.portfolio === "string") {
    var lista = lerPortfolio(m.portfolio);
    if (lista) {
      window.PORTFOLIO = lista;
      window.dispatchEvent(new Event("portfolio-atualizado"));
    }
  }
}

async function buscar() {
  var ctl = new AbortController();
  var t = setTimeout(function () { ctl.abort(); }, 8000);
  try {
    var r = await fetch(BASE + "/rest/v1/site_content?select=key,value", {
      headers: { apikey: supabaseConfig.key },
      signal: ctl.signal
    });
    if (!r.ok) throw new Error("http " + r.status);
    var linhas = await r.json();
    var m = {};
    linhas.forEach(function (l) { m[l.key] = l.value; });
    return m;
  } finally {
    clearTimeout(t);
  }
}

(async function () {
  if (!BASE || BASE.indexOf("COLE_AQUI") !== -1) return;

  // 1) aplica na hora o que veio da última visita
  try {
    var guardado = JSON.parse(localStorage.getItem(CHAVE_CACHE));
    if (guardado) aplicar(guardado);
  } catch (e) {}

  // 2) confirma com o servidor e aplica o que for novo
  try {
    var novo = await buscar();
    if (!Object.keys(novo).length) return;
    try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(novo)); } catch (e) {}
    aplicar(novo);
  } catch (e) { /* sem internet ou Supabase fora: fica o que já está na tela */ }
})();
