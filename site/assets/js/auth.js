/* ===================================================================
   AUTH.JS — login, cadastro e perfil (Supabase Auth)

   O site é HTML puro, sem servidor próprio. Para ter conta de usuário de
   verdade (e-mail + senha, Google, Facebook) usamos o Supabase, que cuida
   de guardar a senha com segurança e de falar com Google/Facebook.

   Este arquivo é o único que conversa com o Supabase. As páginas só
   importam as funções daqui:  import { entrarEmail, sair } from "./auth.js"

   Dados do perfil:
     - nome, e-mail e foto ficam na própria conta (Supabase Auth);
     - telefone fica na tabela "profiles" (uma linha por pessoa, criada
       sozinha pelo banco no cadastro) e também numa cópia local
       (localStorage) para aparecer na hora.

   Velocidade:
     1. começa a baixar o Supabase assim que a página abre;
     2. guarda uma "foto" do último usuário (nome, e-mail, foto) e mostra a
        tela de logado NA HORA, enquanto o Supabase confirma por trás;
     3. nenhuma tela espera pelo banco: o telefone aparece da cópia local e
        é atualizado em seguida, se houver novidade.
   =================================================================== */

import { supabaseConfig } from "./supabase-config.js";

// Versão fixa da biblioteca (evita que uma atualização inesperada quebre o site).
const SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

export const configurado =
  !!supabaseConfig.url && !!supabaseConfig.key &&
  supabaseConfig.url.indexOf("COLE_AQUI") === -1 &&
  supabaseConfig.key.indexOf("COLE_AQUI") === -1;

let promSb = null;
let atual = null;        // usuário atual, já no formato que as telas usam

/* ---------- carregamento do Supabase ---------- */
function iniciar() {
  if (!configurado) return Promise.reject(new Error("nao-configurado"));
  if (!promSb) {
    promSb = import(SDK).then(function (m) {
      return m.createClient(supabaseConfig.url, supabaseConfig.key);
    });
  }
  return promSb;
}

function comTempo(promessa, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error("tempo-esgotado")); }, ms);
    promessa.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
  });
}

function urlDaPagina(arquivo) {
  return new URL(arquivo, location.href).href;
}

/* ---------- usuário no formato das telas ----------
   As páginas já usam { uid, displayName, email, photoURL, providerData: [{ providerId }] }.
   Aqui traduzimos o usuário do Supabase para esse formato. */
var PROVEDORES = { email: "password", google: "google.com", facebook: "facebook.com" };

function adaptar(u) {
  if (!u) return null;
  var md = u.user_metadata || {};
  var lista = (u.app_metadata && u.app_metadata.providers) ||
    (u.identities || []).map(function (i) { return i.provider; });
  return {
    uid: u.id,
    displayName: md.nome || md.full_name || md.name || null,
    email: u.email || null,
    photoURL: md.avatar_url || md.picture || null,
    providerData: lista.map(function (p) { return { providerId: PROVEDORES[p] || p }; })
  };
}

/* Espera o Supabase terminar de ler a sessão salva e devolve o cliente e o usuário. */
async function pronto() {
  const c = await iniciar();
  const r = await c.auth.getSession();
  const s = r.data && r.data.session;
  if (!s) throw { code: "session_not_found" };
  return { c: c, user: adaptar(s.user) };
}

/* ---------- mensagens de erro em português ---------- */
var ERROS = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme o seu e-mail primeiro: enviamos um link para a sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com esse e-mail. Tente entrar.",
  email_exists: "Já existe uma conta com esse e-mail. Tente entrar.",
  weak_password: "A senha precisa ter pelo menos 6 caracteres.",
  validation_failed: "Esse e-mail não parece válido.",
  email_address_invalid: "Esse e-mail não parece válido.",
  over_request_rate_limit: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  over_email_send_rate_limit: "Muitos e-mails enviados em pouco tempo. Aguarde um pouco e tente de novo.",
  same_password: "A nova senha precisa ser diferente da atual.",
  provider_disabled: "Esse método de login ainda não foi ativado no Supabase (veja o LEIA-ME-SUPABASE).",
  signup_disabled: "Novos cadastros estão desativados no momento.",
  user_banned: "Esta conta foi desativada.",
  session_not_found: "Sua sessão expirou. Entre de novo.",
  "nao-configurado": "O login ainda não foi configurado. Confira site/assets/js/supabase-config.js.",
  "senha-atual-incorreta": "A senha atual está incorreta.",
  "falha-excluir": "Não foi possível excluir a conta agora. Tente de novo em instantes.",
  rede: "Sem conexão com a internet. Tente de novo."
};

