import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppColors, useThemeColors } from "@/constants/theme";

export interface QuickAccessCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function QuickAccessCard({ title, subtitle, icon, onPress }: QuickAccessCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const isDark = colors.background !== "#ffffff";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={[styles.leftAccent, isDark && styles.leftAccentDark]} />
      <View style={styles.content}>
        <View style={[styles.iconWrap, isDark && styles.iconWrapDark]}>
          <Ionicons name={icon} size={30} color={isDark ? "#0a3d7a" : "#E8C97A"} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
        </View>

        <View style={[styles.arrowWrap, isDark && styles.arrowWrapDark]}>
          <Ionicons name="chevron-forward" size={18} color={isDark ? colors.primaryDark : colors.primary} />
        </View>
      </View>

      <View style={[styles.bottomLine, isDark && styles.bottomLineDark]} />
      <View style={[styles.bottomDot, isDark && styles.bottomDotDark]} />
    </Pressable>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    width: "48%",
    minHeight: 84,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    overflow: "hidden",
    shadowColor: "#0b1729",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  leftAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#E8C97A"
  },
  leftAccentDark: {
    backgroundColor: "#E8C97A"
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(232, 201, 122, 0.35)"
  },
  iconWrapDark: {
    backgroundColor: "#E8C97A",
    shadowColor: "#C9A84C",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  textBlock: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16
  },
  arrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  arrowWrapDark: {
    backgroundColor: "rgba(232, 201, 122, 0.08)"
  },
  bottomLine: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 10,
    height: 1,
    backgroundColor: "rgba(232, 201, 122, 0.55)"
  },
  bottomLineDark: {
    backgroundColor: "rgba(232, 201, 122, 0.45)"
  },
  bottomDot: {
    position: "absolute",
    left: 14,
    bottom: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E8C97A"
  },
  bottomDotDark: {
    backgroundColor: "#E8C97A"
  }
});
