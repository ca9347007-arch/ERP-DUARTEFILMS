# Arquitetura local agora, VPS Hostinger depois

## Agora: desenvolvimento local

```txt
VSCode
├── React/Vite em localhost:5173
├── API Express em localhost:4000
├── PostgreSQL Docker em localhost:5432
└── Redis Docker em localhost:6379
```

Vantagens:

- Sem custo antes da aprovação.
- Sem risco de expor sistema incompleto.
- Ciclo rápido de desenvolvimento.
- Fácil reset de banco.

## Depois: produção na Hostinger

```txt
Internet
└── Nginx HTTPS 80/443
    ├── Frontend estático/container interno
    └── API interna
        ├── PostgreSQL rede interna
        └── Redis rede interna
```

Regras para produção:

- PostgreSQL e Redis nunca expostos publicamente.
- API acessível somente via Nginx.
- `.env` fora do Git.
- Backup externo criptografado.
- Deploy com tag/commit identificável.
- Rollback definido antes de cada deploy.
