import { PropsWithChildren } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radius } from "@/constants/theme";

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 14
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800"
  },
  action: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700"
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  }
});
