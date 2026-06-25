/**
 * Logos locales de equipos de polo.
 *
 * Para agregar una imagen real:
 *  1. Colocá el archivo PNG en assets/teams/ (ver README.md de esa carpeta)
 *  2. Descomentá la línea correspondiente abajo
 *  3. Listo — se usa la imagen local; si no está, se genera un avatar automático
 */
import type { ImageSourcePropType } from "react-native";
import { getTeamLogoUrl } from "@/services/matches";

const LOCAL_LOGOS: Partial<Record<string, ImageSourcePropType>> = {
  "La Dolfina":       require("../assets/teams/la-dolfina.png"),
  "Ellerstina":       require("../assets/teams/ellerstina.png"),
  // "Coronel Suarez":   require("../assets/teams/coronel-suarez.png"),
  // "Indios Chapaleufu":require("../assets/teams/indios-chapaleufu.png"),
  // "Monterrico":       require("../assets/teams/monterrico.png"),
  // "Las Acacias":      require("../assets/teams/las-acacias.png"),
  // "Santa Maria":      require("../assets/teams/santa-maria.png"),
  // "Sancaleta":        require("../assets/teams/sancaleta.png"),
  // "Palermo":          require("../assets/teams/palermo.png"),
  // "Pilar":            require("../assets/teams/pilar.png"),
  // "Chapaleufu":       require("../assets/teams/chapaleufu.png"),
  // "Flores":           require("../assets/teams/flores.png"),
  // "Zona Norte":       require("../assets/teams/zona-norte.png"),
  // "La Herminia":      require("../assets/teams/la-herminia.png"),
};

/**
 * Devuelve la fuente de imagen para el logo de un equipo.
 * Usa imagen local si existe, o genera un avatar por URL como fallback.
 */
export function getTeamLogoSource(
  teamName: string,
  size = 128
): ImageSourcePropType {
  return LOCAL_LOGOS[teamName] ?? { uri: getTeamLogoUrl(teamName, size) };
}
