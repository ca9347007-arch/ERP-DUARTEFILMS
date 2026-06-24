#!/usr/bin/env bash
set -euo pipefail

echo "[DuarteFilms] Derrubando containers locais..."
docker compose -f infra/docker-compose.local.yml down -v

echo "[DuarteFilms] Subindo PostgreSQL e Redis..."
docker compose -f infra/docker-compose.local.yml up -d

echo "[DuarteFilms] Rodando migrations e seed..."
pnpm db:generate
pnpm db:migrate
pnpm db:seed

echo "[DuarteFilms] Ambiente local resetado. Rode: pnpm dev"
