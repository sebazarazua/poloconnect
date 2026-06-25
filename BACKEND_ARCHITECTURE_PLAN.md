# Backend Architecture Plan - Polo Connect

Fecha: 2026-06-24
Rama esperada: develop-backend-database
Frontend base: Expo + React Native + TypeScript + Expo Router
Objetivo: backend y base de datos productivos para 5.000 usuarios iniciales y crecimiento a 20.000.

---

## A. Resumen Arquitectonico

Polo Connect debe arrancar con un monolito modular, no con microservicios. La app tiene varios dominios, pero todavia necesita velocidad, consistencia transaccional y bajo costo operativo. Un monolito modular con limites claros permite evolucionar sin encerrar el producto en una arquitectura fragil.

Stack recomendado: NestJS + PostgreSQL + Redis + WebSocket Gateway + Prisma o TypeORM. Mantiene TypeScript end-to-end con el frontend, acelera desarrollo y reduce errores de contrato. PostgreSQL sera la fuente de verdad. Redis cubrira cache, rate limiting, presencia, pub/sub realtime y sesiones revocadas. Las imagenes de marketplace deben ir a S3-compatible storage, no a la DB.

El backend debe exponer REST para CRUD y queries paginadas, WebSocket para chat, partidos en vivo y notificaciones, y una capa de auth con JWT access/refresh rotativo. El frontend debe migrar por modulos, reemplazando mocks desde `services/*` y luego simplificando contexts para que sean cache/estado UI, no fuente primaria de datos.

Para 5k usuarios, una API unica con 2-3 replicas, PostgreSQL administrado, Redis administrado y CDN alcanza. Para 20k, agregar read replicas, PgBouncer, workers async, observabilidad completa y escalado horizontal de WebSocket con Redis Pub/Sub.

Decisiones clave:
- Monolito modular primero.
- PostgreSQL como DB principal.
- Redis para cache, rate limit, realtime fanout y presencia.
- JWT access/refresh con rotacion.
- API REST versionada en `/api/v1`.
- WebSocket namespace `/ws`.
- Paginacion obligatoria en market, chat, notifications, matches.
- Soft delete en productos, usuarios, rooms y torneos.
- Auditoria para acciones sensibles.

---

## B. Estructura De Carpetas Backend Recomendada

```text
backend/
  package.json
  tsconfig.json
  .env.example
  Dockerfile
  docker-compose.yml
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    main.ts
    app.module.ts
    config/
      env.schema.ts
      app.config.ts
      database.config.ts
      redis.config.ts
      jwt.config.ts
      storage.config.ts
    common/
      decorators/
        current-user.decorator.ts
        roles.decorator.ts
      dto/
        pagination.dto.ts
      errors/
        app-error.ts
        error-codes.ts
      filters/
        http-exception.filter.ts
        websocket-exception.filter.ts
      guards/
        jwt-auth.guard.ts
        refresh-token.guard.ts
        roles.guard.ts
      interceptors/
        response.interceptor.ts
        logging.interceptor.ts
      middleware/
        request-id.middleware.ts
      pipes/
        validation.pipe.ts
      services/
        clock.service.ts
        id.service.ts
    database/
      database.module.ts
      prisma.service.ts
      transaction.service.ts
    redis/
      redis.module.ts
      redis.service.ts
      rate-limit.service.ts
    storage/
      storage.module.ts
      storage.service.ts
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      dto/
      entities/
    users/
      users.module.ts
      users.controller.ts
      users.service.ts
      users.repository.ts
      dto/
      entities/
    profiles/
      profiles.module.ts
      profiles.controller.ts
      profiles.service.ts
      profiles.repository.ts
      dto/
    marketplace/
      marketplace.module.ts
      products.controller.ts
      favorites.controller.ts
      marketplace.service.ts
      products.repository.ts
      favorites.repository.ts
      dto/
      entities/
    community/
      community.module.ts
      chat-rooms.controller.ts
      messages.controller.ts
      community.gateway.ts
      community.service.ts
      chat-rooms.repository.ts
      messages.repository.ts
      dto/
      entities/
    matches/
      matches.module.ts
      matches.controller.ts
      matches.gateway.ts
      matches.service.ts
      matches.repository.ts
      dto/
      entities/
    tournaments/
      tournaments.module.ts
      tournaments.controller.ts
      registrations.controller.ts
      tournaments.service.ts
      tournaments.repository.ts
      dto/
      entities/
    notifications/
      notifications.module.ts
      notifications.controller.ts
      notifications.gateway.ts
      notifications.service.ts
      notifications.repository.ts
      dto/
      entities/
    settings/
      settings.module.ts
      settings.controller.ts
      settings.service.ts
      settings.repository.ts
      dto/
    audit/
      audit.module.ts
      audit.service.ts
      audit.repository.ts
    health/
      health.controller.ts
  test/
    unit/
    integration/
    e2e/
    load/
```

