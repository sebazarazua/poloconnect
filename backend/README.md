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
npm run prisma:seed:brands-showcase
npm run start:dev
```

Nota: `prisma:seed` no crea remates de caballos. Para que existan eventos/caballos (con imagenes), usar `prisma:seed:auctions`.

`prisma:seed:brands-showcase` es opcional y agrega 5 marcas con 5 productos cada una para visualizar el catalogo de marcas con datos de ejemplo.

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

- `APPLE_OAUTH_CLIENT_ID=com.poloconnect.app` para validar el token emitido a la build iOS.

Opcional para aceptar multiples audiencias (por ejemplo Expo Go + build real):

- `APPLE_OAUTH_CLIENT_IDS` (lista separada por comas)

Este valor debe coincidir con el `aud` del token de Apple (Service ID o Bundle ID segun configuracion en Apple Developer).

Para completar el intercambio del authorization code y revocar la autorizacion en Apple cuando el usuario elimina su cuenta, el backend desplegado tambien necesita `APPLE_TEAM_ID`, `APPLE_KEY_ID` y `APPLE_PRIVATE_KEY`. Configuralos como secretos en Railway; nunca en variables `EXPO_PUBLIC_*` ni en el cliente.

## Almacenamiento de medios (S3)

Los uploads (avatares, productos, remates de caballos, contenido admin) se guardan en S3. Variables requeridas en `.env`:

- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_REGION`
- `S3_ENDPOINT` (opcional, para S3-compatible como MinIO/DigitalOcean Spaces)
- `S3_FORCE_PATH_STYLE` (opcional, `true` para endpoints S3-compatible)

Sin `MEDIA_BASE_URL`, el backend sirve los archivos el mismo a traves de `GET /api/v1/media/*`, haciendo proxy directo a S3 (no requiere el bucket publico).

**CloudFront queda en stand-by** para una futura iteracion. Cuando se habilite, alcanza con setear `MEDIA_BASE_URL` al dominio de la distribucion (por ej. `https://dxxxxxxxxxxxx.cloudfront.net`) para que las URLs de medios se sirvan via CDN en lugar del proxy propio; no requiere cambios de codigo.

## Reembolsos de publicaciones

El rechazo desde Admin registra una solicitud de devolucion y envia un reembolso
total a Mercado Pago. La clave de idempotencia se mantiene en cada reintento.
El backend comprueba las solicitudes pendientes cada minuto y espera cinco
minutos tras un error. Solo marca `refunded` cuando Mercado Pago confirma la
devolucion; conserva el estado y el error para mostrarlo en el panel.

Antes de iniciar esta version, aplicar la migracion
`20260909000000_add_marketplace_refunds` con `npm run prisma:deploy`.
El Dockerfile de Railway ya ejecuta ese comando antes de arrancar la API.
Se usa el mismo `MP_ACCESS_TOKEN` del cobro; no hay variables nuevas.

Las publicaciones rechazadas antes de este cambio no generan transferencias
retroactivas al desplegar. En Admin > Marketplace > Rechazadas, usar
`Reembolsar pago` para solicitar su devolucion. Los pagos confirmados despues
del rechazo tambien se devuelven mediante el webhook.

## Modulos incluidos

- Auth con JWT access + refresh rotativo.
- Users/profile/settings.
- Marketplace con productos, favoritos y contacto vendedor.
- Community chat con salas, membresias, mensajes y gateway WebSocket base.
- Matches/live/broadcasts.
- Tournaments y registro de equipos.
- Notifications y push tokens.
- Moderación UGC: reportes, bloqueos bidireccionales, sanciones, historial y filtro preventivo.

## Moderación de contenido

Luego de actualizar el código, aplicar la migración en el entorno correspondiente:

```bash
npm run prisma:deploy
```

El filtro preventivo usa una lista base mínima y puede ampliarse con `UGC_BLOCKLIST`, separada por comas. No reemplaza la revisión humana: los reportes se administran desde `Admin > Moderación` y generan un historial de acciones y sanciones.
