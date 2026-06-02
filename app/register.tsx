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
      setError("Completá los datos obligatorios para crear la cuenta.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
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
      setError(registerError instanceof Error ? registerError.message : "No se pudo crear la cuenta.");
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#071221" />
      <AuthScaffold
        title="Crear cuenta"
        subtitle="Completá tus datos para sumar tu perfil a Polo Connect y entrar a la app en un solo paso."
        footerText="Al crear tu cuenta aceptás una experiencia demo con la misma estética del acceso."
      >
        <View style={styles.formBlock}>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <FieldLabel label="Nombre" />
              <TextInput
                value={form.firstName}
                onChangeText={(value) => updateField("firstName", value)}
                placeholder="Nombre"
                placeholderTextColor="#60728c"
                style={styles.input}
              />
            </View>

            <View style={styles.halfField}>
              <FieldLabel label="Apellido" />
              <TextInput
                value={form.lastName}
                onChangeText={(value) => updateField("lastName", value)}
                placeholder="Apellido"
                placeholderTextColor="#60728c"
                style={styles.input}
              />
            </View>
          </View>

          <FieldLabel label="Mail" />
          <TextInput
            value={form.email}
            onChangeText={(value) => updateField("email", value)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Tu mail"
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          <FieldLabel label="Nombre de usuario" />
          <TextInput
            value={form.username}
            onChangeText={(value) => updateField("username", value)}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Elegí un usuario"
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FieldLabel label="Contraseña" />
              <TextInput
                value={form.password}
                onChangeText={(value) => updateField("password", value)}
                secureTextEntry
                placeholder="Crear contraseña"
                placeholderTextColor="#60728c"
                style={styles.input}
              />
            </View>

            <View style={styles.halfField}>
              <FieldLabel label="Confirmar" />
              <TextInput
                value={form.confirmPassword}
                onChangeText={(value) => updateField("confirmPassword", value)}
                secureTextEntry
                placeholder="Repetir contraseña"
                placeholderTextColor="#60728c"
                style={styles.input}
              />
            </View>
          </View>

          <FieldLabel label="Telefono" />
          <TextInput
            value={form.phone}
            onChangeText={(value) => updateField("phone", value)}
            keyboardType="phone-pad"
            placeholder="Opcional para contacto"
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Crear cuenta</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/login")}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
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