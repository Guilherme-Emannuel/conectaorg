# ConectaOrg

Sistema de CRM/atendimento com autenticação, dashboard, tickets e integração
com WhatsApp (EvolutionAPI) e n8n.

## Stack

- **Backend:** Node.js + Express
- **Banco:** MySQL/MariaDB via Prisma ORM
- **Auth:** JWT + bcrypt
- **Frontend:** HTML/CSS/JS (Vanilla)

## Como rodar

Ordem completa, do `git clone` até o app no ar.

1. Clone o repositório e entre na pasta:
   ```bash
   git clone <url-do-repo> conectaorg
   cd conectaorg
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
   > O `prisma generate` roda sozinho aqui (postinstall do Prisma)
3. Inicie o MySQL/MariaDB pelo painel do XAMPP.
4. Copie o exemplo de configuração **e preencha com seus valores reais**:
   ```bash
   copy .env.example .env
   ```
   > ⚠️ **Copiar não basta — edite o `.env` antes de seguir.** Todos os
   > valores do `.env.example` são hipotéticos. Se você rodar o passo 5 com
   > eles, o Prisma tenta autenticar como `usuario_exemplo` e falha com
   > `P1000: Authentication failed`.

   No mínimo, para o projeto subir:

   | Variável | O que colocar |
   | --- | --- |
   | `DATABASE_URL` | `mysql://root:@localhost:3306/conectaorg` (padrão do XAMPP) |
   | `JWT_SECRET` | uma string longa e aleatória sua |
   | `ADMIN_EMAIL` | o e-mail do admin que você vai usar no login |
   | `ADMIN_PASSWORD` | uma senha forte sua |

   Os blocos `EXT_DB_*` e `DB_EMAILS_*` só são necessários para as telas
   **Usuários** e **Webmails**. O servidor sobe sem eles, mas essas páginas
   quebram.

   > O `.env` está no `.gitignore` — e é para continuar assim. Como ele nunca
   > vai para o git, **guarde um backup do seu `.env` preenchido fora da pasta
   > do projeto**: um clone novo ou uma cópia acidental do `.env.example` por
   > cima apaga tudo sem possibilidade de recuperar pelo histórico.
5. Rode as migrations:
   ```bash
   npx prisma migrate dev
   ```
   > O Prisma cria o banco `conectaorg` sozinho se ele ainda não existir
6. Crie o usuário administrador inicial:
   ```bash
   npm run seed
   ```
   > As credenciais vêm das variáveis `ADMIN_*` do `.env`. Sem elas, o seed
   > cai nos valores de desenvolvimento `admin@conectaorg.com` / `admin123`
   > — troque em produção. Rodar o seed duas vezes não duplica o admin.
7. Prepare os dados do organograma e importe para o banco:
   ```bash
   copy data\organograma.exemplo.json data\organograma.json
   npm run import:organograma
   ```
   > `data/organograma.json` está no `.gitignore`: os dados reais da
   > organização ficam somente na sua máquina. No repositório vai apenas
   > o exemplo fictício. Se você tem os dados reais, use o seu arquivo aqui
   > em vez do exemplo.
8. Suba o servidor em modo desenvolvimento:
   ```bash
   npm run dev
   ```
9. Acesse http://localhost:3000 e faça login com o `ADMIN_EMAIL` /
   `ADMIN_PASSWORD` que você definiu no passo 4.

## Erros comuns

| Erro | Causa | Solução |
| --- | --- | --- |
| `P1000: Authentication failed ... usuario_exemplo` | O `.env` ainda está com os valores do `.env.example` | Passo 4: preencha o `DATABASE_URL` com credenciais reais |
| `P1001: Can't reach database server` | MySQL não está rodando | Passo 3: dê Start no MySQL pelo painel do XAMPP |
| Login não funciona após o seed | `ADMIN_*` do `.env` diferente do que você está digitando | Confira as variáveis `ADMIN_*` ou rode o seed de novo com os valores certos |
| Telas **Usuários** / **Webmails** quebram | `EXT_DB_*` / `DB_EMAILS_*` ainda hipotéticos | Preencha esses blocos no `.env` com um usuário de banco somente-leitura |

## Roadmap

- [x] Fase 1 — Fundação (Express, Prisma, git, proteção de segredos)
- [x] Fase 2 — Autenticação (login com JWT + bcrypt)
- [ ] Fase 3 — Dashboard
- [ ] Fase 4 — CRM (contatos)
- [ ] Fase 5 — Tickets/atendimento
- [ ] Fase 6 — WhatsApp via EvolutionAPI
- [ ] Fase 7 — Automações com n8n
