# Configurando o login (Supabase)

## URL de retorno

No Supabase, abra **Authentication → URL Configuration**:

- Configure **Site URL** com o endereço publicado do site.
- Em **Redirect URLs**, autorize o site publicado (por exemplo,
  `https://seu-dominio.com/**`) e `http://localhost:8000/**`.
  O link de redefinição volta para `redefinir.html`.

Sem essa configuração, o link de redefinição pode não retornar ao site.

## E-mail e senha

Em **Authentication → Sign In / Providers → Email**, mantenha o provedor
ativado. Com **Confirm email** ligado, a pessoa precisa confirmar o cadastro
antes de entrar. Para uso real, configure um SMTP próprio em
**Authentication → SMTP Settings**; o serviço padrão tem limite baixo de envio.

O template de recuperação de senha do Supabase deve usar o link de recuperação
padrão (`{{ .ConfirmationURL }}`), que cria a sessão temporária usada pela tela
`site/redefinir.html`.

## Login social (opcional)

Google e Facebook precisam ser ativados em
**Authentication → Sign In / Providers** e configurados também nos respectivos
painéis de desenvolvedor. As instruções de callback aparecem no painel Supabase.
Se não for usar Facebook, remova o botão `btn-facebook` de `site/contato.html`
e a linha correspondente em `site/assets/js/contato.js`.

## Configuração pública do site

O endereço do projeto e a chave **publishable** ficam em
`site/assets/js/supabase-config.js`. Essa chave é destinada ao navegador;
**nunca coloque uma secret key nesse arquivo ou no repositório**.

As demais telas também usam a tabela `profiles` para o telefone do perfil e a
função `excluir-conta` para excluir usuários. Confira se esses recursos e as
políticas de acesso estão configurados no projeto Supabase.

As contas existentes no Firebase não são transferidas automaticamente. Quem
já tinha conta precisará criar uma conta no Supabase.

## Teste local

Na raiz do repositório:

```powershell
cd site
python -m http.server 8000
```

Abra `http://localhost:8000/contato.html`, peça a redefinição, acesse o link
recebido por e-mail e salve uma senha nova em `redefinir.html`.
