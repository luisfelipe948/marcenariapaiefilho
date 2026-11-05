# Ligando o login do site (Supabase) — passo a passo

Custo: R$ 0 no plano gratuito. O banco, as tabelas, as regras de segurança,
o bucket de imagens e a função de excluir conta **já estão criados** no
projeto `tcc` do Supabase. Falta só ligar o Google e conferir as URLs.

Endereço do projeto: `https://fawxefpurvrserofcyub.supabase.co`
Callback (usada pelo Google):
`https://fawxefpurvrserofcyub.supabase.co/auth/v1/callback`

## 1. URLs do site (obrigatório)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** o endereço do site na Vercel (ex.: `https://seu-projeto.vercel.app`).
- **Redirect URLs:** adicione, uma por linha:
  - `https://seu-projeto.vercel.app/**`
  - `http://localhost:8000/**` (para testar no computador)

Sem isso, o login com Google e o link de "Esqueci minha senha"
não voltam para o site.

## 2. E-mail e senha

Já vem ativo. Dois ajustes úteis em **Authentication → Sign In / Providers → Email**:

- **Confirm email:** ligado = a pessoa precisa clicar num link enviado por e-mail
  antes de entrar (o site já mostra esse aviso). Desligue só para testar rápido.
- Os e-mails padrão do Supabase têm limite baixo de envios por hora. Para uso
  real, configure um SMTP próprio em **Authentication → SMTP Settings**
  (Resend, Brevo ou Gmail com senha de app).

## 3. Google

1. Acesse https://console.cloud.google.com e crie um projeto (ex.: `marcenaria-login`).
2. **Google Auth Platform** (ou **APIs e serviços → Tela de permissão OAuth**):
   *Primeiros passos* → nome do app, e-mail de suporte → público **Externo** →
   e-mail de contato → criar. Depois, em **Público-alvo**, clique em **Publicar app**
   (senão só e-mails de teste conseguem entrar).
3. **Clientes → Criar cliente** (ou *Credenciais → ID do cliente OAuth*):
   - Tipo: **Aplicativo da Web**.
   - **Origens JavaScript autorizadas:** o endereço do site na Vercel e `http://localhost:8000`.
   - **URIs de redirecionamento autorizados:** só a callback do Supabase (acima).
4. Copie o **Client ID** e o **Client Secret**.
5. Supabase → **Authentication → Sign In / Providers → Google**: ative, cole os dois e salve.

## 4. CMS (publicar o site sem deploy)

1. Supabase → **Project Settings → API Keys** → copie a **Secret key** (`sb_secret_...`).
2. Na pasta do `cms.py`: copie `.env.exemplo` para `.env` e cole a chave.
3. `pip install -r requirements.txt` e `python cms.py`.
4. Na barra do painel deve aparecer "Site atualizado às HH:MM".

A secret key dá poder total sobre o banco: nunca coloque no site, no GitHub ou em prints.

## 5. Vercel

Settings → General → **Root Directory:** `site` (só o nome da pasta).
A cada `git push` na `main` a Vercel publica. Mudanças feitas pelo CMS
(textos do portfólio e imagens) **não precisam** de push.

## 6. Testar

```
cd site
python -m http.server 8000
```

Abra http://localhost:8000/contato.html: crie uma conta, mande um orçamento de
teste, abra **Meu perfil**, edite nome e telefone, troque a senha, saia, entre
de novo, teste "Esqueci minha senha" e, por fim, **Excluir perfil**.

## O que mudou em relação ao Firebase

- Login: `assets/js/auth.js` agora fala com o Supabase (as páginas continuam
  usando as mesmas funções).
- Telefone do perfil: tabela `profiles` (antes Firestore).
- Excluir conta: função `excluir-conta` do Supabase (precisa de poder de admin).
- Google abre por redirecionamento (a pessoa volta para a mesma página),
  em vez de janela pop-up.
- Contas criadas no Firebase não foram migradas: quem já se cadastrou lá cria a
  conta de novo (no Google, basta clicar em "Entrar com Google").
- Pode apagar o projeto do Firebase quando quiser; nada aqui depende mais dele.
