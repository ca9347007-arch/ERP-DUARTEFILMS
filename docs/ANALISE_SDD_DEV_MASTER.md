# Análise Dev Master — DuarteFilms ERP SDD v0.2

## Diagnóstico

O SDD está tecnicamente bem direcionado para um MVP vendável. Ele evita prometer integrações complexas na Fase 1 e concentra valor no que o cliente realmente precisa: agenda, clientes, veículos, orçamento, OS, financeiro manual, estoque e relatórios.

## Decisão técnica para iniciar local

Como o cliente ainda não aprovou, a decisão correta é não montar VPS agora. A base deve nascer local, versionada e dockerizada apenas no necessário:

- API local em Node.js/Express.
- Frontend local em React/Vite.
- PostgreSQL e Redis em containers locais.
- Prisma para schema, migrations e seed.
- Segurança de aplicação já embutida: validação, RBAC, rate limit, audit logs.

## Ponto crítico de arquitetura

Mesmo sendo uma única empresa na Fase 1, as tabelas operacionais já usam `companyId`. Isso evita retrabalho caso o produto vire multiempresa ou seja vendido para outro cliente no futuro.

## Risco principal

O maior risco não é técnico; é escopo. Se NFSe, Pix integrado, WhatsApp API, BI avançado e app mobile entrarem agora, o MVP deixa de ser entregável. Esses pontos devem continuar como Fase 2/Fase 3.

## Ordem de construção recomendada

1. Setup local completo.
2. Autenticação, perfis e layout.
3. Clientes, veículos e serviços.
4. Agenda pública + agenda interna.
5. Orçamentos e OS.
6. Financeiro manual.
7. Estoque e movimentação.
8. Dashboard e relatórios.
9. Auditoria, hardening e revisão.
10. Só depois: plano VPS Hostinger.
