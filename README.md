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

## Levantar toda la app de una

Comando unico desde la raiz del repo:

```bash
npm install
npm run dev:up
```

Esto hace en orden:
- Libera puertos de desarrollo (4000 backend, 8081 frontend) si estaban ocupados.
- Levanta Postgres y Redis via Docker Compose.
- Ejecuta migraciones de Prisma en backend.
- Arranca backend (watch) y frontend Expo en paralelo.

Nota: el script intenta liberar esos puertos automaticamente. Si tenes algo importante corriendo en 4000/8081, detenelo manualmente antes de usar `npm run dev:up`.

Para bajar infraestructura Docker:

```bash
npm run dev:down
```

## Remates de caballos sin mock

Los remates NO se crean con el seed general. Si no corres el seed especifico, la seccion queda vacia.

Para poblar eventos y caballos con imagenes:

```bash
npm run backend:seed:auctions
```

Seed opcional para visualizar el catalogo de marcas con mas volumen (5 marcas con 5 productos cada una):

```bash
npm run backend:seed:brands-showcase
```

Tambien podes crear eventos/caballos con fotos reales desde dispositivo en la pantalla Gestionar remates (rol admin/superadmin).

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
