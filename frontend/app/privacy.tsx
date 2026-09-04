import {
  PublicBullet,
  PublicInlineLink,
  PublicLegalPage,
  PublicParagraph,
  PublicRouteLink,
  PublicSection
} from "@/components/PublicLegalPage";
import { PUBLIC_LEGAL_ROUTES, PUBLIC_WEB_SUPPORT_EMAIL } from "@/constants/publicLegal";

export default function PrivacyPage() {
  return (
    <PublicLegalPage
      eyebrow="Privacidad"
      title="Política de privacidad"
      subtitle="Resumen claro de cómo Polo Connect usa la información necesaria para operar la app."
    >
      <PublicSection title="Información que usa la app">
        <PublicBullet>Datos de cuenta como nombre, apellido, email, nombre de usuario, teléfono opcional y avatar.</PublicBullet>
        <PublicBullet>Credenciales y sesiones para iniciar sesión, mantener la cuenta protegida y permitir recuperación de contraseña.</PublicBullet>
        <PublicBullet>Datos de uso dentro de la app, como publicaciones, favoritos, chats de comunidad, inscripciones, notificaciones y acciones de administración cuando correspondan.</PublicBullet>
        <PublicBullet>Imágenes subidas por el usuario para avatar, publicaciones, marcas, equipos, partidos o remates.</PublicBullet>
      </PublicSection>

      <PublicSection title="Para qué se usa">
        <PublicParagraph>
          La información se usa para crear y administrar la cuenta, mostrar perfiles y publicaciones, permitir contacto
          entre usuarios cuando corresponde, operar torneos, transmisiones, comunidades, remates, notificaciones y
          funciones de soporte.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="Servicios relacionados">
        <PublicParagraph>
          Polo Connect puede usar proveedores externos para autenticación, pagos de publicaciones, almacenamiento de
          imágenes, email, notificaciones, videos embebidos o noticias externas cuando esas funciones están activas en
          la app.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="Publicaciones y comunidad">
        <PublicParagraph>
          El contenido que publicás en mercado, comunidad, remates o módulos públicos puede mostrarse a otros usuarios
          de Polo Connect según la configuración y estado de cada flujo.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="Eliminación de datos">
        <PublicParagraph>
          Podés solicitar eliminación de cuenta y datos asociados desde el canal de soporte.
        </PublicParagraph>
        <PublicRouteLink label="Ver cómo solicitar eliminación" href={PUBLIC_LEGAL_ROUTES.dataDeletion} />
      </PublicSection>

      <PublicSection title="Contacto">
        <PublicParagraph>Para consultas de privacidad, escribí a:</PublicParagraph>
        <PublicInlineLink label={PUBLIC_WEB_SUPPORT_EMAIL} href={`mailto:${PUBLIC_WEB_SUPPORT_EMAIL}`} />
      </PublicSection>
    </PublicLegalPage>
  );
}
