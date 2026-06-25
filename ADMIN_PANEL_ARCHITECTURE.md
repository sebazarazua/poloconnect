# Admin Panel Architecture and Implementation Plan

## 1. Architecture
- Frontend admin UI (web): integrated in Expo web routes (`/admin-login`, `/admin-panel`) with role-based checks.
- Backend API (NestJS): secured admin routes under `/api/v1/admin/*` and public content routes under `/api/v1/content/*`.
- Database (PostgreSQL/Prisma): new entities for dynamic app content and community moderation.
- Storage: local upload support (`/uploads/*`) via `POST /api/v1/admin/content/upload`.
- Audit: critical admin actions recorded in `AuditLog` and moderation-specific history in `CommunityModerationAction`.

## 2. Data Model (new)
- `AppContentItem`
  - Purpose: logo, ads, banners, news, generic content.
  - Core fields: `type`, `section`, `slot`, `title`, `subtitle`, `body`, `imageUrl`, `targetUrl`, `priority`, `sortOrder`, `isActive`, `startsAt`, `endsAt`, `deletedAt`.
  - Indexes: section/slot/active and visibility windows.
- `CommunityBan`
  - Purpose: permanent/temporary bans per room + revocation.
  - Core fields: `roomId`, `userId`, `reason`, `isPermanent`, `expiresAt`, `revokedAt`.
- `CommunityModerationAction`
  - Purpose: add/remove/ban/unban history for traceability.

## 3. Security Implementation
- JWT access token (short-lived) with role claims.
- Refresh rotation with DB-backed `AuthSession`.
- HttpOnly refresh cookie: `pc_refresh`.
- CSRF cookie + header validation (`pc_csrf` + `x-csrf-token`) for mutating admin requests.
- Role guard (`admin`, `superadmin`) with future-ready role split.
- Account lockout support:
  - `AUTH_MAX_FAILED_ATTEMPTS`
  - `AUTH_LOCK_MINUTES`
- Audit logging for admin actions.

## 4. Admin Endpoints
- Dashboard
  - `GET /api/v1/admin/dashboard`
- Content
  - `GET /api/v1/admin/content/items`
  - `POST /api/v1/admin/content/items`
  - `PUT /api/v1/admin/content/items/:id`
  - `DELETE /api/v1/admin/content/items/:id`
  - `POST /api/v1/admin/content/upload`
- Community moderation
  - `GET /api/v1/admin/community/rooms`
  - `GET /api/v1/admin/community/rooms/:roomId/members`
  - `GET /api/v1/admin/community/rooms/:roomId/bans`
  - `GET /api/v1/admin/community/rooms/:roomId/moderation-history`
  - `POST /api/v1/admin/community/rooms/:roomId/members/:userId/remove`
  - `POST /api/v1/admin/community/rooms/:roomId/members/:userId/add`
  - `POST /api/v1/admin/community/rooms/:roomId/members/:userId/ban`
  - `POST /api/v1/admin/community/rooms/:roomId/members/:userId/unban`
- Sports base
  - `GET /api/v1/admin/sports/tournaments`
  - `POST /api/v1/admin/sports/tournaments`
  - `GET /api/v1/admin/sports/matches`
  - `POST /api/v1/admin/sports/matches`
  - `PUT /api/v1/admin/sports/matches/:matchId/stats`

## 5. Public Content Endpoints (for app)
- `GET /api/v1/content/home`
- `GET /api/v1/content/section/:section?slot=:slot`

## 6. Frontend Integration
- Home, Live, Community carousels now support DB-driven content with fallback to local assets.
- Home news carousel supports DB-driven news cards from `content.home.main_news`.
- Admin web routes added:
  - `/admin-login`
  - `/admin-panel`

## 7. Seeds
- Roles:
  - `admin`
  - `superadmin`
- Users:
  - Superadmin: existing `adrian@poloconnect.app` (+ superadmin role)
  - Admin: `admin@poloconnect.app`
- Initial dynamic content seeds for:
  - home hero ads
  - home compact ads
  - main news
  - app logo

## 8. Test Checklist
- Auth and security
  - Login lockout after failed attempts.
  - Refresh works through cookie.
  - Mutating admin requests fail without valid CSRF header.
  - Non-admin user denied on `/admin/*`.
- Content
  - Create/update/delete admin content reflects in `/content/home`.
  - Home app reflects updated ads/news/logo content.
- Community moderation
  - Banned users cannot join/read/send in banned room.
  - Unban allows re-join.
  - Moderation history stores actions.
- Sports base
  - Tournament/match/stat CRUD base flow works.

## 9. Next Hardening Steps
- Add strict CORS allowlist in production.
- Move uploads from local disk to S3-compatible object storage.
- Add per-IP login rate limiter middleware.
- Add explicit permission matrix (`permission` table) for future `superadmin` differentiation.
- Add e2e tests (auth cookies + CSRF + admin content pipeline).
