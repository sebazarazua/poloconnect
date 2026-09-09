import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { SUPPORT_EMAIL } from "@/constants/publicLegal";
import { AppColors, radius, useThemeColors } from "@/constants/theme";

const rules = [
  ["people-outline", "Respeto entre personas", "No se permite acoso, amenazas, discriminación ni insultos."],
  ["chatbubbles-outline", "Contenido responsable", "No publiques spam, estafas, información engañosa ni contenido sexual o violento."],
  ["person-circle-outline", "Identidad auténtica", "No suplantes a otra persona ni uses el perfil para engañar a la comunidad."],
  ["pricetag-outline", "Mercado seguro", "Las publicaciones deben ser claras, reales y propias. No se permiten fraudes, duplicados, datos engañosos, productos prohibidos ni contenido que vulnere derechos de terceros."],
  ["card-outline", "Pagos de publicaciones", "Si eliminás tu propia publicación, o si el equipo la elimina por incumplimiento o por una situación que lo amerite, el valor abonado por publicarla no será reembolsable. Cuando corresponda rechazar una publicación con devolución, la app informará el estado del reembolso."],
  ["shield-checkmark-outline", "Moderación", "Podemos ocultar, revisar, rechazar o eliminar contenido, advertir, suspender o cancelar cuentas. Polo Connect se reserva el derecho de eliminar publicaciones y no reembolsar el valor de publicación cuando la situación lo justifique." ]
] as const;

export default function CommunityGuidelinesScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Consulta sobre normas de comunidad")}`;

  return (
    <Screen eyebrow="Comunidad" title="Normas de la comunidad" subtitle="Queremos un espacio útil, seguro y respetuoso para todos." showBackButton onBackPress={() => router.back()}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rules.map(([icon, title, text]) => <View key={title} style={styles.rule}><View style={styles.icon}><Ionicons name={icon} size={20} color={colors.primaryDark} /></View><View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.text}>{text}</Text></View></View>)}
        <View style={styles.note}><Text style={styles.noteText}>Podés reportar un mensaje, publicación o usuario desde sus opciones. Los reportes se revisan de forma privada.</Text></View>
        <Pressable style={styles.contact} onPress={() => void Linking.openURL(mailto)}><Ionicons name="mail-outline" size={18} color="#ffffff" /><Text style={styles.contactText}>Contactar a soporte</Text></Pressable>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  content: { gap: 10, paddingBottom: 24 },
  rule: { flexDirection: "row", gap: 12, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: "900" },
  text: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  note: { borderRadius: 8, backgroundColor: colors.primarySoft, padding: 14, marginTop: 4 },
  noteText: { color: colors.primaryDark, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  contact: { minHeight: 46, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  contactText: { color: "#ffffff", fontWeight: "900", fontSize: 14 }
});