Responsabilidad por capa:
- `controller`: HTTP, validacion DTO, status codes.
- `gateway`: WebSocket events, rooms y auth socket.
- `service`: reglas de negocio y transacciones.
- `repository`: acceso DB, queries e indices.
- `dto`: contratos input/output versionados.
- `entities`: tipos internos del dominio.
- `common`: errores, guards, interceptors, pipes.

---

## C. Modelo De Datos Completo

Convenciones:
- IDs: UUID v7 o cuid2. Evitar timestamps como IDs.
- Timestamps: `created_at`, `updated_at`, `deleted_at`.
- Concurrencia: `version integer default 1` en tablas mutables.
- Auditoria: `created_by`, `updated_by` cuando aplique.
- Soft delete: usar `deleted_at` en tablas visibles al usuario.
- Moneda: usar centavos enteros, no float.

### 1. users

Fuente frontend: `AuthUser` en `services/auth.ts`, `AuthContext`, `profile.tsx`.

Campos:
- `id uuid pk`
- `first_name varchar(80) not null`
- `last_name varchar(80) not null`
- `email citext not null unique`
- `username citext not null unique`
- `phone varchar(30)`
- `avatar_url text`
- `handicap numeric(4,1)`
- `status user_status not null default 'active'`
- `email_verified_at timestamptz`
- `phone_verified_at timestamptz`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `deleted_at timestamptz`
- `version integer not null default 1`

Indices:
- unique email.
- unique username.
- index status.
- index deleted_at.

### 2. auth_credentials

Campos:
- `user_id uuid pk references users(id)`
- `password_hash text not null`
- `password_updated_at timestamptz not null`
- `failed_login_count integer not null default 0`
- `locked_until timestamptz`

### 3. auth_sessions

Refresh tokens rotativos.

Campos:
- `id uuid pk`
- `user_id uuid not null references users(id)`
- `refresh_token_hash text not null unique`
- `family_id uuid not null`
- `device_id text`
- `device_name text`
- `ip_address inet`
- `user_agent text`
- `expires_at timestamptz not null`
- `revoked_at timestamptz`
- `created_at timestamptz not null`

Indices:
- user_id, expires_at.
- family_id.
- revoked_at.

### 4. roles

Campos:
- `id uuid pk`
- `code varchar(40) unique not null` ejemplo: `player`, `seller`, `organizer`, `admin`, `moderator`.
- `name varchar(80) not null`

### 5. user_roles

Campos:
- `user_id uuid references users(id)`
- `role_id uuid references roles(id)`
- `created_at timestamptz not null`
- primary key `(user_id, role_id)`.

### 6. user_settings

Fuente frontend: `settings.tsx`, `LocaleContext`, `ThemeProvider`.

Campos:
- `user_id uuid pk references users(id)`
- `locale varchar(10) not null default 'es-AR'`
- `theme varchar(20) not null default 'light'`
- `push_enabled boolean not null default true`
- `email_enabled boolean not null default true`
- `profile_visibility varchar(20) not null default 'public'`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### 7. clubs

Usado por partidos, torneos y comunidades.

Campos:
- `id uuid pk`
- `name varchar(140) not null unique`
- `slug varchar(160) unique not null`
- `location text`
- `contact_phone varchar(30)`
- `logo_url text`
- `created_at`, `updated_at`, `deleted_at`

### 8. teams

Campos:
- `id uuid pk`
- `name varchar(140) not null`
- `slug varchar(160) unique not null`
- `club_id uuid references clubs(id)`
- `logo_url text`
- `primary_color varchar(20)`
- `created_at`, `updated_at`, `deleted_at`

Indices:
- slug unique.
- club_id.

### 9. players

Campos:
- `id uuid pk`
- `user_id uuid references users(id)` nullable para jugadores externos.
- `display_name varchar(140) not null`
- `handicap numeric(4,1)`
- `avatar_url text`
- `created_at`, `updated_at`, `deleted_at`

### 10. tournaments

Fuente frontend: `tournaments.tsx`, `team-register.tsx`.

Campos:
- `id uuid pk`
- `name varchar(180) not null`
- `slug varchar(200) unique not null`
- `club_id uuid references clubs(id)`
- `start_date date not null`
- `end_date date`
- `level_label varchar(80)` ejemplo `16 goles`.
- `min_handicap numeric(4,1)`
- `max_handicap numeric(4,1)`
- `max_teams integer`
- `registration_status varchar(30) not null default 'open'`
- `status varchar(30) not null default 'scheduled'`
- `contact_name varchar(120)`
- `contact_phone varchar(30)`
- `created_by uuid references users(id)`
- `created_at`, `updated_at`, `deleted_at`, `version`

Indices:
- `(start_date, status)`.
- `(club_id, start_date)`.
- registration_status.

### 11. tournament_registrations

Campos:
- `id uuid pk`
- `tournament_id uuid not null references tournaments(id)`
- `team_name varchar(140) not null`
- `captain_user_id uuid not null references users(id)`
- `total_handicap numeric(4,1)`
- `status varchar(30) not null default 'pending'`
- `contact_phone varchar(30)`
- `notes text`
- `created_at`, `updated_at`, `cancelled_at`, `version`

