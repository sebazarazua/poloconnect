# Android / EAS — Polo Connect

Android requiere una build propia para probar Google Sign-In y push remotas. El mensaje de `expo-notifications` al usar Expo Go corresponde a la eliminación del soporte de push remotas en Android desde SDK 53; el proyecto usa SDK 57. Cambiar a una APK soluciona esa limitación del cliente, pero también hay que configurar Firebase/FCM. [Documentación de Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Estado verificado el 12 de septiembre de 2026

- Proyecto EAS: `ef0b3a5b-ba32-49fc-91ca-c28215e7ebf6`.
- Package Android: `com.poloconnect.app`, versionCode local `2`.
- Ya existe una build `preview` Android terminada del 8 de septiembre. Esa APK corresponde a código anterior; se necesita una nueva para probar estos cambios.
- Hay keystore Android en EAS. La consulta de credenciales del perfil `preview` muestra **FCM V1: None assigned yet** y ninguna credencial de envío a Google Play.
- No hay `frontend/google-services.json` local ni variable EAS `GOOGLE_SERVICES_JSON`. La lista de variables del proyecto contiene solamente `EXPO_PUBLIC_API_URL` en producción. Los perfiles preview/production también definen API y los IDs públicos de Google en `eas.json`.
- El endpoint HTTPS `/api/v1/health` del backend Railway respondió `status: ok`.
- TypeScript, 67 pruebas backend, 19 pruebas de runtime Android, 3 pruebas de chat y 19 pruebas de uploads pasaron. Exportaciones Android, iOS y web y build backend pasaron.
- La comparación contra la configuración anterior (manteniendo el buildNumber `14` del usuario y excluyendo las dependencias recién añadidas de la referencia) confirmó igualdad de todos los resultados nativos iOS introspectables: Info.plist, entitlements, splash storyboard, Expo.plist y propiedades Podfile. También se verificó que ninguna versión de paquete preexistente cambió en el lockfile.
- `expo-doctor`: 20/21 verificaciones pasan. Quedan diferencias preexistentes de versiones patch en 16 paquetes Expo. Se conservaron las versiones existentes del lockfile para evitar cambiar el entorno de iOS. La introspección también informa la advertencia preexistente sobre `expo-system-ui` para `userInterfaceStyle` Android.
- No se ejecutó una compilación Gradle nueva ni una prueba en teléfono. Esta máquina no tiene `adb` disponible; faltan además las credenciales FCM. Las exportaciones verifican los bundles, no reemplazan una compilación nativa ni prueban entrega de push.

## Configuración externa necesaria

### 1. Archivo Firebase Android

En el proyecto Firebase correspondiente, registrá o seleccioná la app Android **`com.poloconnect.app`**. Descargá su archivo de configuración y guardalo como `frontend/google-services.json`. Debe ser el archivo de la app Android, no la clave privada de una service account.

`app.config.js` conserva `app.json` como base y usa `GOOGLE_SERVICES_JSON` cuando está definido; en su ausencia busca el archivo local. Las builds EAS Android rechazan un archivo ausente o que no incluya el package correcto.

El archivo local está ignorado por Git. Para suministrarlo a EAS, desde `frontend`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility sensitive --environment development --environment preview --environment production
```

La variable no usa prefijo `EXPO_PUBLIC`: sirve para la configuración nativa durante la build. Compartirla entre entornos no instala Firebase ni cambia APNs en iOS. [Configuración FCM de Expo](https://docs.expo.dev/push-notifications/fcm-credentials/).

### 2. Clave FCM V1 en EAS

En Firebase / Google Cloud habilitá Firebase Cloud Messaging API V1 y obtené una clave de service account del mismo proyecto Firebase, con permiso para enviar mensajes (Firebase Cloud Messaging API Admin). Guardá la clave privada fuera del repositorio; no va en el bundle ni en variables `EXPO_PUBLIC`.

Desde `frontend`:

```powershell
npx eas-cli@latest credentials --platform android
```

Seleccioná `preview` → `Google Service Account` → gestionar la clave para **Push Notifications (FCM V1)** → subir/seleccionar la service account correcta. Revisá también que los perfiles development y production usen la credencial FCM del mismo application identifier. Conservá el keystore existente. El backend envía Expo Push Tokens a Expo Push Service; esa clave se configura en EAS, no se agrega al backend. [Instrucciones oficiales](https://docs.expo.dev/push-notifications/fcm-credentials/).

### 3. Google OAuth Android

El login Android usa `@react-native-google-signin/google-signin`, comprueba Google Play Services y devuelve el mismo `accessToken` que consume `/auth/login/google`. El flujo AuthSession + PKCE de iOS se conserva. Google ya no admite los esquemas personalizados del flujo OAuth de navegador para Android. [Google OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [guía Expo](https://docs.expo.dev/guides/google-authentication/).

En Google Cloud Console verificá un cliente OAuth de tipo **Android** con:

- Package: `com.poloconnect.app`.
- SHA-1 del keystore EAS consultado para preview: `C9:60:F1:D7:3B:FC:89:D7:D6:DD:F4:58:81:FE:78:41:59:53:ED:1B`.
- Para una build local debug, verificá también su certificado debug. Para Google Play, agregá un cliente Android con el SHA-1 de **App signing key certificate** de Play Console, que puede diferir del certificado de subida/EAS.

Los clientes Android y el cliente **Web** deben corresponder al mismo proyecto Google Cloud. `GoogleSignin.configure` usa `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; el SDK identifica la app Android por package/certificado, no por un parámetro `androidClientId`. Los IDs Android de los perfiles EAS se conservan por compatibilidad. Verificá la pantalla de consentimiento y los usuarios de prueba si el proyecto OAuth sigue en testing. [Setup Android del SDK](https://react-native-google-signin.github.io/docs/setting-up/android).

En `frontend/.env`, para Metro con una development build podés usar los valores públicos ya existentes del perfil preview:

```env
EXPO_PUBLIC_API_URL=https://poloconnect-production.up.railway.app/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=394359246264-qsdibq97s91qf5rt6q5gn75dtoarct22.apps.googleusercontent.com
```

Para pruebas integrales con una API local, usá un endpoint HTTPS accesible desde el teléfono. `localhost` apunta al teléfono y el túnel de Expo sirve Metro, no expone automáticamente el backend. No se habilitó HTTP globalmente en las builds de producción.

## Comandos de build

Desde la raíz:

```powershell
cd frontend
npm ci --legacy-peer-deps
```

Reutilizá los perfiles existentes; no se modificó `eas.json`.

| Uso | Perfil | Resultado | Metro |
| --- | --- | --- | --- |
| Desarrollo diario | `development` | APK con development client | Sí |
| Enviar a otra persona para probar | `preview` | APK autónoma | No |
| Google Play | `production` | AAB | No |

Desarrollo, después de configurar Firebase y OAuth:

```powershell
npx eas-cli@latest build --platform android --profile development
```

Instalá la APK que entrega EAS en el teléfono. Luego ejecutá:

```powershell
npm run start:dev-client
# Si necesitás túnel para Metro:
npm run start:dev-client -- --tunnel
```

Compartir una APK que arranque sin tu computadora:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Producción / Google Play:

```powershell
npx eas-cli@latest build --platform android --profile production
```

El AAB se sube a Google Play. Para probar la experiencia firmada por Play, usá una pista de prueba interna. El perfil production ya incrementa la versión; comprobá que el versionCode supere el último publicado. El primer alta de Play y la credencial de submit son externos; ninguna app se publicó ni se enviaron builds a las tiendas durante este trabajo.

Si más adelante instalás Android Studio/SDK, podés hacer una build local Android con `npx expo run:android` después de suministrar el archivo Firebase. No hace falta regenerar el proyecto iOS.

## Flujo y aislamiento por plataforma

- Push se registra después de autenticar al usuario. Se crea el canal Android `default` antes del permiso y el backend conserva platform `android`, habilitado y último uso en el upsert del Expo Token. Sólo los mensajes enviados a tokens Android incorporan `channelId: "default"`.
- Los errores de canal, permisos, FCM/Expo o API se registran por etapa, sin imprimir tokens. Push no participa en la hidratación de sesión ni bloquea el splash de arranque.
- En Android se reintenta al volver al foreground y al rotar el token FCM. El listener pasa el token nativo recibido al obtener el Expo Token para evitar recursión. Se eliminan los listeners al desmontar y se cancela/ordena el registro antes de desregistrar al cerrar sesión.
- El tap de una notificación conserva el listener, lectura de la respuesta de arranque y deduplicación existentes, después de que auth esté lista. Chats van a `/group-chat` con `chatId`; partidos, torneos y marketplace conservan sus destinos.
- Exclusivamente en Android Expo Go se evita evaluar el módulo nativo de notificaciones. Google Android requiere build propia. Ninguna de estas excepciones deshabilita funciones en una APK real.
- `ios.bundleIdentifier`, buildNumber `14` previamente modificado por el usuario, esquemas, Apple Sign In y opciones del handler push iOS se conservan. El plugin runtime retiene únicamente mods Android; autolinking iOS excluye Google nativo y los nuevos módulos de development client. Las pruebas inspeccionan los esquemas iOS, entitlements Apple/APNs y ausencia de claves nuevas del dev launcher.
- No se modificaron credenciales/APNs ni se generó o envió una build iOS. La build ya enviada a Apple sigue siendo el mismo artefacto.
- SecureStore, tokens de sesión/refresh, APIs, sockets, navegación protegida, uploads, marketplace y pagos conservan sus flujos compartidos. Se revisaron los commits recientes de chat, notificaciones, teclado y pagos y no se revirtieron sus cambios. El deep link de Mercado Pago `polo-connect://market-publish-return` continúa registrado en Android e iOS. CSRF y CORS ya contemplan peticiones nativas con Bearer y sin Origin; no necesitan un bypass Android.

## Prueba en teléfono pendiente

No se puede certificar paridad funcional completa con exportaciones y tests unitarios. Después de instalar la nueva APK y desplegar el pequeño cambio de backend, verificá:

1. Login con contraseña, cierre/reapertura, refresh de sesión, logout y cambio de usuario; registro y recuperación de contraseña.
2. Google: selección de cuenta, cancelación y login; Apple no aparece ni se invoca en Android.
3. Android 13+: permiso aceptado/rechazado, habilitar desde settings y volver a la app; canal `default` y token `android` habilitado en el backend. Con dos cuentas y un chat permitido, enviá un mensaje con el destinatario en background. Comprobá llegada y tap con app abierta, en background y cerrada normalmente. Un force-stop explícito de Android puede impedir la entrega hasta abrir nuevamente la app.
4. Chat/socket: mensajes en vivo, reconexión, contadores de no leídos, silenciar sala, bloqueos y ausencia de avisos redundantes para quien está viendo la sala, preservando los últimos fixes.
5. Marketplace: listado, detalle, publicaciones/cámara/galería, edición, favoritos y pago con retorno a la publicación. Las pruebas de cobro deben usar el entorno/cuenta de prueba apropiados de Mercado Pago.
6. Partidos, torneos, streaming YouTube/WebView, estadísticas, navegación, enlaces externos y teclado Android.
7. Reportes, bloqueo/desbloqueo, moderación y eliminación de una cuenta de prueba; el token debe quedar deshabilitado al logout y eliminado con la cuenta.
8. Repetir los flujos críticos en el artefacto iOS existente si se despliega el cambio del backend.

Un ticket Expo aceptado no confirma entrega FCM/APNs: revisá los errores de tickets y receipts que el backend ya procesa. `InvalidCredentials`/`MismatchSenderId` apuntan a la configuración FCM; `DeviceNotRegistered` deshabilita el token inválido. No se modificaron las preferencias, silencios, bloqueos ni el procesamiento de receipts existente.
