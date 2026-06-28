import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AuthScaffold } from "@/components/AuthScaffold";
import { useAuth } from "@/contexts/AuthContext";
import { confirmPasswordReset, requestPasswordReset } from "@/services/api/auth";
import { useLocale } from "@/contexts/LocaleContext";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const { t } = useLocale();
  const params = useLocalSearchParams<{ email?: string | string[]; mode?: string | string[]; stage?: string | string[] }>();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;
  const stageParam = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const isInAppFlow = modeParam === "in-app";

  const [email, setEmail] = useState((emailParam ?? "").trim().toLowerCase());
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<"request" | "confirm">(stageParam === "confirm" ? "confirm" : "request");
  const [message, setMessage] = useState(stageParam === "confirm" ? t("auth.reset.requested") : "");
  const [error, setError] = useState("");

  const handleBack = () => {
    router.replace(isInAppFlow ? "/profile" : "/login");
  };

  const handleRequestCode = async () => {
    if (!email.trim()) {
      setError(t("auth.reset.required"));
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setStage("confirm");
      setMessage(t("auth.reset.requested"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("auth.reset.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!email.trim() || !code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError(t("auth.reset.required"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.reset.mismatch"));
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const authUser = await confirmPasswordReset({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword
      });
      setMessage(t("auth.reset.updated"));
      if (authUser) {
        updateUser(authUser);
        router.replace("/(tabs)");
        return;
      }

      router.replace(isInAppFlow ? "/profile" : "/login");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : t("auth.reset.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#071221" />
      <AuthScaffold title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")} footerText={t("auth.login.footer")}> 
        <View style={styles.formBlock}>
          <FieldLabel label={t("auth.reset.email")} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!isInAppFlow}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t("auth.reset.emailPlaceholder")}
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          {stage === "confirm" ? (
            <>
              <FieldLabel label={t("auth.reset.code")} />
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder={t("auth.reset.codePlaceholder")}
                placeholderTextColor="#60728c"
                style={styles.input}
              />

              <FieldLabel label={t("auth.reset.newPassword")} />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder={t("auth.reset.newPassword")}
                placeholderTextColor="#60728c"
                style={styles.input}
              />

              <FieldLabel label={t("auth.reset.confirmPassword")} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder={t("auth.reset.confirmPassword")}
                placeholderTextColor="#60728c"
                style={styles.input}
              />

              <Pressable style={styles.secondaryButton} onPress={handleRequestCode} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.secondaryButtonText}>{t("auth.reset.resendCode")}</Text>}
              </Pressable>

              <Pressable style={styles.primaryButton} onPress={handleConfirmReset} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{t("auth.reset.submit")}</Text>}
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleRequestCode} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{t("auth.reset.requestCode")}</Text>}
            </Pressable>
          )}

          {message ? <Text style={styles.successText}>{message}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.secondaryButton} onPress={handleBack} disabled={isSubmitting}>
            <Text style={styles.secondaryButtonText}>{t(isInAppFlow ? "auth.reset.backToProfile" : "auth.reset.backToLogin")}</Text>
          </Pressable>
        </View>
      </AuthScaffold>
    </>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.label}>{label}</Text>;
}

const styles = StyleSheet.create({
  formBlock: {
    gap: 10
  },
  label: {
    color: "#6d81a0",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 2
  },
  input: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1b3553",
    backgroundColor: "#0d182b",
    paddingHorizontal: 16,
    color: "#eaf2ff",
    fontSize: 16,
    marginBottom: 6
  },
  primaryButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2f7dd4",
    borderWidth: 1,
    borderColor: "#4998f0",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  secondaryButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#193453",
    backgroundColor: "#0b1325",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: "#f4f7fd",
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  errorText: {
    color: "#ff7b7b",
    fontSize: 13,
    lineHeight: 18
  },
  successText: {
    color: "#88e5a0",
    fontSize: 13,
    lineHeight: 18
  }
});