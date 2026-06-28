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

## Auth real (mail + Google + Apple)

1. Backend:

```bash
cd backend
copy .env.example .env
```

Completar en `backend/.env`:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `APPLE_OAUTH_CLIENT_ID` (o `APPLE_OAUTH_CLIENT_IDS` separado por comas para Expo Go + build)

2. Frontend:

```bash
cd frontend
copy .env.example .env
```

Completar en `frontend/.env`:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

3. Levantar backend y frontend de nuevo para tomar variables.
