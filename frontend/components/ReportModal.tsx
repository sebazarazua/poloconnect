import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppColors, radius, useThemeColors } from "@/constants/theme";
import { createReport, type ReportContentType, type ReportReason } from "@/services/api/moderation";

const reasons: Array<{ value: ReportReason; label: string }> = [
  { value: "inappropriate", label: "Contenido inapropiado" },
  { value: "harassment", label: "Acoso o hostigamiento" },
  { value: "spam", label: "Spam" },
  { value: "scam", label: "Estafa o fraude" },
  { value: "false_information", label: "Información falsa" },
  { value: "sexual_content", label: "Contenido sexual" },
  { value: "violence", label: "Violencia" },
  { value: "hate_speech", label: "Discurso de odio" },
  { value: "impersonation", label: "Suplantación de identidad" },
  { value: "rights_violation", label: "Derechos de terceros" },
  { value: "other", label: "Otro" }
];

export type ReportTarget = {
  contentType: ReportContentType;
  contentId?: string;
  reportedUserId?: string;
  context?: Record<string, unknown>;
};

export function ReportModal({ visible, target, onClose }: { visible: boolean; target: ReportTarget | null; onClose: () => void }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [reason, setReason] = useState<ReportReason>("inappropriate");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    if (submitting) return;
    setReason("inappropriate");
    setDescription("");
    onClose();
  };

  const submit = async () => {
    if (!target) return;
    if (reason === "other" && !description.trim()) {
      Alert.alert("Contanos brevemente qué ocurrió.");
      return;
    }
    setSubmitting(true);
    try {
      await createReport({ ...target, reason, description: description.trim() || undefined });
      close();
      Alert.alert("Reporte enviado", "Gracias. Nuestro equipo va a revisarlo.");
    } catch (error) {
      Alert.alert("No se pudo enviar el reporte", error instanceof Error ? error.message : "Intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Reportar</Text>
              <Text style={styles.subtitle}>Elegí el motivo para que podamos revisarlo.</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar" onPress={close} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {reasons.map((item) => (
              <Pressable key={item.value} onPress={() => setReason(item.value)} style={[styles.reason, reason === item.value && styles.reasonSelected]}>
                <View style={[styles.radio, reason === item.value && styles.radioSelected]}>{reason === item.value ? <View style={styles.radioDot} /> : null}</View>
                <Text style={styles.reasonText}>{item.label}</Text>
              </Pressable>
            ))}
            {reason === "other" ? <TextInput value={description} onChangeText={setDescription} placeholder="Describí brevemente el problema" placeholderTextColor={colors.muted} multiline maxLength={1500} style={styles.description} /> : null}
          </ScrollView>
          <Pressable disabled={submitting} onPress={() => void submit()} style={[styles.submit, submitting && styles.submitDisabled]}>
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>Enviar reporte</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" },
  sheet: { maxHeight: "84%", backgroundColor: colors.background, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: 20, gap: 14 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  closeButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.surfaceStrong },
  body: { gap: 8, paddingVertical: 2 },
  reason: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 8, paddingHorizontal: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  reasonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.muted, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  reasonText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  description: { minHeight: 90, textAlignVertical: "top", borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, padding: 12, fontSize: 14 },
  submit: { minHeight: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "900" }
});
