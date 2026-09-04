import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { PropsWithChildren, useMemo } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppColors, useThemeColors } from "@/constants/theme";
import { PUBLIC_LEGAL_ROUTES, PUBLIC_WEB_SUPPORT_EMAIL } from "@/constants/publicLegal";

type PublicLegalPageProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
}>;

export function PublicLegalPage({ eyebrow, title, subtitle, children }: PublicLegalPageProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, width), [colors, width]);
  const router = useRouter();

  const navigate = (href: string) => {
    router.push(href as Href);
  };

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Image source={require("@/assets/logo.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.nav}>
            <Pressable style={styles.navLink} onPress={() => navigate(PUBLIC_LEGAL_ROUTES.support)}>
              <Text style={styles.navLinkText}>Soporte</Text>
            </Pressable>
            <Pressable style={styles.navLink} onPress={() => navigate(PUBLIC_LEGAL_ROUTES.privacy)}>
              <Text style={styles.navLinkText}>Privacidad</Text>
            </Pressable>
            <Pressable style={styles.navLink} onPress={() => navigate(PUBLIC_LEGAL_ROUTES.dataDeletion)}>
              <Text style={styles.navLinkText}>Eliminación de datos</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.content}>
          {children}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Polo Connect</Text>
          <Pressable onPress={() => Linking.openURL(`mailto:${PUBLIC_WEB_SUPPORT_EMAIL}`).catch(() => undefined)}>
            <Text style={styles.footerLink}>{PUBLIC_WEB_SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function PublicSection({ title, children }: PropsWithChildren<{ title: string }>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createSectionStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function PublicParagraph({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  const styles = useMemo(() => createSectionStyles(colors), [colors]);

  return <Text style={styles.paragraph}>{children}</Text>;
}

export function PublicBullet({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  const styles = useMemo(() => createSectionStyles(colors), [colors]);

  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.paragraph}>{children}</Text>
    </View>
  );
}

export function PublicInlineLink({ label, href }: { label: string; href: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createSectionStyles(colors), [colors]);

  return (
    <Pressable onPress={() => Linking.openURL(href).catch(() => undefined)}>
      <Text style={styles.inlineLink}>{label}</Text>
    </Pressable>
  );
}

export function PublicRouteLink({ label, href }: { label: string; href: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createSectionStyles(colors), [colors]);
  const router = useRouter();

  return (
    <Pressable style={styles.routeLink} onPress={() => router.push(href as Href)}>
      <Text style={styles.routeLinkText}>{label}</Text>
      <Ionicons name="arrow-forward" size={15} color="#ffffff" />
    </Pressable>
  );
}

const createStyles = (colors: AppColors, width: number) => {
  const isCompact = width < 720;

  return StyleSheet.create({
    page: {
      flex: 1,
      minHeight: "100%" as never,
      backgroundColor: colors.background
    },
    shell: {
      width: "100%",
      maxWidth: 960,
      alignSelf: "center",
      paddingHorizontal: isCompact ? 20 : 32,
      paddingVertical: isCompact ? 20 : 28
    },
    topBar: {
      flexDirection: isCompact ? "column" : "row",
      alignItems: isCompact ? "flex-start" : "center",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: isCompact ? 28 : 40
    },
    brand: {
      flexDirection: "row",
      alignItems: "center"
    },
    logo: {
      width: 172,
      height: 54
    },
    nav: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    navLink: {
      minHeight: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: "center",
      paddingHorizontal: 12
    },
    navLinkText: {
      color: colors.primaryDark,
      fontSize: 12,
      fontWeight: "800"
    },
    hero: {
      maxWidth: 720,
      gap: 10,
      marginBottom: 24
    },
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7
    },
    eyebrow: {
      color: colors.primaryDark,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0
    },
    title: {
      color: colors.text,
      fontSize: isCompact ? 34 : 46,
      lineHeight: isCompact ? 40 : 52,
      fontWeight: "900"
    },
    subtitle: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "600"
    },
    content: {
      gap: 14
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 30,
      paddingTop: 18,
      flexDirection: isCompact ? "column" : "row",
      justifyContent: "space-between",
      gap: 8
    },
    footerText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    footerLink: {
      color: colors.primaryDark,
      fontSize: 12,
      fontWeight: "900"
    }
  });
};

const createSectionStyles = (colors: AppColors) => StyleSheet.create({
  section: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 10
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  sectionBody: {
    gap: 9
  },
  paragraph: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600"
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8
  },
  inlineLink: {
    color: colors.primaryDark,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "900",
    textDecorationLine: "underline"
  },
  routeLink: {
    alignSelf: "flex-start",
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 2
  },
  routeLinkText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  }
});
