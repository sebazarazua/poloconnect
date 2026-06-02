import { PropsWithChildren } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthScaffoldProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footerText: string;
}>;

export function AuthScaffold({ children, title, subtitle, footerText }: AuthScaffoldProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Image
                  source={require("@/assets/logo.png")}
                  style={styles.logoBadgeImage}
                  resizeMode="contain"
                />
              </View>

              <Image
                source={require("@/assets/logo.png")}
                style={styles.wordmark}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {children}

            <Text style={styles.footerText}>{footerText}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#071221"
  },
  keyboardArea: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 20
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#16314f",
    backgroundColor: "#0a1426",
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    shadowColor: "#020814",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 16
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    gap: 14
  },
  logoBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: "#1c78d8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#08101d"
  },
  logoBadgeImage: {
    width: 42,
    height: 42
  },
  wordmark: {
    width: 150,
    height: 44
  },
  title: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  subtitle: {
    color: "#92a6bf",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 24,
    paddingHorizontal: 6
  },
  footerText: {
    color: "#6f8098",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 10
  }
});