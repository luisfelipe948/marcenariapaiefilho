/* ===================================================================
   REDEFINIR.JS — escolher a senha nova depois de "Esqueci minha senha"

   O link do e-mail traz a pessoa para esta página já com uma sessão
   temporária. Se ela chegar aqui sem essa sessão (link vencido ou aberto
   duas vezes), mostramos um aviso para pedir outro link.
   =================================================================== */

import { aoMudarUsuario, definirNovaSenha, traduzirErro } from "./auth.js";

function $(id) { return document.getElementById(id); }

var form = $("form-senha");
var aviso = $("aviso-erro");
var ok = $("aviso-ok");
var estadoCarregando = $("estado-carregando");
var estadoInvalido = $("estado-invalido");

function avisar(el, texto) {
  aviso.hidden = true;
  ok.hidden = true;
  if (texto) { el.textContent = texto; el.hidden = false; }
}

aoMudarUsuario(function (user, origem, erro) {
  if (origem !== "servidor") return;          // o palpite deste aparelho não serve aqui
  estadoCarregando.hidden = true;
  if (erro) {
    avisar(aviso, traduzirErro(erro));
    return;
  }
  if (user) {
    form.hidden = false;
    estadoInvalido.hidden = true;
  } else if (form.hidden) {
    estadoInvalido.hidden = false;
  }
});

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  var nova = $("nova-senha").value;
  var repetir = $("repetir-senha").value;
  var campoNova = form.querySelector('[data-campo="nova"]');
  var campoRep = form.querySelector('[data-campo="repetir"]');
  campoNova.classList.toggle("invalido", nova.length < 6);
  campoRep.classList.toggle("invalido", nova !== repetir);
  if (nova.length < 6 || nova !== repetir) return;

  var btn = $("btn-salvar");
  btn.disabled = true;
  try {
    await definirNovaSenha(nova);
    form.hidden = true;
    avisar(ok, "Senha alterada! Você já está com a sessão aberta.");
    $("link-continuar").hidden = false;
  } catch (err) {
    avisar(aviso, traduzirErro(err));
  } finally {
    btn.disabled = false;
  }
});
