# aptura.co

Onde sua aptidao encontra caminho.

Projeto React + Vite + Tailwind + Supabase, pronto para subir na Vercel.

## O que mudou (versao com Supabase)

Esta versao substitui o `localStorage` por um backend de verdade:

1. **Banco de dados real** — Postgres no Supabase, com tabelas e regras de seguranca (RLS)
   definidas em `supabase/schema.sql`.
2. **Autenticacao real** — login/cadastro usam o Supabase Auth. Senhas nunca ficam em texto
   puro; ficam com hash, gerenciadas pelo Supabase.
3. **Arquivos em bucket** — fotos de perfil, documentos (RG, CNPJ) e anexos de chat vao para
   o Supabase Storage, nao mais como texto gigante (base64) dentro do banco.
4. **App todo reescrito** para ler e gravar do Supabase em vez do `localStorage`.

Isso significa: agora e um site multiusuario de verdade. Duas pessoas em computadores
diferentes veem os mesmos dados, podem conversar de verdade (com chat em tempo real via
Supabase Realtime) e o painel do moderador se torna uma permissao real (nao mais um "codigo
secreto" digitado na tela).

---

## Passo 1 — Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e clique em **New project**.
2. Anote a **senha do banco** que voce definir (nao e a mesma coisa da API key).
3. Espere o projeto terminar de provisionar (1-2 minutos).

## Passo 2 — Rodar o schema (tabelas + seguranca)

1. No painel do Supabase, abra **SQL Editor > New query**.
2. Cole o conteudo inteiro do arquivo `supabase/schema.sql` deste projeto e clique em **Run**.
3. Isso cria todas as tabelas, ativa o RLS (Row Level Security) em cada uma, cria as
   politicas de acesso, os buckets de arquivo (`avatars`, `portfolio`, `documents`,
   `chat-attachments`) e as politicas de acesso a eles.

Se der algum erro de "already exists", pode rodar de novo sem problema — o script usa
`if not exists` / `on conflict do nothing` nos pontos que precisam.

## Passo 3 — Desativar a confirmacao de e-mail (recomendado para comecar)

Por padrao, o Supabase exige que a pessoa confirme o e-mail antes de poder fazer login. O
app ja lida com os dois casos, mas para testar mais rapido sem precisar configurar um
servidor de e-mail:

1. Vá em **Authentication > Providers > Email**.
2. Desmarque **Confirm email**.
3. Salve.

Se preferir manter a confirmacao de e-mail ativa (recomendado antes de lancar para o
publico), o fluxo continua funcionando: a pessoa recebe um e-mail de confirmacao, confirma,
faz login, e o app pede automaticamente para completar o cadastro (profissao, documentos
etc.) nesse primeiro login — nao precisa preencher tudo de novo desde o zero, so os dados de
perfil que ainda faltavam.

## Passo 4 — Pegar as chaves da API

1. Vá em **Project Settings > API**.
2. Copie a **Project URL** e a chave **anon public**.
3. Nesta pasta do projeto, copie `.env.example` para `.env`:

   ```
   cp .env.example .env
   ```

4. Preencha o `.env` com os valores copiados:

   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

## Passo 5 — Rodar localmente

```
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente `http://localhost:5173`).

## Passo 6 — Virar moderador

1. Cadastre-se normalmente pelo site (como prestador ou empresa, tanto faz).
2. No SQL Editor do Supabase, rode (trocando pelo seu e-mail real):

   ```sql
   update public.profiles set is_moderator = true where email = 'seu-email@exemplo.com';
   ```

3. Faca logout e login de novo no site. Um link **"Painel do moderador"** aparece no
   rodape.

## Passo 7 — Deploy na Vercel

1. Suba este projeto para um repositorio no GitHub (ou GitLab/Bitbucket).
2. Em [vercel.com](https://vercel.com), clique em **Add New > Project** e importe o
   repositorio.
3. A Vercel detecta automaticamente que e um projeto Vite (`npm run build`, saida em
   `dist`) — nao precisa mudar nada nessa parte.
4. Em **Environment Variables**, adicione as mesmas duas variaveis do seu `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em **Deploy**.

Pronto — o site fica no ar com banco de dados, autenticacao e arquivos de verdade.

### Depois de trocar o dominio

Se voce configurar um dominio proprio na Vercel (ex: `aptura.co`), va em
**Authentication > URL Configuration** no Supabase e adicione esse dominio em **Site URL**
e **Redirect URLs**, senao os links de confirmacao de e-mail podem apontar para o endereco
errado.

---

## Estrutura do projeto

```
aptura-app/
├── supabase/
│   └── schema.sql         # tabelas, RLS, buckets — rode isso no Supabase
├── .env.example            # copie para .env e preencha
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx              # todo o app (paginas, componentes, logica)
    ├── index.css
    ├── assets/
    │   └── aptura-logo.png
    └── lib/
        ├── supabaseClient.js   # inicializa o cliente do Supabase
        ├── auth.js             # cadastro, login, logout, sessao
        ├── db.js                # todas as consultas ao banco (tabelas)
        └── storage.js           # upload de fotos/documentos para os buckets
```

## Como o cadastro funciona agora (em duas etapas)

1. **Cadastro** (`Cadastro`): so pede nome, e-mail e senha, e cria a conta no Supabase Auth.
2. **Completar cadastro** (`CompletarPrestador` / `CompletarEmpresa`): pede profissao,
   categorias, RG, fotos de documento, localizacao etc. Isso so acontece com a pessoa ja
   autenticada — necessario para o upload de arquivos ser seguro (as regras do Storage
   exigem saber quem esta enviando).

Se a confirmacao de e-mail estiver ativa, a etapa 2 acontece automaticamente assim que a
pessoa confirma o e-mail e faz o primeiro login (o app detecta que a conta existe mas o
perfil ainda nao foi completado, e mostra a tela certa).

## Chat em tempo real

Como as mensagens agora ficam numa tabela do Postgres com Supabase Realtime habilitado, o
chat funciona de verdade entre pessoas diferentes, em computadores diferentes — não depende
mais de estar no mesmo navegador como na versao anterior.

## Localizacao em tempo real ("Perto de mim")

Continua usando a API nativa de geolocalizacao do navegador (`navigator.geolocation`), sem
custo e sem chave de API — agora as coordenadas (lat/lng) ficam salvas na tabela
`professionals` do Supabase em vez do `localStorage`.

## Seguranca dos documentos (RG, CNPJ)

As fotos de documento (RG frente/verso, documento da empresa) vao para o bucket privado
`documents`, que **nao e publico**: as politicas de acesso (RLS do Storage) so deixam o
proprio dono do documento ou uma conta marcada como moderadora abrirem esses arquivos, e
mesmo assim atraves de uma URL assinada que expira em 1 hora. Isso e bem mais seguro do que
a versao anterior (que guardava tudo em texto no navegador).
