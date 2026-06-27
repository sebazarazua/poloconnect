# Polo Connect

Workspace ordenado en dos partes:

- `frontend/`: app Expo / React Native / TypeScript con Expo Router.
- `backend/`: API NestJS + Prisma + PostgreSQL, con Redis para soporte.

El front usa Contexts y datos mock en memoria para auth, market, community y matches. El back real vive en `backend/src` y ya tiene Docker para la base y Redis.

## Como correr

```bash
npm install
npm run frontend:start
```

Backend local:

```bash
cd backend
npm install
docker compose up -d
npm run dev
```
