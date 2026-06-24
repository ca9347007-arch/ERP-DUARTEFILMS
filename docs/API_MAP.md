# Mapa inicial de API

## Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Público

- `GET /api/public/services`
- `GET /api/public/availability?serviceId=&date=`
- `POST /api/public/appointments`

## Interno

- `GET /api/dashboard`
- `GET /api/clients`
- `POST /api/clients`
- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/services`
- `POST /api/services`
- `GET /api/appointments`
- `PATCH /api/appointments/:id/status`
- `GET /api/financial-entries`
- `POST /api/financial-entries`
- `GET /api/reports/financial-summary`
- `GET /api/products`
- `POST /api/products`
- `POST /api/stock-movements`
- `GET /api/audit-logs`