Constraints:
- unique `(tournament_id, team_name)` where not cancelled.

### 12. tournament_registration_players

Campos:
- `registration_id uuid references tournament_registrations(id)`
- `player_id uuid references players(id)`
- `position smallint not null`
- primary key `(registration_id, player_id)`.

### 13. matches

Fuente frontend: `services/matches.ts`, `live.tsx`, `match-detail.tsx`, `index.tsx`, `broadcast.tsx`.

Campos:
- `id uuid pk`
- `external_code varchar(40) unique` para migrar IDs mock `2-1`.
- `tournament_id uuid references tournaments(id)`
- `club_id uuid references clubs(id)`
- `team1_id uuid not null references teams(id)`
- `team2_id uuid not null references teams(id)`
- `scheduled_at timestamptz not null`
- `status varchar(30) not null` enum: `upcoming`, `live`, `finished`, `cancelled`.
- `score1 integer not null default 0`
- `score2 integer not null default 0`
- `current_chukker smallint`
- `total_chukkers smallint default 6`
- `competition_name varchar(180)`
- `youtube_url text`
- `video_preview_url text`
- `created_at`, `updated_at`, `deleted_at`, `version`

Indices:
- `(scheduled_at, status)`.
- `(status, scheduled_at)`.
- tournament_id.
- club_id.

### 14. match_lineups

Campos:
- `id uuid pk`
- `match_id uuid references matches(id)`
- `team_id uuid references teams(id)`
- `player_id uuid references players(id)`
- `position smallint not null`
- `shirt_number smallint`
- `goals_label varchar(40)`
- unique `(match_id, team_id, position)`.

### 15. match_stats

Campos:
- `id uuid pk`
- `match_id uuid references matches(id)`
- `stat_key varchar(60) not null` ejemplo `goals`, `shots_on_goal`.
- `label varchar(100) not null`
- `team1_value varchar(40) not null`
- `team2_value varchar(40) not null`
- `team1_percent numeric(5,2)`
- `team2_percent numeric(5,2)`
- `updated_at timestamptz not null`
- unique `(match_id, stat_key)`.

### 16. match_events

Comentarios/eventos del partido.

Campos:
- `id uuid pk`
- `match_id uuid references matches(id)`
- `event_number bigint not null`
- `event_type varchar(40) not null` ejemplo `goal`, `foul`, `chukker_start`, `commentary`.
- `match_clock varchar(20)` ejemplo `72:00`.
- `title varchar(160) not null`
- `body text not null`
- `team_id uuid references teams(id)`
- `player_id uuid references players(id)`
- `created_by uuid references users(id)`
- `created_at timestamptz not null`
- unique `(match_id, event_number)`.

Indices:
- `(match_id, event_number desc)`.

### 17. chat_rooms

Fuente frontend: `CommunityContext`, `community.tsx`, `group-chat.tsx`.

Campos:
- `id uuid pk`
- `external_code varchar(80) unique` para migrar `palermo`, `dolfina`, etc.
- `title varchar(160) not null`
- `description text`
- `kind varchar(40) not null` enum: `club`, `tournament`, `market`, `news`, `general`.
- `icon varchar(60)`
- `tone varchar(20)`
- `is_recommended boolean not null default false`
- `is_public boolean not null default true`
- `created_by uuid references users(id)`
- `created_at`, `updated_at`, `deleted_at`, `version`

Indices:
- kind.
- is_recommended.
- deleted_at.

### 18. chat_memberships

Campos:
- `room_id uuid references chat_rooms(id)`
- `user_id uuid references users(id)`
- `role varchar(30) not null default 'member'`
- `joined_at timestamptz not null`
- `left_at timestamptz`
- `last_read_message_id uuid`
- `last_read_at timestamptz`
- primary key `(room_id, user_id)`.

Indices:
- `(user_id, left_at)`.
- `(room_id, left_at)`.

### 19. chat_messages

Campos:
- `id uuid pk`
- `room_id uuid not null references chat_rooms(id)`
- `user_id uuid not null references users(id)`
- `message_number bigint not null`
- `body text not null`
- `body_sanitized text not null`
- `status varchar(30) not null default 'sent'`
- `created_at timestamptz not null`
- `edited_at timestamptz`
- `deleted_at timestamptz`
- unique `(room_id, message_number)`.

Indices:
- `(room_id, message_number desc)`.
- `(room_id, created_at desc)`.
- user_id.

### 20. products

Fuente frontend: `services/market.ts`, `MarketContext`, `market.tsx`, `product-detail.tsx`, `market-publish.tsx`, `market-my-posts.tsx`, `favorites.tsx`.

