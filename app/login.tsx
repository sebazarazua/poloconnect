import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isSubmitting } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Completá usuario o mail y contraseña.");
      return;
    }

    setError("");

    try {
      await signIn({ identifier, password });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#071221" />
      <AuthScaffold
        title="Bienvenido"
        subtitle="Iniciá sesión o creá tu cuenta para seguir torneos, favoritos y ventas. Tocá cualquier opción para entrar a la app."
        footerText="Al continuar aceptás una experiencia demo con la misma onda visual de la app."
      >
        <View style={styles.formBlock}>
          <FieldLabel label="Usuario o mail" />
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Tu usuario o mail"
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          <FieldLabel label="Contraseña" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Tu contraseña"
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Iniciar sesion</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/register")}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>O continuar con</Text>
            <View style={styles.dividerLine} />
          </View>

          <SocialButton label="Google" icon="logo-google" />
          <SocialButton label="Apple" icon="logo-apple" />

          <Link href="/register" style={styles.inlineLink}>
            ¿No tenés cuenta? Crear una ahora
          </Link>
        </View>
      </AuthScaffold>
    </>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.label}>{label}</Text>;
}

function SocialButton({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable style={styles.socialButton}>
      <Ionicons name={icon} size={18} color="#ffffff" />
      <Text style={styles.socialButtonText}>{label}</Text>
    </Pressable>
  );
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
  errorText: {
    color: "#ff7b7b",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2
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
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 4
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1a314d"
  },
  dividerLabel: {
    color: "#6c7c96",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3
  },
  socialButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1b3553",
    backgroundColor: "#111d31",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10
  },
  socialButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  inlineLink: {
    color: "#7db5ff",
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700"
  }
});