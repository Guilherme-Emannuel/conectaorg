# ConectaOrg

Sistema de CRM/atendimento com autenticação, dashboard, tickets e integração
com WhatsApp (EvolutionAPI) e n8n.

## Stack

- **Backend:** Node.js + Express
- **Banco:** MySQL/MariaDB via Prisma ORM
- **Auth:** JWT + bcrypt
- **Frontend:** HTML/CSS/JS (Vanilla)

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o exemplo de configuração e preencha com seus valores reais:
   ```bash
   copy .env.example .env
   ```
   > O `.env` já está no `.gitignore`
3. Inicie o MySQL/MariaDB (painel do XAMPP) e rode as migrations:
   ```bash
   npx prisma migrate dev
   ```
4. Crie o usuário administrador inicial:
   ```bash
   npm run seed
   ```
   > As credenciais vêm das variáveis `ADMIN_*` do `.env`
5. Prepare os dados do organograma e importe para o banco:
   ```bash
   copy data\organograma.exemplo.json data\organograma.json
   npm run import:organograma
   ```
   > `data/organograma.json` está no `.gitignore`: os dados reais da
   > organização ficam somente na sua máquina. No repositório vai apenas
   > o exemplo fictício.
   > Credenciais de desenvolvimento: `admin@conectaorg.com` / `admin123` (troque em produção)
6. Suba o servidor em modo desenvolvimento:
   ```bash
   npm run dev
   ```
7. Acesse http://localhost:3000

## Roadmap

- [x] Fase 1 — Fundação (Express, Prisma, git, proteção de segredos)
- [x] Fase 2 — Autenticação (login com JWT + bcrypt)
- [ ] Fase 3 — Dashboard
- [ ] Fase 4 — CRM (contatos)
- [ ] Fase 5 — Tickets/atendimento
- [ ] Fase 6 — WhatsApp via EvolutionAPI
- [ ] Fase 7 — Automações com n8n
