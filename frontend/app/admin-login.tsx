import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { AppColors, useThemeColors } from "@/constants/theme";

export default function AdminLoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { t } = useLocale();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen eyebrow="Admin" title={t("adminLogin.title")} subtitle={t("adminLogin.subtitle")} showBackButton onBackPress={() => router.back()}>
      {Platform.OS !== "web" ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{t("adminLogin.webOnly")}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <TextInput style={styles.input} value={identifier} onChangeText={setIdentifier} placeholder={t("adminLogin.identifier")} placeholderTextColor={colors.muted} autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={t("auth.login.password")} placeholderTextColor={colors.muted} secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.button}
          onPress={async () => {
            setError(null);
            try {
              await signIn({ identifier, password });
              router.replace("/admin-panel");
            } catch (e) {
              setError(e instanceof Error ? e.message : t("auth.login.error"));
            }
          }}
        >
          <Text style={styles.buttonText}>{t("adminLogin.submit")}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    infoCard: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 12
    },
    infoText: {
      color: colors.muted,
      fontWeight: "700"
    },
    formCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10
    },
    input: {
      minHeight: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      color: colors.text
    },
    error: {
      color: colors.danger,
      fontWeight: "700"
    },
    button: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center"
    },
    buttonText: {
      color: "#fff",
      fontWeight: "800"
    }
  });
