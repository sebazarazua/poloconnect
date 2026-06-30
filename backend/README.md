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
npm run prisma:seed:auctions
npm run start:dev
```

Nota: `prisma:seed` no crea remates de caballos. Para que existan eventos/caballos (con imagenes), usar `prisma:seed:auctions`.

API local: `http://localhost:4000/api/v1`

Health: `GET /api/v1/health`

Usuario seed:

- identifier: `polo.connect` o `adrian@poloconnect.app`
- password: `PoloConnect123!`

## Recuperacion de contraseña (mail real)

El endpoint `POST /api/v1/auth/password-reset/request` envia correo real solo si SMTP esta configurado.

Variables requeridas en `.env`:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` para 465, `false` para 587 normalmente)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Sin `SMTP_HOST`, el backend no envia correo y solo deja el codigo en logs para desarrollo.

## Login social

Apple requiere configurar en backend:

- `APPLE_OAUTH_CLIENT_ID`

Opcional para aceptar multiples audiencias (por ejemplo Expo Go + build real):

- `APPLE_OAUTH_CLIENT_IDS` (lista separada por comas)

Este valor debe coincidir con el `aud` del token de Apple (Service ID o Bundle ID segun configuracion en Apple Developer).

## Modulos incluidos

- Auth con JWT access + refresh rotativo.
- Users/profile/settings.
- Marketplace con productos, favoritos y contacto vendedor.
- Community chat con salas, membresias, mensajes y gateway WebSocket base.
- Matches/live/broadcasts.
- Tournaments y registro de equipos.
- Notifications y push tokens.