Campos:
- `id uuid pk`
- `seller_id uuid not null references users(id)`
- `title varchar(180) not null`
- `description text not null`
- `category varchar(40) not null` enum: `equipamiento`, `indumentaria`, `vehiculos`, `inmueble`.
- `condition varchar(40) not null` enum: `Nuevo`, `Usado`, `Reacondicionado`.
- `price_cents integer not null`
- `currency char(3) not null default 'USD'`
- `status varchar(40) not null default 'pending_review'` enum: `draft`, `pending_review`, `active`, `paused`, `sold`, `rejected`.
- `location text`
- `moderation_notes text`
- `search_vector tsvector generated always as (...) stored`
- `created_at`, `updated_at`, `deleted_at`, `version`

Constraints:
- price_cents > 0.

Indices:
- `(status, created_at desc)`.
- `(seller_id, status)`.
- category.
- GIN `search_vector`.
- deleted_at.

### 21. product_images

Campos:
- `id uuid pk`
- `product_id uuid not null references products(id)`
- `url text not null`
- `storage_key text`
- `position smallint not null default 1`
- `created_at timestamptz not null`
- unique `(product_id, position)`.

### 22. product_favorites

Campos:
- `user_id uuid references users(id)`
- `product_id uuid references products(id)`
- `created_at timestamptz not null`
- primary key `(user_id, product_id)`.

Indices:
- `(user_id, created_at desc)`.
- product_id.

### 23. seller_contacts

Para boton `Contactar vendedor`, llamadas, WhatsApp y mensajes.

Campos:
- `id uuid pk`
- `product_id uuid references products(id)`
- `buyer_id uuid references users(id)`
- `seller_id uuid references users(id)`
- `contact_type varchar(30) not null` enum: `in_app`, `phone`, `whatsapp`, `email`.
- `message text`
- `created_at timestamptz not null`

Indices:
- seller_id, created_at.
- buyer_id, created_at.
- product_id.

### 24. notifications

Fuente frontend: `notifications.tsx`.

Campos:
- `id uuid pk`
- `user_id uuid not null references users(id)`
- `kind varchar(40) not null` enum: `match`, `market`, `tournament`, `message`, `system`.
- `title varchar(160) not null`
- `body text not null`
- `data jsonb not null default '{}'`
- `read_at timestamptz`
- `created_at timestamptz not null`
- `expires_at timestamptz`

Indices:
- `(user_id, read_at, created_at desc)`.
- `(user_id, created_at desc)`.

### 25. push_tokens

Campos:
- `id uuid pk`
- `user_id uuid references users(id)`
- `platform varchar(20) not null` enum: `ios`, `android`, `web`.
- `token text not null unique`
- `enabled boolean not null default true`
- `created_at`, `updated_at`, `last_seen_at`

### 26. audit_logs

Campos:
- `id uuid pk`
- `actor_user_id uuid references users(id)`
- `action varchar(100) not null`
- `resource_type varchar(80) not null`
- `resource_id uuid`
- `ip_address inet`
- `user_agent text`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null`

Indices:
- `(actor_user_id, created_at desc)`.
- `(resource_type, resource_id)`.
- action.

---

## D. Especificacion De Endpoints Por Modulo

Convenciones generales:
- Base URL: `/api/v1`.
- Auth: `Authorization: Bearer <access_token>`.
- Paginacion: `limit`, `cursor` preferido; `offset` solo para backoffice.
- Respuesta paginada:

```json
{
  "data": [],
  "page": {
    "limit": 20,
    "nextCursor": "opaque_cursor_or_null",
    "hasMore": true
  }
}
```

Errores estandar:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Producto no encontrado.",
    "details": {},
    "requestId": "req_..."
  }
}
```

### Auth

#### POST /api/v1/auth/register

Auth: no.

Body:
```json
{
  "firstName": "Adrian",
  "lastName": "Suarez",
  "email": "adrian@poloconnect.app",
  "username": "polo.connect",
  "password": "StrongPassword123!",
  "phone": "+541145567890"
}
```

201:
```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque",
  "user": {
    "id": "uuid",
    "firstName": "Adrian",
    "lastName": "Suarez",
    "email": "adrian@poloconnect.app",
    "username": "polo.connect",
    "phone": "+541145567890"
  }
}
```

Errores: 400 validation, 409 email/username exists, 429 rate limit.

#### POST /api/v1/auth/login

Body:
```json
{
  "identifier": "polo.connect",
  "password": "StrongPassword123!"
}
```

200 igual register.
Errores: 401 invalid credentials, 423 locked, 429.

#### POST /api/v1/auth/refresh

Body:
```json
{ "refreshToken": "opaque" }
```

200:
```json
{ "accessToken": "jwt", "refreshToken": "new_opaque" }
```

#### POST /api/v1/auth/logout

Auth: si. Revoca sesion actual.

#### POST /api/v1/auth/logout-all

Auth: si. Revoca todas las sesiones del usuario.

#### GET /api/v1/auth/me

Auth: si. Devuelve `AuthUser` compatible con frontend.

#### PUT /api/v1/auth/me/password

Auth: si.

Body:
```json
{ "currentPassword": "old", "newPassword": "newStrong" }
```

### Users / Profile / Settings

#### GET /api/v1/users/me

