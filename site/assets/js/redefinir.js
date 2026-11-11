/* ===================================================================
   REDEFINIR.JS — escolher a senha nova depois de "Esqueci minha senha"

   O link do e-mail traz a pessoa para esta página com uma sessão
   TEMPORÁRIA, que serve só para trocar a senha (ela fica separada do
   login normal do site — veja "modo recuperação" no auth.js).

   Fluxo:
     1. link válido  -> mostra o formulário (a pessoa NÃO está logada);
     2. link vencido -> avisa e oferece pedir outro;
     3. ao salvar    -> troca a senha, entra na conta e segue para o site.
   =================================================================== */

import { aoMudarUsuario, definirNovaSenha, traduzirErro } from "./auth.js";

function $(id) { return document.getElementById(id); }

var form = $("form-senha");
var aviso = $("aviso-erro");
var estadoCarregando = $("estado-carregando");
var estadoInvalido = $("estado-invalido");
var estadoSucesso = $("estado-sucesso");
var subtitulo = $("subtitulo");
var textoSucesso = $("texto-sucesso");
var concluido = false;      // depois de salvar, a sessão temporária é encerrada: não é "link inválido"

function avisar(texto) {
  if (texto) { aviso.textContent = texto; aviso.hidden = false; } else { aviso.hidden = true; }
}

aoMudarUsuario(function (user, origem) {
  if (origem !== "servidor" || concluido) return;
  estadoCarregando.hidden = true;
  if (user) {
    form.hidden = false;
    estadoInvalido.hidden = true;
  } else if (form.hidden) {
    estadoInvalido.hidden = false;
    subtitulo.hidden = true;
  }
});

/* botões "mostrar / esconder" da senha */
document.querySelectorAll("[data-ver-senha]").forEach(function (b) {
  b.addEventListener("click", function () {
    var campo = $(b.getAttribute("data-ver-senha"));
    var mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    b.textContent = mostrar ? "Esconder" : "Mostrar";
    b.setAttribute("aria-pressed", mostrar ? "true" : "false");
  });
});

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  var nova = $("nova-senha").value;
  var repetir = $("repetir-senha").value;
  var campoNova = form.querySelector('[data-campo="nova"]');
  var campoRep = form.querySelector('[data-campo="repetir"]');
  campoNova.classList.toggle("invalido", nova.length < 6);
  campoRep.classList.toggle("invalido", nova !== repetir);
  avisar("");
  if (nova.length < 6 || nova !== repetir) return;

  var btn = $("btn-salvar");
  btn.disabled = true;
  btn.textContent = "Salvando…";
  try {
    var r = await definirNovaSenha(nova);
    concluido = true;
    form.hidden = true;
    subtitulo.hidden = true;
    estadoSucesso.hidden = false;
    if (r.logado) {
      textoSucesso.textContent = "Senha alterada! Estamos te levando para a sua conta…";
      setTimeout(function () { location.href = "contato.html"; }, 1600);
    } else {
      textoSucesso.textContent = "Senha alterada! Agora é só entrar com a senha nova.";
      $("link-continuar").textContent = "Entrar";
      $("link-continuar").href = "contato.html#entrar";
    }
  } catch (err) {
    avisar(traduzirErro(err));
    btn.disabled = false;
    btn.textContent = "Salvar senha e entrar";
  }
});
