import {
  PublicInlineLink,
  PublicLegalPage,
  PublicParagraph,
  PublicRouteLink,
  PublicSection
} from "@/components/PublicLegalPage";
import { PUBLIC_LEGAL_ROUTES, SUPPORT_EMAIL } from "@/constants/publicLegal";

export default function SupportPage() {
  return (
    <PublicLegalPage
      eyebrow="Ayuda"
      title="Soporte de Polo Connect"
      subtitle="Canal de contacto para asistencia sobre la app y sus servicios."
    >
      <PublicSection title="Cómo podemos ayudarte">
        <PublicParagraph>
          Podés pedir ayuda por problemas de cuenta, publicaciones del mercado, torneos, transmisiones en vivo,
          comunidad, remates o funcionamiento general de Polo Connect.
        </PublicParagraph>
        <PublicParagraph>
          Escribinos con tu nombre de usuario, email registrado, pantalla donde ocurrió el problema y una breve
          descripción para poder revisarlo.
        </PublicParagraph>
      </PublicSection>

      <PublicSection title="Contacto">
        <PublicParagraph>Mail de soporte:</PublicParagraph>
        <PublicInlineLink label={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
      </PublicSection>

      <PublicSection title="Información útil">
        <PublicRouteLink label="Política de privacidad" href={PUBLIC_LEGAL_ROUTES.privacy} />
        <PublicRouteLink label="Eliminación de cuenta/datos" href={PUBLIC_LEGAL_ROUTES.dataDeletion} />
      </PublicSection>
    </PublicLegalPage>
  );
}