export function traduzirErro(e) {
  var code = e && (e.code || e.error_code);
  if (ERROS[code]) return ERROS[code];
  var msg = (e && e.message) || "";
  if ((e && e.name === "AuthRetryableFetchError") || /failed to fetch|network|load failed/i.test(msg)) return ERROS.rede;
  if (e && e.status === 429) return ERROS.over_request_rate_limit;
  return "Não deu certo. Tente de novo em instantes.";
}

/* ---------- "foto" do último usuário (só para desenhar a tela rápido) ----------
   Guarda apenas nome, e-mail e foto. Não dá acesso a nada: tudo o que mexe na conta
   continua passando pelo Supabase, que confirma a sessão de verdade em seguida. */
var CHAVE_USUARIO = "auth:ultimo";

function guardarUsuario(user) {
  try {
    if (!user) { localStorage.removeItem(CHAVE_USUARIO); return; }
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify({
      uid: user.uid, displayName: user.displayName || null, email: user.email || null,
      photoURL: user.photoURL || null,
      providers: (user.providerData || []).map(function (p) { return p.providerId; })
    }));
  } catch (e) {}
}

function lerUsuarioGuardado() {
  try {
    var d = JSON.parse(localStorage.getItem(CHAVE_USUARIO));
    if (d && d.uid) {
      return {
        uid: d.uid, displayName: d.displayName, email: d.email, photoURL: d.photoURL,
        providerData: (d.providers || []).map(function (p) { return { providerId: p }; })
      };
    }
  } catch (e) {}
  return null;
}

/* ---------- estado do usuário ----------
   callback(user, origem)
     origem "guardado": palpite imediato (vem da "foto" salva neste aparelho);
     origem "servidor": resposta confirmada pelo Supabase.
   Quem usa deve tratar "guardado" só como aparência; ações importantes esperam "servidor". */
export function aoMudarUsuario(callback) {
  if (!configurado) { callback(null, "servidor", { code: "nao-configurado" }); return; }
  callback(lerUsuarioGuardado(), "guardado");     // aparece na hora
  iniciar().then(function (c) {
    c.auth.onAuthStateChange(function (evento, sessao) {
      atual = adaptar(sessao && sessao.user);
      guardarUsuario(atual);
      // setTimeout: o Supabase pede que não se chame o banco de dentro deste aviso
      setTimeout(function () { callback(atual, "servidor"); }, 0);
    });
  }).catch(function (e) { callback(null, "servidor", e); });
}

export function usuarioAtual() { return atual; }

export function provedores(user) {
  return (user && user.providerData ? user.providerData : []).map(function (p) { return p.providerId; });
}

export function primeiroNome(user) {
  var nome = (user && user.displayName) || "";
  return nome.trim().split(/\s+/)[0] || (user && user.email ? user.email.split("@")[0] : "Conta");
}

/* ---------- entrar / criar conta ---------- */
export async function entrarEmail(email, senha) {
  const c = await iniciar();
  const r = await c.auth.signInWithPassword({ email: email, password: senha });
  if (r.error) throw r.error;
}

/* Devolve { precisaConfirmar }: se o projeto exige confirmar o e-mail, a pessoa só entra
   depois de clicar no link que o Supabase envia. */
export async function criarConta(nome, email, senha) {
  const c = await iniciar();
  const r = await c.auth.signUp({
    email: email,
    password: senha,
    options: { data: { nome: nome }, emailRedirectTo: urlDaPagina("contato.html") }
  });
  if (r.error) throw r.error;
  // com a confirmação de e-mail ligada, um e-mail já cadastrado volta "sem identidades"
  if (r.data.user && r.data.user.identities && r.data.user.identities.length === 0) {
    throw { code: "user_already_exists" };
  }
  return { precisaConfirmar: !r.data.session };
}

async function entrarProvedor(provedor, extra) {
  const c = await iniciar();
  const opcoes = { redirectTo: location.origin + location.pathname };
  if (extra) opcoes.queryParams = extra;
  const r = await c.auth.signInWithOAuth({ provider: provedor, options: opcoes });
  if (r.error) throw r.error;       // se der certo, o navegador segue para o Google/Facebook
}

