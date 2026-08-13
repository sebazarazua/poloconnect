# Polo Connect

Paso a paso definitivo para levantar la app, poder registrarte, loguearte y usar Expo Go sin depender del agente.

## Comandos probados (copiar y pegar)

1. Preparacion (una sola vez):

```bash
npm install
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
npm --prefix frontend install --legacy-peer-deps
```

2. Levantar backend:

```bash
npm run ports:free
npm run infra:up
npm run backend:migrate
npm run backend:dev
```

3. En otra terminal, levantar Expo Go con QR:

```bash
cd frontend
npm run start:tunnel
```

4. Validar login seed en app:

- identifier: polo.connect
- password: PoloConnect123!

## 1) Requisitos

- Node.js 20+
- npm 10+
- Docker Desktop encendido
- Expo Go en el telefono (si usaras celular)

## 2) Setup inicial (una sola vez)

Desde la raiz del repo:

```bash
npm install
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Luego instalar frontend (importante en este repo):

```bash
npm --prefix frontend install --legacy-peer-deps
```

## 3) Configuracion minima obligatoria de .env

En backend/.env dejar estos valores locales:

```env
PORT=4000
API_PREFIX=api/v1
DATABASE_URL=postgresql://poloconnect:poloconnect@localhost:5432/poloconnect?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=replace-with-a-random-secret-at-least-32-chars
```

En frontend/.env usar UNO de estos escenarios.

Escenario PC local (simulador web/dev en la misma maquina):

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Escenario telefono con Expo Go (recomendado para uso real):

```env
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:4000/api/v1
```

Para obtener TU_IP_LOCAL en Windows (PowerShell):

```powershell
$ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL|Hyper-V' -and $_.IPAddress -match '^192\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.' } | Select-Object -First 1 -ExpandProperty IPAddress); if (-not $ip) { $ip=(ipconfig | Select-String -Pattern 'IPv4 Address|Direccion IPv4|Dirección IPv4' | Select-Object -First 1).ToString().Split(':')[-1].Trim() }; $ip
```

## 4) Arranque recomendado (definitivo)

Este flujo evita problemas de QR oculto por logs mezclados.

Terminal 1 (raiz):

```bash
npm run ports:free
npm run infra:up
npm run backend:migrate
npm run backend:dev
```

Terminal 2 (separada):

```bash
cd frontend
npm run start:tunnel
```

Atencion: el comando es start:tunnel (sin espacio). No usar start: tunnel.

Si pregunta por puerto ocupado, responde Y para cambiar (por ejemplo 8082).

Cuando este bien, veras:

- Metro waiting on exp://...
- un QR en terminal

## 5) Como abrir en Expo Go

1. Abri Expo Go en el telefono.
2. Escanea el QR de la terminal donde corriste start:tunnel.
3. Si no queres QR, abre el link exp://... que aparece en esa terminal.

## 6) Verificacion rapida de salud

En otra terminal, desde la raiz:

```bash
curl http://localhost:4000/api/v1/health
docker ps
```

Debe responder status ok y contenedores postgres/redis en healthy.

## 7) Registro y login

Registro:

- Usa la pantalla Register de la app.
- Debe funcionar si backend esta arriba y EXPO_PUBLIC_API_URL apunta bien.

Login con usuario seed:

```bash
npm --prefix backend run prisma:seed
```

Credenciales:

- identifier: polo.connect (o adrian@poloconnect.app)
- password: PoloConnect123!

## 8) Datos demo para usar mas modulos

```bash
npm run backend:seed:auctions
npm run backend:seed:brands-showcase
npm run backend:seed:live-match
```

## 9) Uso desde PC (web)

La app general esta bloqueada en web por defecto.

Admin web SI habilitado con credenciales:

- /admin-login
- /admin-panel

Si necesitas habilitar web general solo para desarrollo:

En frontend/.env:

```env
EXPO_PUBLIC_ENABLE_WEB_DEV=true
```

Y luego:

```bash
cd frontend
npm run web
```

## 10) Errores comunes y solucion

No aparece QR:

- Corre Expo en terminal separada con npm run start:tunnel.
- Si pide cambiar puerto, responde Y.

Error npm ERR! Missing script: "start:":

- Ocurre por escribir npm run start: tunnel.
- Usa npm run start:tunnel.

Error ERESOLVE en frontend:

- Ejecuta npm --prefix frontend install --legacy-peer-deps.

Login/registro falla en telefono:

- No usar localhost en frontend/.env.
- Usar la IP local de la PC.
- Reiniciar backend y Expo luego de cambiar .env.

Network request failed:

- Verifica que celular y PC tengan conectividad.
- Revisa firewall de Windows para puerto 4000.

## 11) Comandos utiles

```bash
npm run dev:up
npm run dev:up:phone
npm run dev:down
npm run backend:dev
npm run frontend:start:tunnel
npm run backend:migrate
npm run typecheck
```

## 12) Nota sobre Expo

Si aparece advertencia de version esperada de expo (ejemplo ~54.0.36), no siempre bloquea el arranque ni el login.
