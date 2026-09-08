/**
 * Logos locales de equipos de polo.
 *
 * Los logos se obtienen desde el backend o se generan por URL como fallback.
 */
import type { ImageSourcePropType } from "react-native";
import { getTeamLogoUrl } from "@/services/matches";
import { resolveContentImageSource } from "@/services/content-images";

/**
 * Devuelve un avatar generado para el equipo cuando todavía no hay un logo
 * subido desde el panel de administración.
 */
export function getTeamLogoSource(
  teamName: string,
  size = 128
): ImageSourcePropType {
  return { uri: getTeamLogoUrl(teamName, size) };
}

/**
 * Como getTeamLogoSource, pero prioriza el logo real subido desde el panel
 * admin (logoUrl) antes que el logo local o el avatar generado.
 */
export function resolveTeamLogoSource(
  teamName: string,
  logoUrl?: string | null,
  size = 128
): ImageSourcePropType {
  if (logoUrl) {
    return resolveContentImageSource(logoUrl);
  }
  return getTeamLogoSource(teamName, size);
}