Devuelve perfil extendido: user, roles, settings, counts.

#### PATCH /api/v1/users/me

Permitir campos editables: phone, avatar, handicap. Email/username bloquear al inicio salvo flujo verificado.

#### GET /api/v1/settings/me

Auth: si.

#### PATCH /api/v1/settings/me

Body:
```json
{
  "locale": "es-AR",
  "theme": "dark",
  "pushEnabled": true,
  "emailEnabled": true,
  "profileVisibility": "public"
}
```

### Marketplace

#### GET /api/v1/products

Auth: si.

Query:
- `category=equipamiento|indumentaria|vehiculos|inmueble`
- `search=silla`
- `status=active`
- `sellerId=uuid`
- `minPriceCents`
- `maxPriceCents`
- `limit=20`
- `cursor`

200:
```json
{
  "data": [
    {
      "id": "uuid",
      "ownerId": "uuid",
      "name": "Silla Butet Usada",
      "price": 3200,
      "priceCents": 320000,
      "currency": "USD",
      "category": "equipamiento",
      "image": "https://...",
      "images": ["https://..."],
      "status": "Usado",
      "publicationStatus": "active",
      "description": "...",
      "isFavorite": false,
      "createdAt": "2026-06-24T00:00:00Z"
    }
  ],
  "page": { "limit": 20, "nextCursor": null, "hasMore": false }
}
```

Nota: mantener alias `name`, `price`, `image`, `status`, `ownerId` para no romper frontend.

#### GET /api/v1/products/:id

Incluye vendor real:
```json
{
  "id": "uuid",
  "ownerId": "uuid",
  "name": "Casco Kep Italia",
  "price": 980,
  "category": "equipamiento",
  "image": "https://...",
  "status": "Nuevo",
  "description": "...",
  "seller": {
    "id": "uuid",
    "name": "Juan Martinez",
    "location": "Buenos Aires, Argentina",
    "rating": 4.8,
    "reviews": 42,
    "phone": "+54...",
    "email": "..."
  },
  "isFavorite": true
}
```

#### POST /api/v1/products

Auth: si. Role: player/seller.

Body:
```json
{
  "name": "Casco Kep Italia",
  "description": "Casco liviano...",
  "category": "equipamiento",
  "status": "Nuevo",
  "price": 980,
  "currency": "USD",
  "imageUrl": "https://..."
}
```

201: product. Estado recomendado: `pending_review` o `active` segun decision comercial.

#### PUT /api/v1/products/:id

Auth: si. Solo owner o admin. Optimistic lock opcional con `version`.

#### DELETE /api/v1/products/:id

Auth: si. Solo owner o admin. Soft delete.

#### GET /api/v1/products/me

Para `market-my-posts.tsx`.

#### POST /api/v1/products/:id/favorite

Auth: si. Idempotente.

#### DELETE /api/v1/products/:id/favorite

Auth: si. Idempotente.

#### GET /api/v1/favorites

Devuelve lista paginada de productos favoritos.

#### POST /api/v1/products/:id/contact

Registra intento de contacto y devuelve datos permitidos.

### Community Chat

#### GET /api/v1/chat-rooms

Auth: si.

200:
```json
{
  "joined": [],
  "recommended": []
}
```

Cada room debe mapear a `ChatItem`:
```json
{
  "id": "uuid",
  "title": "Comunidad Polo Arena",
  "description": "Partidos...",
  "members": "342 miembros",
  "memberCount": 342,
  "unread": 1,
  "icon": "trophy-outline",
  "tone": "#d8ecff",
  "wasRecommended": false,
  "recommendedLabel": ""
}
```

#### POST /api/v1/chat-rooms/:roomId/join

Auth: si. Crea membership o reactiva left_at.

#### POST /api/v1/chat-rooms/:roomId/leave

Auth: si. Setea left_at.

#### GET /api/v1/chat-rooms/:roomId/messages

Query: `limit=50&before=cursor`.

