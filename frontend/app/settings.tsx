import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, ThemeMode, radius, useTheme } from "@/constants/theme";

const themeOptions: Array<{ label: string; value: ThemeMode; icon: keyof typeof Ionicons.glyphMap }> = [
  { label: "Claro", value: "light", icon: "sunny-outline" },
  { label: "Oscuro", value: "dark", icon: "moon-outline" }
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const styles = createStyles(colors);
  const isDark = mode === "dark";

  return (
    <Screen
      eyebrow="Cuenta"
      title="Configuración"
      subtitle="Ajustá preferencias generales de la aplicación."
      showBackButton
      onBackPress={() => router.back()}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primaryDark} />
          </View>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Apariencia</Text>
            <Text style={styles.sectionText}>Elegí cómo querés ver Polo Connect.</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(enabled) => setMode(enabled ? "dark" : "light")}
            thumbColor="#ffffff"
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.segment}>
          {themeOptions.map((option) => {
            const selected = mode === option.value;

            return (
              <Pressable
                key={option.value}
                style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                onPress={() => setMode(option.value)}
              >
                <Ionicons
                  name={option.icon}
                  size={17}
                  color={selected ? "#ffffff" : colors.primaryDark}
                />
                <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos de relleno</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Idioma</Text>
          <Text style={styles.infoValue}>Español Argentina</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Notificaciones</Text>
          <Text style={styles.infoValue}>Activadas</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Privacidad</Text>
          <Text style={styles.infoValue}>Perfil visible</Text>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 14,
    gap: 14
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionCopy: {
    flex: 1
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  sectionText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3
  },
  segment: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 4
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  segmentButtonActive: {
    backgroundColor: colors.primary
  },
  segmentText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: "#ffffff"
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right"
  },
  divider: {
    height: 1,
    backgroundColor: colors.border
  }
});
