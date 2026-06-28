import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AuthScaffold } from "@/components/AuthScaffold";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
};

const initialForm: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  phone: ""
};

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isSubmitting } = useAuth();
  const { t } = useLocale();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const updateField = (field: keyof RegisterForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const handleRegister = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.username.trim() ||
      !form.password.trim()
    ) {
      setError(t("auth.register.required"));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }

    setError("");

    try {
      await signUp({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        username: form.username,
        password: form.password,
        phone: form.phone
      });
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : t("auth.register.error"));
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#071221" />
      <AuthScaffold
        title={t("auth.register.title")}
        subtitle={t("auth.register.subtitle")}
        footerText={t("auth.register.footer")}
      >
        <View style={styles.formBlock}>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <FieldLabel label={t("auth.register.firstName")} />
              <TextInput
                value={form.firstName}
                onChangeText={(value) => updateField("firstName", value)}
                placeholder={t("auth.register.firstName")}
                placeholderTextColor="#60728c"
                style={styles.input}
              />
            </View>

            <View style={styles.halfField}>
              <FieldLabel label={t("auth.register.lastName")} />
              <TextInput
                value={form.lastName}
                onChangeText={(value) => updateField("lastName", value)}
                placeholder={t("auth.register.lastName")}
                placeholderTextColor="#60728c"
                style={styles.input}
              />
            </View>
          </View>

          <FieldLabel label={t("common.email")} />
          <TextInput
            value={form.email}
            onChangeText={(value) => updateField("email", value)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t("auth.register.emailPlaceholder")}
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          <FieldLabel label={t("auth.register.username")} />
          <TextInput
            value={form.username}
            onChangeText={(value) => updateField("username", value)}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("auth.register.usernamePlaceholder")}
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FieldLabel label={t("auth.login.password")} />
              <TextInput
                value={form.password}
                onChangeText={(value) => updateField("password", value)}
                secureTextEntry
                placeholder={t("auth.register.createPassword")}
                placeholderTextColor="#60728c"
                style={styles.input}
              />
            </View>

            <View style={styles.halfField}>
              <FieldLabel label={t("auth.register.confirm")} />
              <TextInput
                value={form.confirmPassword}
                onChangeText={(value) => updateField("confirmPassword", value)}
                secureTextEntry
                placeholder={t("auth.register.confirmPlaceholder")}
                placeholderTextColor="#60728c"
                style={styles.input}
              />
            </View>
          </View>

          <FieldLabel label={t("common.phone")} />
          <TextInput
            value={form.phone}
            onChangeText={(value) => updateField("phone", value)}
            keyboardType="phone-pad"
            placeholder={t("auth.register.phonePlaceholder")}
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t("auth.register.submit")}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/login")}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>{t("auth.register.hasAccount")}</Text>
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
  row: {
    flexDirection: "row",
    gap: 10
  },
  halfField: {
    flex: 1
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
    marginTop: 4
  },
  errorText: {
    color: "#ff7b7b",
    fontSize: 13,
    lineHeight: 18
  },
  primaryButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2f7dd4",
    borderWidth: 1,
    borderColor: "#4998f0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4
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
  }
});