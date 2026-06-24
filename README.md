# DuarteFilms ERP — Starter Local

Estrutura inicial criada a partir do SDD v0.2 do DuarteFilms ERP.

Este projeto foi desenhado para desenvolvimento **100% local no VSCode** enquanto o cliente ainda não aprovou. A arquitetura já fica preparada para, no futuro, subir para uma VPS Hostinger com Docker, Nginx, HTTPS, PostgreSQL e Redis.

## Stack escolhida para a Fase 1

- **Frontend:** React + Vite + TypeScript
- **Backend/API:** Node.js + Express + TypeScript
- **Banco:** PostgreSQL local via Docker
- **ORM/Migrations:** Prisma
- **Cache/Fila futura:** Redis local via Docker
- **Validação:** Zod
- **Auth:** JWT em cookie httpOnly + RBAC por perfil
- **Segurança base:** Helmet, CORS restrito, rate limit, validação, audit logs

## Como rodar local no VSCode

Pré-requisitos:

- Node.js 20+
- pnpm
- Docker Desktop
- VSCode

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Criar arquivo de ambiente

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Subir PostgreSQL e Redis local

```bash
docker compose -f infra/docker-compose.local.yml up -d
```

### 4. Criar tabelas e popular dados iniciais

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Rodar API e Frontend juntos

```bash
pnpm dev
```

Acesse:

- Frontend admin: http://localhost:5173
- API: http://localhost:4000/api/health
- Agendamento público: http://localhost:5173/agendar

Login local de teste:

```txt
E-mail: admin@duartefilms.local
Senha: Admin@123
```

## Estrutura principal

```txt
apps/
  api/                  API Express + Prisma
  web/                  Frontend React + Vite
packages/
  shared/               Tipos e constantes compartilhadas
infra/
  docker-compose.local.yml
  nginx/                Templates para futura VPS
prisma/                 Schema Prisma principal
scripts/                Scripts de apoio local
.vscode/                Recomendações de extensões
```

## Regra master do projeto

Enquanto o cliente não aprovar, nada de produção, domínio real, VPS ou dados reais. Vamos desenvolver local, validar fluxo, mostrar protótipo, ajustar escopo e só depois preparar plano de deploy Hostinger.

## Escopo respeitado nesta base

Incluído na Fase 1:

- Login e usuários por perfil
- Dashboard
- Clientes e veículos
- Serviços
- Agenda pública e interna
- Orçamentos e ordens de serviço como base técnica
- Financeiro manual
- Estoque e movimentações
- Relatórios simples
- Audit logs
- Preparação de multiempresa com `companyId`

Fora da Fase 1:

- NFSe automática
- Pix integrado ao banco
- WhatsApp API oficial
- App nativo
- Multi-filial completo
- BI avançado
- Integração fiscal/contador