200:
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Martín",
      "text": "Mensaje",
      "time": "20:58",
      "createdAt": "2026-06-24T20:58:00Z",
      "isMe": false
    }
  ],
  "page": { "limit": 50, "nextCursor": null, "hasMore": false }
}
```

#### POST /api/v1/chat-rooms/:roomId/messages

REST fallback para enviar mensaje si WS no esta conectado.

### Matches / Live

#### GET /api/v1/matches

Query:
- `date=2026-06-02`
- `status=live|upcoming|finished`
- `limit=50`
- `cursor`

200: matches compatibles con `Match`:
```json
{
  "data": [
    {
      "id": "uuid",
      "externalCode": "2-1",
      "time": "14:00",
      "team1": "La Dolfina",
      "team2": "Ellerstina",
      "score1": 8,
      "score2": 7,
      "competition": "Copa Argentina",
      "status": "live",
      "chukker": "3 de 6",
      "club": "Tortugas Club",
      "date": "2026-06-02"
    }
  ],
  "page": { "limit": 50, "nextCursor": null, "hasMore": false }
}
```

#### GET /api/v1/matches/:id

Incluye detalle: match, stats, lineups, comments, video.

#### GET /api/v1/matches/:id/events

Paginado por event_number.

#### GET /api/v1/broadcasts

Partidos grabados, YouTube URLs y metadata.

#### PATCH /api/v1/matches/:id/live-state

Auth: organizer/admin. Actualiza score, chukker, status. Emite WebSocket.

### Tournaments

#### GET /api/v1/tournaments

Query:
- `month=6`
- `year=2026`
- `registrationStatus=open`
- `limit=50`

Devuelve calendario compatible con `tournaments.tsx` y `team-register.tsx`.

#### GET /api/v1/tournaments/:id

Detalle de torneo, cupos, equipos, contacto.

#### POST /api/v1/tournaments/:id/register-team

Auth: si.

Body:
```json
{
  "teamName": "Los Sauces",
  "contactPhone": "+5411...",
  "players": [
    { "displayName": "Jugador 1", "handicap": 1, "position": 1 }
  ]
}
```

Reglas:
- Validar cupos con transaccion y lock.
- Validar handicap si el torneo lo exige.
- Crear notification para organizador.

#### GET /api/v1/tournaments/:id/registrations

Auth: organizer/admin o captain del equipo.

### Notifications

#### GET /api/v1/notifications

Query: `read=false&limit=20&cursor=...`.

#### PATCH /api/v1/notifications/:id/read

Marca una notificacion como leida.

#### PATCH /api/v1/notifications/read-all

Marca todas como leidas.

#### POST /api/v1/push-tokens

Guarda Expo push token.

---

## E. Eventos WebSocket Y Payloads

Conexion:
- URL: `/ws`
- Auth: access token en handshake.
- Reconexion cliente: exponential backoff 1s, 2s, 5s, 10s, max 30s.
- Heartbeat: ping/pong cada 25s.

### Community Chat

#### join_room

Cliente -> servidor:
```json
{ "event": "join_room", "roomId": "uuid" }
```

Servidor valida membership y une al socket a `chat:room:{roomId}`.

#### leave_room

```json
{ "event": "leave_room", "roomId": "uuid" }
```

#### message_send

Cliente -> servidor:
```json
{
  "event": "message_send",
  "roomId": "uuid",
  "clientMessageId": "local-uuid",
  "text": "Hola grupo"
}
```

Servidor -> sala:
```json
{
  "event": "message_received",
  "roomId": "uuid",
  "message": {
    "id": "uuid",
    "clientMessageId": "local-uuid",
    "messageNumber": 1024,
    "userId": "uuid",
    "userName": "Adrian",
    "text": "Hola grupo",
    "time": "20:58",
    "createdAt": "2026-06-24T20:58:00Z"
  }
}
```

#### unread_updated

```json
{
  "event": "unread_updated",
  "roomId": "uuid",
  "unread": 3
}
```

#### presence_updated

```json
{
  "event": "presence_updated",
  "roomId": "uuid",
  "onlineCount": 128
}
```

### Matches Live

Room: `match:{matchId}`.

#### subscribe_match

```json
{ "event": "subscribe_match", "matchId": "uuid" }
```

#### match_score_updated

```json
{
  "event": "match_score_updated",
  "matchId": "uuid",
  "version": 18,
  "score1": 8,
  "score2": 7,
  "chukker": "3 de 6",
  "status": "live",
  "updatedAt": "2026-06-24T20:58:00Z"
}
```

#### match_event_added

```json
{
  "event": "match_event_added",
  "matchId": "uuid",
  "eventNumber": 45,
  "type": "goal",
  "time": "72:00",
  "title": "Gol de La Dolfina",
  "text": "Adolfo Cambiaso convierte..."
}
```

#### match_stats_updated

```json
{
  "event": "match_stats_updated",
  "matchId": "uuid",
  "stats": [
    { "label": "Goles", "left": "5", "right": "3", "leftValue": 62, "rightValue": 38 }
  ]
}
```

### Notifications

Room por usuario: `user:{userId}:notifications`.

#### notification_new

```json
{
  "event": "notification_new",
  "notification": {
    "id": "uuid",
    "kind": "market",
    "title": "Tu publicacion fue aprobada",
    "body": "Tu aviso quedo activo.",
    "read": false,
    "createdAt": "2026-06-24T20:58:00Z",
    "data": { "productId": "uuid" }
  }
}
```

#### notification_read

```json
{ "event": "notification_read", "notificationId": "uuid", "readAt": "..." }
```

---

## F. Matriz De Roles Y Permisos

Roles iniciales:
- `guest`: no autenticado.
- `player`: usuario autenticado comun.
- `seller`: usuario habilitado para vender; puede ser el mismo `player`.
- `organizer`: gestiona torneos y partidos.
- `moderator`: modera market/chat.
- `admin`: acceso total.

| Recurso / Accion | Guest | Player | Seller | Organizer | Moderator | Admin |
|---|---:|---:|---:|---:|---:|---:|
| Register/Login | si | si | si | si | si | si |
| Ver Home/Live/Market/Tournaments | no | si | si | si | si | si |
| Crear producto | no | si | si | no | no | si |
| Editar producto propio | no | si | si | no | no | si |
| Eliminar producto propio | no | si | si | no | no | si |
| Moderar producto ajeno | no | no | no | no | si | si |
| Favoritos | no | si | si | si | si | si |
| Unirse a chat publico | no | si | si | si | si | si |
| Enviar mensaje | no | si | si | si | si | si |
| Borrar mensaje propio | no | si | si | si | si | si |
| Borrar mensaje ajeno | no | no | no | no | si | si |
| Crear torneo | no | no | no | si | no | si |
| Registrar equipo | no | si | si | si | si | si |
| Actualizar score live | no | no | no | si | no | si |
| Crear notificacion global | no | no | no | no | si | si |
| Ver audit logs | no | no | no | no | no | si |

Ownership checks obligatorios:
- Product update/delete: `product.seller_id === currentUser.id` o admin.
- Favorite: solo para `currentUser.id`.
- Chat message delete: owner, moderator o admin.
- Tournament registration edit: captain, organizer del torneo o admin.
- Profile/settings: solo usuario actual o admin.

---

## G. Riesgos Tecnicos Y Mitigaciones

### 1. Checkout sobre datos mock e IDs incompatibles

Riesgo: el frontend usa IDs como `2-1`, `1`, timestamps.
Mitigacion: backend usa UUID y expone `externalCode` durante migracion. El frontend debe migrar a UUID gradualmente.

### 2. Duplicacion de matches

Riesgo: `services/matches.ts` y `app/(tabs)/live.tsx` tienen datos duplicados.
Mitigacion: crear `services/api/matches.ts` y centralizar fetch; luego borrar mocks.

### 3. Chat realtime puede saturar DB

Riesgo: picos durante finales.
Mitigacion: WebSocket + Redis Pub/Sub + writes transaccionales + paginacion historica + limite de mensajes por minuto.

### 4. Product search lento

Riesgo: full scan con 50k productos.
Mitigacion: PostgreSQL GIN full-text index, filtros por status/category, cache de queries populares.

### 5. Pool de conexiones PostgreSQL

Riesgo: demasiadas replicas API abren muchas conexiones.
Mitigacion: PgBouncer + limites por instancia + queries optimizadas.

### 6. Race conditions en cupos de torneo

Riesgo: dos equipos toman el ultimo cupo.
Mitigacion: transaccion serializable o `SELECT ... FOR UPDATE` sobre torneo/contador.

### 7. Favoritos concurrentes

Riesgo: doble tap genera estados inconsistentes.
Mitigacion: endpoints idempotentes con PK `(user_id, product_id)`.

### 8. Seguridad marketplace

Riesgo: usuarios editan productos ajenos.
Mitigacion: ownership checks en service, no solo en controller.

### 9. Imagenes externas inseguras

Riesgo: URLs rotas, contenido no permitido.
Mitigacion: storage propio S3, validacion MIME, limite de tamaño, moderation.

### 10. Sesiones robadas

Riesgo: refresh token reutilizado.
Mitigacion: rotacion de refresh token, family invalidation ante reuse, device sessions.

---

## H. Plan De Implementacion Por Fases Semanas 1 A 8

### Semana 1 - Fundacion Backend

Objetivo: levantar backend base productivo.

Tareas:
- Crear proyecto NestJS.
- Configurar PostgreSQL, Redis, Prisma/TypeORM.
- Crear Docker Compose local.
- Crear health checks.
- Crear error format estandar.
- Crear logger con requestId.
- Crear migraciones iniciales: users, roles, sessions, settings.

Criterios:
- `GET /health` OK.
- DB migrada desde cero.
- Tests unitarios base pasan.

### Semana 2 - Auth, Users, Settings

Tareas:
- Register/login/refresh/logout.
- Password hashing Argon2id o bcrypt cost alto.
- JWT access 15 min, refresh 30 dias rotativo.
- `GET /auth/me` compatible con AuthContext.
- `PATCH /settings/me` para theme/locale/notificaciones.

Criterios:
- Frontend puede reemplazar `services/auth.ts` sin romper login/register.
- Sesiones revocables.

### Semana 3 - Marketplace Base

Tareas:
- Products CRUD.
- Favorites.
- My products.
- Product detail con seller real.
- Search paginada.
- Seed inicial de productos mock.

Criterios:
- `MarketContext` puede usar API real.
- Publicar/editar/eliminar persiste.
- Favorites sobreviven logout/login.

### Semana 4 - Community Chat REST + WebSocket

Tareas:
- Chat rooms.
- Membership join/leave.
- Message history paginado.
- WebSocket message_send/message_received.
- Redis Pub/Sub para fanout.

Criterios:
- `community.tsx` muestra joined/recommended desde API.
- `group-chat.tsx` envia y recibe mensajes reales.

### Semana 5 - Matches, Live Detail Y Broadcasts

Tareas:
- Matches list por fecha/status.
- Match detail con stats, lineups, events.
- Broadcasts.
- WebSocket updates de score/eventos.
- Seed de matches actuales.

Criterios:
- `live.tsx`, `match-detail.tsx` e `index.tsx` consumen API.
- Score live puede actualizar sin refresh.

### Semana 6 - Tournaments Y Team Registration

Tareas:
- Tournaments calendario.
- Registration team.
- Cupos con lock transaccional.
- Contact data.
- Notifications a organizer/captain.

Criterios:
- `tournaments.tsx` y `team-register.tsx` dejan de usar mocks.
- Registro queda persistido.

### Semana 7 - Notifications, Push, Moderacion

Tareas:
- Notifications REST.
- WebSocket notification_new/read.
- Push tokens Expo.
- Product moderation status.
- Audit logs.

Criterios:
- `notifications.tsx` consume backend.
- Notificaciones in-app en tiempo real.

### Semana 8 - Hardening Produccion

Tareas:
- Rate limits.
- Load tests chat + market search.
- PgBouncer.
- Cache Redis en queries criticas.
- Backups DB.
- Observabilidad: logs, metrics, traces.
- Smoke tests staging.

Criterios:
- P95 endpoints criticos < 300ms en carga objetivo.
- WebSocket estable en prueba de pico.
- Checklist go-live completo.

---

## I. Checklist De Lanzamiento Produccion

### Seguridad

- [ ] Passwords hasheadas con Argon2id o bcrypt.
- [ ] JWT access corto y refresh rotativo.
- [ ] Reuse de refresh token invalida familia completa.
- [ ] Rate limit en login/register/password change.
- [ ] Validacion DTO global.
- [ ] Sanitizacion de chat y descripciones.
- [ ] Ownership checks probados.
- [ ] Roles/guards activos en endpoints sensibles.
- [ ] Secrets fuera del repo.
- [ ] CORS configurado por ambiente.

### Base De Datos

- [ ] Migraciones versionadas.
- [ ] Backups automaticos.
- [ ] Restore test ejecutado.
- [ ] Indices en queries criticas.
- [ ] PgBouncer configurado para produccion.
- [ ] Soft delete implementado donde aplica.
- [ ] Auditoria en acciones sensibles.

### Performance

- [ ] Paginacion en products/messages/notifications/matches.
- [ ] Limites maximos por endpoint.
- [ ] Redis cache para listas calientes.
- [ ] Redis rate limit.
- [ ] Load test market search.
- [ ] Load test WebSocket chat.
- [ ] P95 monitoreado.

### Realtime

- [ ] Auth en handshake WebSocket.
- [ ] Rooms por chat/match/user.
- [ ] Reconexion cliente documentada.
- [ ] Redis Pub/Sub probado con 2+ replicas.
- [ ] Heartbeat ping/pong.
- [ ] Orden de mensajes garantizado por `message_number`.

### Frontend Integration

- [ ] Cliente HTTP central creado.
- [ ] AuthContext usa API real.
- [ ] MarketContext usa API real.
- [ ] CommunityContext usa API real.
- [ ] Matches service usa API real.
- [ ] Loading states revisados.
- [ ] Error states revisados.
- [ ] Offline/retry basico.

### Observabilidad

- [ ] Logs JSON con requestId.
- [ ] Error tracking.
- [ ] Metrics API latency.
- [ ] Metrics DB pool.
- [ ] Metrics Redis.
- [ ] Alerts por 5xx, latency, DB connections, WS disconnect rate.

### Operacion

- [ ] Docker image reproducible.
- [ ] Staging separado.
- [ ] Variables env documentadas.
- [ ] Deploy con rollback.
- [ ] Seed controlado para demo/prod.
- [ ] Runbook incidentes.

---

## Decisiones Abiertas De Negocio

1. Marketplace: ¿publicacion queda `active` inmediatamente o `pending_review`?
2. Marketplace: ¿habra pago por publicar? `market-publish.tsx` ya muestra costo.
3. Marketplace: ¿contacto sera in-app, WhatsApp, llamada o todos?
4. Torneos: ¿registro completo dentro de app o solo contacto telefonico?
5. Chat: ¿historial se guarda indefinidamente o se limita por sala?
6. Usuarios: ¿handicap es declarado por usuario o validado por organizador?
7. Live: ¿quien actualiza scores? ¿organizador, admin, integracion externa?
8. Notifications: ¿push real con Expo desde el MVP?
9. Imagenes: ¿storage propio desde MVP o URLs externas temporales?
10. Moderacion: ¿manual, automatica o posterior a reportes?

---

## Primer Paso Recomendado

Crear backend NestJS en carpeta `backend/`, con PostgreSQL + Redis via Docker Compose, implementar Auth completo y dejar `services/auth.ts` del frontend apuntando a API real. Despues migrar Market, Community, Matches, Tournaments y Notifications por fases.
