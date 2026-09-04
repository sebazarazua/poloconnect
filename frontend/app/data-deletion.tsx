import {
  PublicBullet,
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
      title="Eliminación de cuenta y datos"
      subtitle="Instrucciones para solicitar la eliminación de tu cuenta de Polo Connect."
    >
      <PublicSection title="Cómo solicitarlo">
        <PublicParagraph>
          Actualmente la app no tiene un botón interno de eliminación de cuenta. Para solicitar la eliminación,
          escribí al mail de soporte desde el email asociado a tu cuenta.
        </PublicParagraph>
        <PublicInlineLink label={PUBLIC_WEB_SUPPORT_EMAIL} href={`mailto:${PUBLIC_WEB_SUPPORT_EMAIL}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta%20Polo%20Connect`} />
      </PublicSection>

      <PublicSection title="Qué incluir en el pedido">
        <PublicBullet>Email registrado en Polo Connect.</PublicBullet>
        <PublicBullet>Nombre de usuario, si lo recordás.</PublicBullet>
        <PublicBullet>Una frase clara indicando que querés eliminar tu cuenta y datos asociados.</PublicBullet>
      </PublicSection>

      <PublicSection title="Alcance">
        <PublicParagraph>
          La solicitud se revisa para identificar la cuenta correcta y eliminar o desvincular los datos asociados a tu
          perfil, incluyendo datos de cuenta, sesiones, publicaciones, favoritos, membresías de comunidad, mensajes,
          notificaciones y contenido cargado por el usuario cuando corresponda.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="Más información">
        <PublicRouteLink label="Política de privacidad" href={PUBLIC_LEGAL_ROUTES.privacy} />
      </PublicSection>
    </PublicLegalPage>
  );
}
