import {
  PublicInlineLink,
  PublicLegalPage,
  PublicParagraph,
  PublicRouteLink,
  PublicSection
} from "@/components/PublicLegalPage";
import { PUBLIC_LEGAL_ROUTES, PUBLIC_WEB_SUPPORT_EMAIL } from "@/constants/publicLegal";

export default function DataDeletionPage() {
  return (
    <PublicLegalPage
      eyebrow="Cuenta y datos"
      title="Eliminacion de cuenta y datos"
      subtitle="Como eliminar tu cuenta de Polo Connect."
    >
      <PublicSection title="Desde la app">
        <PublicParagraph>
          Inicia sesion en Polo Connect y entra en Configuracion. En la seccion Eliminar cuenta podes iniciar la
          eliminacion permanente de tu cuenta y datos asociados directamente desde la app.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="Soporte">
        <PublicParagraph>
          Si no podes acceder a tu cuenta, escribinos desde el email asociado para ayudarte a recuperar el acceso o
          validar la titularidad antes de eliminar datos.
        </PublicParagraph>
        <PublicInlineLink label={PUBLIC_WEB_SUPPORT_EMAIL} href={`mailto:${PUBLIC_WEB_SUPPORT_EMAIL}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta%20Polo%20Connect`} />
      </PublicSection>

      <PublicSection title="Alcance">
        <PublicParagraph>
          La eliminacion remueve o desvincula los datos asociados a tu perfil, incluyendo datos de cuenta, sesiones,
          publicaciones, favoritos, membresias de comunidad, mensajes, notificaciones y contenido cargado por el usuario
          cuando corresponda.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="Mas informacion">
        <PublicRouteLink label="Politica de privacidad" href={PUBLIC_LEGAL_ROUTES.privacy} />
      </PublicSection>
    </PublicLegalPage>
  );
}
