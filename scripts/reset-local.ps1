Write-Host "[DuarteFilms] Derrubando containers locais..."
docker compose -f infra/docker-compose.local.yml down -v

Write-Host "[DuarteFilms] Subindo PostgreSQL e Redis..."
docker compose -f infra/docker-compose.local.yml up -d

Write-Host "[DuarteFilms] Rodando migrations e seed..."
pnpm db:generate
pnpm db:migrate
pnpm db:seed

Write-Host "[DuarteFilms] Ambiente local resetado. Rode: pnpm dev"