export function entrarGoogle() { return entrarProvedor("google", { prompt: "select_account" }); }
export function entrarFacebook() { return entrarProvedor("facebook"); }

export async function recuperarSenha(email) {
  const c = await iniciar();
  const r = await c.auth.resetPasswordForEmail(email, { redirectTo: urlDaPagina("redefinir.html") });
  if (r.error) throw r.error;
}

/* Usada pela página redefinir.html, depois que a pessoa clica no link do e-mail. */
export async function definirNovaSenha(novaSenha) {
  const p = await pronto();
  const r = await p.c.auth.updateUser({ password: novaSenha });
  if (r.error) throw r.error;
}

export async function sair() {
  const c = await iniciar();
  guardarUsuario(null);
  atual = null;
  const r = await c.auth.signOut();
  if (r.error) throw r.error;
}

/* ---------- perfil (telefone) ---------- */
function chaveLocal(uid) { return "perfil:" + uid; }

/* Cópia local: instantânea. É a que as telas mostram primeiro. */
export function perfilExtraLocal(uid) {
  try { return JSON.parse(localStorage.getItem(chaveLocal(uid))) || {}; } catch (e) { return {}; }
}

function guardarLocal(uid, dados) {
  try { localStorage.setItem(chaveLocal(uid), JSON.stringify(Object.assign(perfilExtraLocal(uid), dados))); } catch (e) {}
}

/* Versão do servidor (tabela profiles). Nunca trava a tela: tem limite de tempo e cai na cópia local. */
export async function carregarPerfilExtra(uid) {
  try {
    const c = await comTempo(iniciar(), 6000);
    const r = await comTempo(c.from("profiles").select("telefone").eq("id", uid).maybeSingle(), 4000);
    if (r.data) {
      var d = { telefone: r.data.telefone || "" };
      guardarLocal(uid, d);
      return d;
    }
  } catch (e) { /* banco lento ou fora do ar: segue com o que já temos aqui */ }
  return perfilExtraLocal(uid);
}

export async function salvarPerfilExtra(uid, dados) {
  guardarLocal(uid, dados);                    // na hora, no aparelho
  try {
    const c = await comTempo(iniciar(), 6000);
    await comTempo(c.from("profiles").upsert(Object.assign({ id: uid }, dados)), 8000);
  } catch (e) { /* fica pelo menos no aparelho */ }
}

export async function atualizarPerfil(nome, telefone) {
  const p = await pronto();
  var user = p.user;
  if (nome !== undefined && nome !== user.displayName) {
    const r = await p.c.auth.updateUser({ data: { nome: nome } });
    if (r.error) throw r.error;
    user = adaptar(r.data.user);
    atual = user;
    guardarUsuario(user);
    try { await comTempo(p.c.from("profiles").upsert({ id: user.uid, nome: nome }), 6000); } catch (e) {}
  }
  if (telefone !== undefined) await salvarPerfilExtra(user.uid, { telefone: telefone });
  return user;
}

/* Confirma a identidade de novo (para trocar a senha e excluir a conta).
   Quem entrou por Google/Facebook já foi confirmado pelo próprio provedor. */
export async function reautenticar(senhaAtual) {
  const p = await pronto();
  if (provedores(p.user).indexOf("password") !== -1) {
    const r = await p.c.auth.signInWithPassword({ email: p.user.email, password: senhaAtual || "" });
    if (r.error) throw { code: "senha-atual-incorreta" };
  }
}

export async function trocarSenha(senhaAtual, novaSenha) {
  await reautenticar(senhaAtual);
  const p = await pronto();
  const r = await p.c.auth.updateUser({ password: novaSenha });
  if (r.error) throw r.error;
}

/* Quem apaga o usuário é a função "excluir-conta" do Supabase (precisa de poder de
   administrador, que o navegador não tem). O perfil some junto, em cascata. */
export async function excluirConta(senhaAtual) {
  await reautenticar(senhaAtual);
  const p = await pronto();
  const r = await p.c.functions.invoke("excluir-conta", { method: "POST" });
  if (r.error) throw { code: "falha-excluir" };
  try { localStorage.removeItem(chaveLocal(p.user.uid)); } catch (e) {}
  guardarUsuario(null);
  atual = null;
  try { await p.c.auth.signOut({ scope: "local" }); } catch (e) {}
}
