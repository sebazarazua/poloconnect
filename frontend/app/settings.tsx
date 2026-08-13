import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextStyle, View, ViewStyle } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, ThemeMode, radius, useTheme } from "@/constants/theme";
import { supportedLocales, useLocale, type Locale } from "@/contexts/LocaleContext";
import { getMySettings, updateMySettings, type NotificationPreferences, type UserSettings } from "@/services/api/settings";

const themeOptions: Array<{ labelKey: "settings.theme.light" | "settings.theme.dark"; value: ThemeMode; icon: keyof typeof Ionicons.glyphMap }> = [
  { labelKey: "settings.theme.light", value: "light", icon: "sunny-outline" },
  { labelKey: "settings.theme.dark", value: "dark", icon: "moon-outline" }
];

const notificationRows = [
  { key: "messages", labelKey: "settings.notification.messages", descriptionKey: "settings.notification.messagesText" },
  { key: "matches", labelKey: "settings.notification.matches", descriptionKey: "settings.notification.matchesText" },
  { key: "tournaments", labelKey: "settings.notification.tournaments", descriptionKey: "settings.notification.tournamentsText" },
  { key: "market", labelKey: "settings.notification.market", descriptionKey: "settings.notification.marketText" },
  { key: "community", labelKey: "settings.notification.community", descriptionKey: "settings.notification.communityText" },
  { key: "system", labelKey: "settings.notification.system", descriptionKey: "settings.notification.systemText" }
] as const;

type NotificationKey = keyof NotificationPreferences["app"];
type PushKey = keyof NotificationPreferences["push"];

const SHARED_PUSH_KEYS: PushKey[] = ["messages", "matches", "tournaments"];

const EMPTY_SETTINGS: UserSettings = {
  userId: "",
  locale: "es-AR",
  theme: "light",
  pushEnabled: true,
  emailEnabled: true,
  profileVisibility: "public",
  notificationPreferences: {
    app: {
      messages: true,
      matches: true,
      tournaments: true,
      market: true,
      system: true,
      community: true
    },
    push: {
      messages: true,
      matches: true,
      tournaments: true
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const styles = createStyles(colors);
  const isDark = mode === "dark";
  const [settings, setSettings] = useState<UserSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextSettings = await getMySettings();
        if (!cancelled) {
          setSettings(nextSettings);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistSettings = async (nextSettings: UserSettings) => {
    setSaving(true);
    try {
      const updated = await updateMySettings({
        theme: nextSettings.theme,
        pushEnabled: nextSettings.pushEnabled,
        emailEnabled: nextSettings.emailEnabled,
        locale: nextSettings.locale,
        profileVisibility: nextSettings.profileVisibility,
        notificationPreferences: nextSettings.notificationPreferences
      });
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  const updateLocale = (nextLocale: Locale) => {
    const nextSettings = { ...settings, locale: nextLocale };
    setLocale(nextLocale);
    setSettings(nextSettings);
    void persistSettings(nextSettings);
  };

  const updateAppPreference = (key: NotificationKey, value: boolean) => {
    const nextPush = { ...settings.notificationPreferences.push };

    if ((SHARED_PUSH_KEYS as string[]).includes(key)) {
      nextPush[key as PushKey] = value;
    }

    const nextSettings: UserSettings = {
      ...settings,
      pushEnabled: SHARED_PUSH_KEYS.some((pushKey) => nextPush[pushKey]),
      notificationPreferences: {
        ...settings.notificationPreferences,
        app: {
          ...settings.notificationPreferences.app,
          [key]: value
        },
        push: nextPush
      }
    };

    setSettings(nextSettings);
    void persistSettings(nextSettings);
  };

  return (
    <Screen
      eyebrow={t("settings.eyebrow")}
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
      showBackButton
      onBackPress={() => router.back()}
      headerRight={saving ? <ActivityIndicator size="small" color={colors.primary} /> : null}
    >
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t("settings.loading")}</Text>
        </View>
      ) : (
        <View style={styles.pageContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="color-palette-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>{t("settings.appearance")}</Text>
                <Text style={styles.sectionText}>{t("settings.appearanceText")}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(enabled) => {
                  const nextSettings = { ...settings, theme: enabled ? "dark" : "light" };
                  setMode(enabled ? "dark" : "light");
                  setSettings(nextSettings);
                  void persistSettings(nextSettings);
                }}
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
                    onPress={() => {
                      setMode(option.value);
                      void persistSettings({ ...settings, theme: option.value });
                    }}
                  >
                    <Ionicons name={option.icon} size={17} color={selected ? "#ffffff" : colors.primaryDark} />
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{t(option.labelKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="language-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
                <Text style={styles.sectionText}>{t("settings.languageText")}</Text>
              </View>
            </View>

            <View style={styles.segment}>
              {supportedLocales.map((option) => {
                const selected = locale === option.code;

                return (
                  <Pressable
                    key={option.code}
                    style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                    onPress={() => updateLocale(option.code)}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{option.nativeLabel}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.sectionTitle}>{t("settings.notificationsTitle")}</Text>
              <Text style={styles.sectionText}>{t("settings.notificationsText")}</Text>
            </View>

            <View style={styles.notificationGroup}>
              {notificationRows.map((row) => (
                <ToggleRow
                  key={row.key}
                  colors={colors}
                  title={t(row.labelKey)}
                  subtitle={t(row.descriptionKey)}
                  value={settings.notificationPreferences.app[row.key]}
                  onValueChange={(value) => updateAppPreference(row.key, value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("settings.systemData")}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("settings.language")}</Text>
              <Text style={styles.infoValue}>{supportedLocales.find((option) => option.code === locale)?.nativeLabel}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("common.notifications")}</Text>
              <Text style={styles.infoValue}>{settings.pushEnabled ? t("common.enabled") : t("common.disabled")}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("common.privacy")}</Text>
              <Text style={styles.infoValue}>{t("settings.profileVisible")}</Text>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

function ToggleRow({
  colors,
  title,
  subtitle,
  value,
  onValueChange
}: {
  colors: AppColors;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const styles = toggleStyles(colors);

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} thumbColor="#ffffff" trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
  );
}

const toggleStyles = (colors: AppColors) => StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14
  },
  toggleCopy: {
    flex: 1
  },
  toggleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  toggleSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  }
} satisfies Record<string, ViewStyle | TextStyle>);

const createStyles = (colors: AppColors) => StyleSheet.create({
  pageContent: {
    paddingBottom: 12
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    gap: 12
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
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
  notificationsHeader: {
    gap: 3
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
  notificationGroup: {
    gap: 10
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