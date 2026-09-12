# Android / EAS — Polo Connect

Android requiere una build propia para probar Google Sign-In y push remotas. El mensaje de `expo-notifications` al usar Expo Go corresponde a la eliminación del soporte de push remotas en Android desde SDK 53; el proyecto usa SDK 57. Cambiar a una APK soluciona esa limitación del cliente, pero también hay que configurar Firebase/FCM. [Documentación de Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Estado verificado el 12 de septiembre de 2026

- Proyecto EAS: `ef0b3a5b-ba32-49fc-91ca-c28215e7ebf6`.
- Package Android: `com.poloconnect.app`, versionCode local `2`.
- Ya existe una build `preview` Android terminada del 8 de septiembre. Esa APK corresponde al Google OAuth anterior con AuthSession: puede volver a probarse después de habilitar su Custom URI scheme en Google, sin consumir otra build. Para probar el SDK nativo y los demás cambios posteriores sí hace falta una APK nueva.
- Hay keystore Android en EAS. La consulta de credenciales del perfil `preview` muestra **FCM V1: None assigned yet** y ninguna credencial de envío a Google Play.
- El JSON Firebase nuevo está integrado en `frontend/google-services.json` (ignorado por Git) y como variable EAS de archivo `GOOGLE_SERVICES_JSON`, sensitive, únicamente en preview. Se verificaron package, cliente Android nuevo, SHA-1 y cliente Web tanto localmente como en la variable remota. Los perfiles preview/production conservan sus IDs públicos de Google en `eas.json`.
- El endpoint HTTPS `/api/v1/health` del backend Railway respondió `status: ok`.
- TypeScript, 67 pruebas backend, 19 pruebas de runtime Android, 3 pruebas de chat y 19 pruebas de uploads pasaron. Exportaciones Android, iOS y web y build backend pasaron.
- La comparación contra la configuración anterior (manteniendo el buildNumber `14` del usuario y excluyendo las dependencias recién añadidas de la referencia) confirmó igualdad de todos los resultados nativos iOS introspectables: Info.plist, entitlements, splash storyboard, Expo.plist y propiedades Podfile. También se verificó que ninguna versión de paquete preexistente cambió en el lockfile.
- `expo-doctor`: 20/21 verificaciones pasan. Quedan diferencias preexistentes de versiones patch en 16 paquetes Expo. Se conservaron las versiones existentes del lockfile para evitar cambiar el entorno de iOS. La introspección también informa la advertencia preexistente sobre `expo-system-ui` para `userInterfaceStyle` Android.
- No se ejecutó una compilación Gradle nueva ni una prueba en teléfono. ADB está instalado en el SDK Android pero no hay teléfono/emulador conectado; faltan además las credenciales FCM. Las exportaciones verifican los bundles, no reemplazan una compilación nativa ni prueban entrega de push.

## Configuración externa necesaria

### 1. Archivo Firebase Android

En el proyecto Firebase correspondiente, registrá o seleccioná la app Android **`com.poloconnect.app`**. Descargá su archivo de configuración y guardalo como `frontend/google-services.json`. Debe ser el archivo de la app Android, no la clave privada de una service account.

`app.config.js` conserva `app.json` como base y usa `GOOGLE_SERVICES_JSON` cuando está definido; en su ausencia busca el archivo local. Las builds EAS Android rechazan un archivo ausente o que no incluya el package correcto.

El archivo local está ignorado por Git. Para suministrarlo a EAS, desde `frontend`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility sensitive --environment preview
```

La variable no usa prefijo `EXPO_PUBLIC`: sirve para la configuración nativa durante la build. El perfil preview selecciona explícitamente `environment: preview`; no se modificaron variables EAS de production/development. [Variables de archivo EAS](https://docs.expo.dev/eas/environment-variables/).

### 2. Clave FCM V1 en EAS

En Firebase / Google Cloud habilitá Firebase Cloud Messaging API V1 y obtené una clave de service account del mismo proyecto Firebase, con permiso para enviar mensajes (Firebase Cloud Messaging API Admin). Guardá la clave privada fuera del repositorio; no va en el bundle ni en variables `EXPO_PUBLIC`.

Desde `frontend`:

```powershell
npx eas-cli@latest credentials --platform android
```

Seleccioná `preview` → `Google Service Account` → gestionar la clave para **Push Notifications (FCM V1)** → subir/seleccionar la service account correcta. Revisá también que los perfiles development y production usen la credencial FCM del mismo application identifier. Conservá el keystore existente. El backend envía Expo Push Tokens a Expo Push Service; esa clave se configura en EAS, no se agrega al backend. [Instrucciones oficiales](https://docs.expo.dev/push-notifications/fcm-credentials/).

### 3. Google OAuth Android

#### Diagnóstico del error Custom URI scheme

El mensaje `Error 400: invalid_request — Custom URI scheme is not enabled for your Android client` indica que Google rechazó el redirect personalizado del cliente Android antes de emitir el código/token. La primera corrección es **A: habilitar la opción externa del cliente existente**. No requiere cambiar la librería, el redirect ni el backend para subsanar ese rechazo. La afirmación anterior de esta guía de que Google no admitía esos esquemas era demasiado categórica: están deshabilitados por defecto, pero Google documenta cómo habilitarlos en Advanced Settings. [Restricción y opción oficial de Google](https://developers.googleblog.com/improving-user-safety-in-oauth-flows-through-new-oauth-custom-uri-scheme-restrictions/), [descripción de la opción](https://support.google.com/googleapi/answer/6158849?hl=en).

Hay dos versiones distintas verificadas en esta revisión:

| Versión | Flujo Android | Evidencia |
| --- | --- | --- |
| Última APK preview terminada, build `4b1404e5-cd90-4a6a-b02f-a2ec31b2820d`, 8/09/2026, commit `b1dd62af` | AuthSession, autorización code + PKCE, redirect personalizado | Metadatos EAS; bundle APK contiene el client ID Android y `:/oauthredirect`, y no contiene `RNGoogleSignin`; manifiesto registra el scheme correcto |
| Rama actual, commit `c86b1db` | SDK Google nativo | `handleGoogleLogin` entra en la rama Android, obtiene accessToken y retorna antes de `promptGoogle` |

El hook AuthSession sigue construyendo una request Android en el código actual, pero no abre el navegador automáticamente. El error reportado corresponde al flujo de navegador; sin un dispositivo conectado no se puede identificar qué artefacto está instalado. La última APK preview disponible contiene precisamente ese flujo. No se hizo otra migración ni se revirtió la ya incorporada en `c86b1db` durante este diagnóstico.

#### Cambio manual en Google Cloud Console

1. Seleccioná el proyecto que contiene los IDs OAuth cuyo prefijo es `394359246264`. Entrá a **Google Auth Platform → Clients**; en la interfaz anterior, **APIs & Services → Credentials → OAuth 2.0 Client IDs**. [Ruta actual oficial](https://support.google.com/cloud/answer/15549257).
2. Abrí el cliente de tipo **Android** con ID exacto `394359246264-di5ov5m0scidob7doa9ikq15p6p8ei2t.apps.googleusercontent.com`, configurado en `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` de preview y production. No abras el cliente Web ni el iOS para este ajuste.
3. Confirmá package **`com.poloconnect.app`** y SHA-1 del certificado indicado abajo. Expandí **Advanced settings → Custom URI scheme**, activá **Enable custom URI scheme** y guardá. Si no aparece esa sección, confirmá primero el tipo e ID del cliente que figura en los detalles del error; no reemplaces este ajuste por un redirect Web ni por otro scheme en código.
4. Reutilizá el cliente existente si package y certificado coinciden. No hace falta crear otra credencial por tener el scheme deshabilitado. Si otra distribución usa una firma diferente, registrá otro cliente Android para ese package/SHA-1; conservá la credencial de preview. Google Play puede usar un **App signing key certificate** distinto de la clave de subida/EAS; verificá su SHA-1 en Play Console para la app distribuida por Play.
5. Volvé a probar **la misma APK preview** después de guardar la configuración. Compará `client_id` y `redirect_uri` de los detalles OAuth si aún hay un rechazo. No hace falta una build para activar esta opción de Google. No se accedió a tu Google Cloud Console ni se modificó ninguna credencial externamente durante esta revisión.

Redirect del flujo AuthSession revisado:

```text
com.googleusercontent.apps.394359246264-di5ov5m0scidob7doa9ikq15p6p8ei2t:/oauthredirect
```

El scheme anterior a `:` ya está registrado en `app.json` y en el manifiesto de la APK auditada. `polo-connect` también está registrado, pero no es el redirect de este OAuth. No hace falta agregar este redirect al cliente Web.

#### Certificado EAS y certificado real de la APK

Las consultas de credenciales EAS `preview` y `production` mostraron la misma configuración por defecto **Build Credentials krlxfM660A**, keystore JKS, alias `d7fd76a2c1cca4da92cb6b6167a3cda8`. `apksigner verify --print-certs` confirmó que la APK preview descargada está firmada por ese mismo certificado:

```text
SHA-1:   C9:60:F1:D7:3B:FC:89:D7:D6:DD:F4:58:81:FE:78:41:59:53:ED:1B
SHA-256: 2B:A6:2F:01:7E:2D:89:6E:D5:AA:82:C1:84:3E:2F:5D:A5:99:4D:46:31:5A:F1:54:67:6F:7D:2C:72:8D:D8:7B
```

El cliente OAuth Android requiere **SHA-1**, no un campo SHA-256. SHA-256 se incluye para contrastar el certificado; no habilita el Custom URI scheme ni reemplaza SHA-1. [Requisitos oficiales del cliente Android](https://support.google.com/cloud/answer/15549257).

Para consultar fingerprints sin descargar ni regenerar el keystore, desde `frontend`:

```powershell
npx eas-cli@latest credentials --platform android
# Seleccionar preview; leer SHA1 Fingerprint y SHA256 Fingerprint; salir con Ctrl+C.
```

Para comprobar exactamente el certificado de cualquier APK existente en esta PC:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\apksigner.bat" verify --print-certs "C:\ruta\PoloConnect.apk"
```

Opcionalmente, si ya descargaste el keystore mediante EAS, `keytool -list -v -keystore "C:\ruta\keystore.jks" -alias d7fd76a2c1cca4da92cb6b6167a3cda8` muestra ambos fingerprints; ingresá la contraseña en el prompt, sin ponerla en código ni argumentos guardados. No uses el certificado `androiddebugkey` de Android Studio para una APK firmada con el keystore EAS.

#### Código actual y token hacia el backend

El archivo nuevo contiene el cliente Android `394359246264-hfegectv4odjt7opi6crv8l03ablgpq0.apps.googleusercontent.com`, client_type 1, package `com.poloconnect.app` y certificate_hash `c960f1d73bfc89d7d6ddf45881fe78415953ed1b`; también contiene el cliente Web `394359246264-qsdibq97s91qf5rt6q5gn75dtoarct22.apps.googleusercontent.com`, client_type 3. El SDK no recibe un Android client ID explícito: Google identifica la app por package y certificado. Se conservó `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` con el valor histórico, utilizado sólo por la request AuthSession que Android no abre; no se reemplazó el Web ID ni se agregó el scheme del cliente Android nuevo.

La integración pasó typecheck, 41 pruebas frontend, 67 backend y expo config introspect. Un prebuild Android aislado, sin instalar dependencias ni compilar, copió exactamente el JSON nuevo a android/app e incorporó Google Services 4.4.4 al Gradle del proyecto y su plugin al Gradle de la app. Se eliminó esa carpeta temporal; queda una sola copia del JSON en el proyecto. Los cinco resultados nativos iOS introspectables permanecieron idénticos antes/después. No se ejecutó EAS Build ni se alteró backend, Apple o email/password.

El login Android actual usa `@react-native-google-signin/google-signin`, comprueba Google Play Services y devuelve el mismo `accessToken` que consume `/auth/login/google`. `GoogleSignin.configure` usa `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; el SDK identifica Android por package/certificado, sin parámetro `androidClientId` ni el redirect personalizado. Los clientes Android y Web deben estar en el mismo proyecto Google. Activar el scheme resuelve el rechazo del flujo anterior y no modifica el flujo nativo actual. [Setup Android del SDK](https://react-native-google-signin.github.io/docs/setting-up/android).

Ambos flujos envían `{ accessToken }` a `POST /auth/login/google`; el backend consulta Google userinfo y devuelve su sesión habitual (JWT/refresh/CSRF). No se cambió ese contrato ni la persistencia de sesión. El flujo iOS AuthSession code + PKCE, cliente iOS, Apple, email/password y configuración de producción permanecen intactos en esta revisión.

Preview genera una APK standalone y production un AAB con autoIncrement. Comparten API e IDs Google en `eas.json`, pero una instalación desde Play puede llevar otro certificado. El archivo nuevo ya satisface la comprobación Android de `app.config.js`; la variable EAS preview selecciona ese mismo archivo durante la build y no sobrescribe los IDs `EXPO_PUBLIC`.

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

Reutilizá los perfiles existentes; el único ajuste en `eas.json` fue explicitar `environment: preview` en el perfil preview para usar la variable de archivo nueva.

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

### Teclado del chat Android

`group-chat` es una pantalla del Stack raíz, fuera de los tabs. Su árbol es SafeAreaView → header + contenedor flex → lista flex + barra de mensajes. Android conserva `softwareKeyboardLayoutMode: resize` (`adjustResize` en el manifiesto nativo).

En Android el KeyboardAvoidingView queda deshabilitado y sin behavior `height`: el sistema nativo ajusta el espacio disponible y la lista flex ocupa lo que queda después de la barra. Esto evita que una altura JS basada en el frame inicial compita con el resize nativo. No se agregaron posiciones ni alturas de teclado fijas. La barra respeta `insets.bottom` con el teclado cerrado y mantiene su padding interno habitual con el teclado abierto. Los listeners Android `keyboardDidShow`/`keyboardDidHide` actualizan ese estado y se eliminan al desmontar. El `onLayout` de la lista acompaña el resize y el crecimiento del input multilínea.

La rama iOS conserva `behavior: padding`, offset `0`, los listeners `keyboardWillShow`/`keyboardDidShow`/`keyboardWillHide`, el cálculo de safe area y los estilos anteriores. No se modificaron el envío optimista, la recepción/reconexión por socket ni las reglas de visibilidad del chat.

### “Cannot connect to Expo CLI”

El texto proviene de `expo/src/async-require/hmrUtils.native.ts`: el cliente HMR muestra el error cuando no puede establecer la conexión con el servidor de desarrollo. Puede aparecer en una development build o Expo Go si Metro se detuvo, el teléfono cambió de red, quedó seleccionada una dirección anterior o falló la conexión LAN/túnel/USB. Es un fallo de conectividad del entorno de desarrollo, no un aviso que deba aparecer durante una sesión conectada correctamente. Desactivar Fast Refresh no convierte una development build en una APK autónoma.

Los perfiles actuales están bien diferenciados: `development` tiene `developmentClient: true`; preview y production no lo tienen ni fuerzan un comando Gradle debug. El plugin Android aplica la configuración oficial del dev client y no establece un servidor HMR ni una URL de Metro fija. No se alteraron estos perfiles ni el plugin para ocultar el mensaje. Una APK nueva construida con **preview** incorpora un bundle release y funciona sin Metro; ese runtime no debe conectar HMR. Si el warning aparece allí, comprobá que instalaste/abriste la APK preview y no una development build anterior.

Para LAN, desde `frontend`:

```powershell
npm run start:dev-client -- --lan
```

Mantené Metro abierto, usá la misma red Wi-Fi y abrí el enlace/QR actual con la development build. Comprobá el endpoint de Metro:

```powershell
Invoke-RestMethod http://127.0.0.1:8081/status
```

Debe devolver `packager-status:running`. Desde el navegador del teléfono probá `http://IP_DE_LA_PC:8081/status`; si la PC responde y el teléfono no, revisá acceso LAN, aislamiento Wi-Fi/VPN y la regla del firewall para Node/puerto 8081. Este endpoint no verifica por sí solo la conexión WebSocket de HMR.

Como alternativa de red:

```powershell
npm run start:dev-client -- --tunnel
```

Abrí el nuevo enlace del túnel. Para USB, con Android SDK Platform Tools y depuración USB autorizada:

```powershell
adb devices
adb reverse tcp:8081 tcp:8081
npm run start:dev-client -- --localhost
```

Abrí `http://127.0.0.1:8081` desde el launcher de la development build. El reverse es para Metro; si también usás un backend local, configurá su conectividad por separado. Si `adb` no está en PATH, en esta PC está instalado en la ruta estándar del SDK:

```powershell
$taskAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $taskAdb devices
& $taskAdb reverse tcp:8081 tcp:8081
npm run start:dev-client -- --localhost
```

En esta revisión Metro respondió desde la PC y ADB no encontró ningún teléfono/emulador conectado, así que no se puede atribuir el caso concreto a LAN, túnel o USB sin la URL/error completo de la advertencia. Si ya hay un Metro ejecutándose, usá esa terminal o detenelo con Ctrl+C antes de iniciar otra instancia en el mismo puerto. [Uso de development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/), [Expo CLI / conectividad](https://docs.expo.dev/more/expo-cli/).

### Flujos que se conservan

- Push se registra después de autenticar al usuario. Se crea el canal Android `default` antes del permiso y el backend conserva platform `android`, habilitado y último uso en el upsert del Expo Token. Sólo los mensajes enviados a tokens Android incorporan `channelId: "default"`.
- Los errores de canal, permisos, FCM/Expo o API se registran por etapa, sin imprimir tokens. Push no participa en la hidratación de sesión ni bloquea el splash de arranque.
- En Android se reintenta al volver al foreground y al rotar el token FCM. El listener pasa el token nativo recibido al obtener el Expo Token para evitar recursión. Se eliminan los listeners al desmontar y se cancela/ordena el registro antes de desregistrar al cerrar sesión.
- El tap de una notificación conserva el listener, lectura de la respuesta de arranque y deduplicación existentes, después de que auth esté lista. Chats van a `/group-chat` con `chatId`; partidos, torneos y marketplace conservan sus destinos.
- Exclusivamente en Android Expo Go se evita evaluar el módulo nativo de notificaciones. Google Android requiere build propia. Ninguna de estas excepciones deshabilita funciones en una APK real.
- `ios.bundleIdentifier`, buildNumber `14` previamente modificado por el usuario, esquemas, Apple Sign In y opciones del handler push iOS se conservan. El plugin runtime retiene únicamente mods Android; autolinking iOS excluye Google nativo y los nuevos módulos de development client. Las pruebas inspeccionan los esquemas iOS, entitlements Apple/APNs y ausencia de claves nuevas del dev launcher.
- No se modificaron credenciales/APNs ni se generó o envió una build iOS. La build ya enviada a Apple sigue siendo el mismo artefacto.
- SecureStore, tokens de sesión/refresh, APIs, sockets, navegación protegida, uploads, marketplace y pagos conservan sus flujos compartidos. Se revisaron los commits recientes de chat, notificaciones, teclado y pagos y no se revirtieron sus cambios. El deep link de Mercado Pago `polo-connect://market-publish-return` continúa registrado en Android e iOS. CSRF y CORS ya contemplan peticiones nativas con Bearer y sin Origin; no necesitan un bypass Android.

## Prueba en teléfono pendiente

Para comprobar la corrección del teclado del chat en la nueva versión:

1. Con teclado cerrado, verificá que input y enviar queden por encima de la navegación del sistema, tanto con gestos como con tres botones.
2. Abrí el teclado: toda la barra debe quedar sobre él, sin quedar tapada; la lista debe reducir su espacio y mantener visible el último mensaje.
3. Escribí varias líneas hasta alcanzar el alto máximo existente del input; el botón debe seguir visible y el input debe poder desplazar su texto.
4. Enviá el mensaje con el teclado abierto y recibí otro desde una segunda cuenta; verificá el envío optimista, la recepción en tiempo real y ausencia de duplicados.
5. Abrí/cerrá el teclado repetidamente, cambiá su alto/tipo y comprobá que la lista recupere su espacio al cerrar.
6. Repetí en pantallas Android pequeñas y grandes, con distintos teclados. No hay teléfono conectado para ejecutar esta prueba física durante la revisión.

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
