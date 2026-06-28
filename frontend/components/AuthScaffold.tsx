import { PropsWithChildren } from "react";
import {
  Keyboard,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supportedLocales, useLocale } from "@/contexts/LocaleContext";

type AuthScaffoldProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footerText: string;
}>;

export function AuthScaffold({ children, title, subtitle, footerText }: AuthScaffoldProps) {
  const { locale, setLocale } = useLocale();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Math.max(insets.top - 6, 0)}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.localeRow}>
              {supportedLocales.map((option) => {
                const selected = option.code === locale;

                return (
                  <Pressable
                    key={option.code}
                    style={[styles.localeButton, selected && styles.localeButtonActive]}
                    onPress={() => setLocale(option.code)}
                    accessibilityRole="button"
                    accessibilityLabel={option.nativeLabel}
                  >
                    <Text style={[styles.localeText, selected && styles.localeTextActive]}>
                      {option.code.split("-")[0].toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.logoContainer}>
              <Image
                source={require("@/assets/logo-login.png")}
                style={styles.horizontalLogo}
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
  localeRow: {
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4
  },
  localeButton: {
    minWidth: 38,
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#244366",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  localeButtonActive: {
    backgroundColor: "#f2c46d",
    borderColor: "#f2c46d"
  },
  localeText: {
    color: "#92a6bf",
    fontSize: 11,
    fontWeight: "900"
  },
  localeTextActive: {
    color: "#071221"
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },
  horizontalLogo: {
    width: 200,
    height: 60
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