# Nginx futuro para VPS Hostinger

Esta pasta contém apenas templates para a fase futura de produção.

Na fase atual, rode tudo local no VSCode:

- Frontend: http://localhost:5173
- API: http://localhost:4000
- PostgreSQL/Redis via Docker local

Quando o cliente aprovar, a estratégia recomendada será:

1. Comprar/configurar domínio.
2. Preparar VPS Hostinger Ubuntu.
3. Criar usuário administrativo sem login root direto.
4. Subir aplicação com Docker Compose de produção.
5. Expor apenas Nginx em 80/443.
6. Proteger API, PostgreSQL e Redis em rede interna.
7. Ativar HTTPS com Let's Encrypt.
8. Configurar backup externo criptografado.
