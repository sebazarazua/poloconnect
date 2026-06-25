# Polo Connect Backend

Backend NestJS + Prisma + PostgreSQL para reemplazar los mocks del frontend Expo.

## Comandos

```bash
cd backend
npm install
copy .env.example .env
docker compose up -d
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev
```

API local: `http://localhost:4000/api/v1`

Health: `GET /api/v1/health`

Usuario seed:

- identifier: `polo.connect` o `adrian@poloconnect.app`
- password: `PoloConnect123!`

## Modulos incluidos

- Auth con JWT access + refresh rotativo.
- Users/profile/settings.
- Marketplace con productos, favoritos y contacto vendedor.
- Community chat con salas, membresias, mensajes y gateway WebSocket base.
- Matches/live/broadcasts.
- Tournaments y registro de equipos.
- Notifications y push tokens.
