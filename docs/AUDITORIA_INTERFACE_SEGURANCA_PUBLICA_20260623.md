# Auditoria e ajustes — Interface, agendamento público e segurança

Data: 2026-06-23  
Projeto: DuarteFilms ERP

## Objetivo

Aplicar os primeiros ajustes recomendados antes de evoluir módulos internos:

1. Unificar a identidade visual premium preto/dourado.
2. Remover credenciais preenchidas da tela de login.
3. Transformar o login em uma central pública com três caminhos: entrar, agendar e consultar agendamento.
4. Adicionar consulta pública de agendamento por protocolo + WhatsApp.
5. Reduzir dados retornados pelas rotas públicas.
6. Revalidar horário de agendamento no backend.
7. Melhorar tratamento de erro e permissões nas rotas internas.
8. Reduzir exposição local de PostgreSQL e Redis no Docker Compose.

## O que mudou no frontend

### Login

Arquivo alterado:

- `apps/web/src/pages/Login.tsx`

Alterações:

- Removido preenchimento automático de `admin@duartefilms.local` e `Admin@123`.
- As credenciais continuam existindo no seed local, mas agora precisam ser digitadas manualmente.
- Criada central de acesso com:
  - Entrar no painel.
  - Agendar atendimento.
  - Consultar agendamento.
- O botão de agendamento aciona um card com efeito 3D, seguindo a referência HTML enviada.
- A consulta pública usa animação alternativa no mesmo portal.

### Agendamento público

Arquivo alterado:

- `apps/web/src/pages/PublicSchedule.tsx`

Alterações:

- Formulário reorganizado em componente reutilizável.
- Exibe protocolo após envio.
- Mostra mensagem clara para o cliente guardar o protocolo.
- Link/botão para consulta pública.
- Tratamento de erro de API.
- Data mínima no dia atual.
- Loading para horários.

### Consulta pública

Arquivo criado:

- `apps/web/src/pages/PublicAppointmentLookup.tsx`

Funcionalidade:

- Consulta por protocolo e WhatsApp.
- Mostra apenas status público, serviço, data/horário e veículo.
- Não expõe ID interno, `companyId`, dados financeiros, logs ou objetos completos do banco.

### Rotas públicas no React

Arquivo alterado:

- `apps/web/src/App.tsx`

Novas rotas:

- `/agendar`
- `/consultar-agendamento`

### Tema visual

Arquivo alterado:

- `apps/web/src/styles.css`

Alterações:

- Tema global premium preto/dourado.
- Variáveis CSS para identidade DuarteFilms.
- Cards escuros, bordas douradas, botões com gradiente dourado.
- Sidebar interna também convertida para a identidade do login.
- Responsividade para mobile.
- No mobile, o efeito 3D vira troca simples de painel para evitar bug visual.

## O que mudou no backend

### Protocolo público de agendamento

Arquivo alterado:

- `apps/api/prisma/schema.prisma`

Campo adicionado em `Appointment`:

```prisma
publicCode String @unique
```

Índice adicionado:

```prisma
@@index([companyId, publicCode])
```

Migration criada:

- `apps/api/prisma/migrations/20260623234000_public_appointment_lookup/migration.sql`

Essa migration:

- adiciona `publicCode`;
- gera código para registros antigos usando prefixo `LEGACY-`;
- torna o campo obrigatório;
- cria índice único;
- cria índice auxiliar por empresa + protocolo.

### Rotas públicas

Arquivo alterado:

- `apps/api/src/routes/modules/public.routes.ts`

Alterações:

- `GET /api/public/services` agora retorna somente dados públicos necessários.
- `GET /api/public/availability` continua retornando apenas slots disponíveis.
- `POST /api/public/appointments` agora:
  - valida serviço público e ativo;
  - recalcula disponibilidade no backend;
  - rejeita horário passado, fora do expediente ou já ocupado;
  - cria protocolo público;
  - retorna somente `{ ok, protocol, message }`.
- Criada rota:

```txt
POST /api/public/appointments/lookup
```

Entrada:

```json
{
  "protocol": "DF-20260623-8F3A",
  "phone": "81999999999"
}
```

Saída pública:

```json
{
  "appointment": {
    "protocol": "DF-20260623-8F3A",
    "status": "PENDING",
    "statusLabel": "Pendente de confirmação",
    "service": "Película automotiva completa",
    "startsAt": "...",
    "endsAt": "...",
    "customerName": "Nome",
    "vehicle": {
      "model": "Corolla",
      "plate": "ABC1234"
    },
    "message": "Seu agendamento foi recebido e ainda será confirmado pela equipe."
  }
}
```

### Login e usuário autenticado

Arquivo alterado:

- `apps/api/src/routes/modules/auth.routes.ts`

Alteração:

- O backend não retorna mais `companyId` no objeto público do usuário enviado ao frontend.
- O `companyId` continua existindo internamente no JWT e no backend para isolamento multiempresa.

### Tratamento de erros

Arquivo alterado:

- `apps/api/src/middlewares/errorHandler.ts`

Melhorias:

- `P2025` vira 404.
- `P2002` vira 409.
- `P2003` vira 400.
- `P2034` vira 409.

Isso evita erro genérico desnecessário e melhora o diagnóstico no frontend.

### RBAC nas rotas de escrita

Arquivos alterados:

- `appointments.routes.ts`
- `clients.routes.ts`
- `financial.routes.ts`
- `products.routes.ts`
- `quotes.routes.ts`
- `stockMovements.routes.ts`
- `vehicles.routes.ts`

Alterações:

- Rotas de escrita agora exigem papéis compatíveis.
- Financeiro exige `ADMIN`, `MANAGER` ou `FINANCE`.
- Estoque/produtos exigem `ADMIN` ou `MANAGER`.
- Orçamento exige `ADMIN`, `MANAGER` ou `ATTENDANT`.
- Aprovação de orçamento exige `ADMIN` ou `MANAGER`.
- Cliente/veículo exige `ADMIN`, `MANAGER` ou `ATTENDANT`.

### Estoque negativo

Arquivos alterados:

- `products.routes.ts`
- `stockMovements.routes.ts`

Alteração:

- Saídas que deixariam estoque negativo agora retornam erro 409.

## Infra local

Arquivo alterado:

- `infra/docker-compose.local.yml`

Alteração:

- PostgreSQL e Redis agora são publicados apenas em `127.0.0.1` no ambiente local.

Antes:

```yaml
- "5432:5432"
- "6379:6379"
```

Depois:

```yaml
- "127.0.0.1:5432:5432"
- "127.0.0.1:6379:6379"
```

Isso evita exposição na rede local.

## Observação importante sobre as credenciais

As credenciais locais continuam válidas se o banco foi criado com o seed:

```txt
E-mail: admin@duartefilms.local
Senha: Admin@123
```

O que foi removido foi apenas o preenchimento automático da tela de login.

Antes de qualquer homologação/produção, a senha do administrador deve ser alterada e o `JWT_SECRET` do `.env` deve ser trocado.

## Comandos recomendados após aplicar os arquivos

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Se o banco local já estava rodando antes, a nova migration adicionará o protocolo público.

## Validação realizada neste patch

Foi feita uma checagem sintática dos arquivos TypeScript/TSX alterados. O ambiente de validação não conseguiu executar `pnpm` completo porque os `node_modules` do ZIP vieram com links de ambiente Windows/PowerShell e não são portáveis no container Linux. No seu VSCode/Windows, rode os comandos acima para validar o build real.
