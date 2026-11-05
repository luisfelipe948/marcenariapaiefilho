# CMS da Marcenaria Pai & Filho

Um programa Python (`cms.py`) que gerencia o portfólio e as imagens do
site, e um site em HTML puro (pasta `site/`) com login de clientes.

## 1. O painel (CMS em Python)

```
pip install -r requirements.txt
python cms.py
```

- **Primeira vez:** o painel pede o cadastro (nome, e-mail e senha de pelo
  menos 8 caracteres). Depois disso você **entra com o e-mail e a senha**.
  O botão **Sair** fica no topo; clicando no seu nome você muda o nome ou
  troca a senha.
- **Esqueci minha senha:** na tela de login, clique em "Esqueci minha
  senha". Um **código de 6 dígitos** é enviado para o e-mail do cadastro
  (vale 10 minutos, 5 tentativas, 1 pedido por minuto). Com o código você
  escolhe a senha nova. Veja abaixo como ligar o envio.
- Cinco senhas erradas seguidas travam o login por 30 segundos.
- **Portfólio:** cada projeto aparece numa lista com a miniatura da foto
  que está no site agora. Ao editar, você vê lado a lado a foto **atual**
  e a **nova** (que só vai para o site quando você salva).
- **Imagens do site:** cada cartão mostra a imagem que está no ar e as
  **5 imagens anteriores**. Clique numa delas para voltar (a atual vai
  para o histórico, então dá para ir e voltar).
- O mesmo histórico de 5 imagens existe para a foto de cada projeto.

As cópias do histórico ficam em `historico_imagens/` (fora da pasta do
site, então nada disso é publicado). Toda alteração no portfólio
reescreve `site/assets/js/portfolio-data.js` sozinha **e publica no Supabase**
(veja a seção 3), então o site no ar muda sem novo deploy.

### Ligando o envio do código por e-mail (Gmail)

1. Na conta Google que vai **enviar** os e-mails, ative a verificação em
   2 etapas e crie uma **Senha de app** em
   https://myaccount.google.com/apppasswords
2. Copie `email_config.exemplo.json` para **`email_config.json`**, na mesma
   pasta do `cms.py`, e preencha `remetente` e `senha_app`.
   (Ou use as variáveis de ambiente `CMS_EMAIL_REMETENTE` e
   `CMS_EMAIL_SENHA_APP`.)
3. **Nunca coloque esse arquivo dentro da pasta `site/`** (ela é pública) e
   não o envie para o GitHub (já está no `.gitignore`).

O código sempre vai para o **e-mail do cadastro**, mesmo que outro e-mail
seja digitado em "Esqueci minha senha".

## 2. O site (pasta `site/`)

- `index.html` — Home
- `portfolio.html` — Portfólio com filtro por categoria
- `contato.html` — **Login / cadastro** (e-mail e senha, Google, Facebook)
  e, depois de entrar, o **formulário de orçamento**, que abre o WhatsApp
  com a mensagem pronta para **(11) 91053-8560**
- `redefinir.html` — escolher uma senha nova após pedir a recuperação por e-mail
- `perfil.html` — **Meu perfil**: editar nome e telefone, trocar senha,
  sair e excluir a conta

Em todas as páginas o topo mostra "Entrar" ou o menu da conta (Meu
perfil / Sair), e **clicar na logo leva para a Home**. Depois de entrar,
a pessoa cai direto na tela de orçamento.

**Carregamento rápido:** o site guarda neste aparelho só o nome, e-mail e
foto do último usuário para desenhar a tela na hora, e o Supabase confirma
a sessão por trás. O telefone vem de uma cópia local e só depois é
conferido no servidor, sem travar a tela. As linhas `modulepreload` no
`<head>` das páginas adiantam o download do Supabase; se você não for usar
o login, pode apagá-las.

### Importante: o login precisa do Supabase e de um endereço http

O login de verdade (guardar senha com segurança, falar com Google e
Facebook) precisa de um serviço por trás. Usamos o **Supabase Auth**, que
é gratuito para esse uso. Siga o passo a passo do arquivo
**`LEIA-ME-SUPABASE.md`**. O endereço e a chave pública do projeto ficam em
`site/assets/js/supabase-config.js` (já preenchidos). Enquanto o login com
Google/Facebook não for ligado no painel do Supabase, o e-mail e senha já
funciona.

Também por causa do login, o site **não funciona abrindo o arquivo com
duplo clique** (`file://`). Para testar no seu computador:

```
cd site
python -m http.server 8000
```

e abra `http://localhost:8000`. Para publicar, qualquer hospedagem de
sites estáticos serve (Vercel, Netlify, GitHub Pages...).

Para trocar o número de WhatsApp, edite `NUMERO_WHATSAPP` em
`site/assets/js/contato.js` (e o link em `site/contato.html`).

## Onde fica tudo salvo

- `cms.db` — banco local (SQLite): cadastro do painel, projetos e o
  índice do histórico de imagens.
- `historico_imagens/` — cópias das imagens trocadas (últimas 5 de cada).
- `site/assets/img/portfolio/` — fotos dos projetos.
- `site/assets/img/hero.jpg`, `hero-mobile.jpg`, `guarda_roupa.png` — as
  imagens fixas do site.
- Contas dos clientes, telefones e pedidos de orçamento: ficam no Supabase
  (tabelas `profiles` e `orcamentos`), não neste projeto.

## 3. Sincronização CMS → site (Supabase)

O painel guarda tudo no computador, como sempre. Se o arquivo `.env` estiver
preenchido, ele também **publica no Supabase, em segundo plano**, a cada
alteração e uma vez ao abrir:

- as imagens (portfólio e as 3 fixas do site) → bucket `site-images`;
- a lista de projetos e os endereços das imagens → tabela `site_content`.

O site (`assets/js/conteudo.js`) lê essa tabela ao abrir e se atualiza
sozinho, **sem `git push` e sem novo deploy**. Na barra do painel aparece
"Site atualizado às HH:MM" quando deu certo.

Para ligar: copie `.env.exemplo` para `.env`, cole a **secret key** do
Supabase e rode `pip install -r requirements.txt`. O `.env` nunca vai para o
GitHub nem para a pasta `site/`. Sem `.env` (ou sem internet) o painel
funciona normalmente, só que o site no ar não é atualizado.

Os arquivos do site (`site/assets/img` e `portfolio-data.js`) continuam no
repositório como cópia de segurança: se o Supabase estiver fora do ar, o
site abre com eles.
