import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { exchangeCodeAsync, getDefaultReturnUrl, ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  View
} from "react-native";
import { AuthScaffold } from "@/components/AuthScaffold";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

WebBrowser.maybeCompleteAuthSession();

// Google's "iOS"/"Android" OAuth client types only accept the reversed client-id
// scheme as redirect URI (they don't expose a configurable "authorized redirect URIs" field).
function getGoogleNativeRedirectUri(clientId?: string) {
  if (!clientId) return undefined;
  const suffix = ".apps.googleusercontent.com";
  const prefix = clientId.endsWith(suffix) ? clientId.slice(0, -suffix.length) : clientId;
  return `com.googleusercontent.apps.${prefix}:/oauthredirect`;
}

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithApple, signInWithGoogle, isSubmitting } = useAuth();
  const { t } = useLocale();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);
  const handledGoogleResponseRef = useRef<string | null>(null);
  const googleProcessingRef = useRef(false);

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const isExpoGo = Constants.appOwnership === "expo";
  const expoProxyProject = Constants.expoConfig?.originalFullName ?? "@anonymous/polo-connect";
  const expoProxyRedirectUri = `https://auth.expo.io/${expoProxyProject}`;
  const expoProxyReturnUri = getDefaultReturnUrl();
  const googleIosClientIdForAuth = isExpoGo ? undefined : googleIosClientId;
  const googleAndroidClientIdForAuth = isExpoGo ? undefined : googleAndroidClientId;
  const googleClientIdForPlatform = Platform.select({
    ios: googleIosClientId,
    android: googleAndroidClientId,
    default: googleWebClientId
  });
  const googleEffectiveClientId = isExpoGo ? googleWebClientId : googleClientIdForPlatform;
  const hasGoogleConfig = Boolean(googleEffectiveClientId);

  // Google's iOS/Android OAuth client types only accept Authorization Code + PKCE and
  // redirect to the reversed client-id scheme; response_type=token is rejected with
  // "Error 400: unsupported_response_type" on those client types (confirmed on TestFlight).
  const isNativeStandalone = Platform.OS !== "web" && !isExpoGo;
  const googleResponseType = isNativeStandalone ? ResponseType.Code : ResponseType.Token;
  const googleNativeClientId = Platform.select({
    ios: googleIosClientId,
    android: googleAndroidClientId,
    default: undefined
  });
  const googleNativeRedirectUri = isNativeStandalone ? getGoogleNativeRedirectUri(googleNativeClientId) : undefined;

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    clientId: googleEffectiveClientId ?? "missing-google-client-id",
    iosClientId: googleIosClientIdForAuth,
    androidClientId: googleAndroidClientIdForAuth,
    webClientId: googleWebClientId,
    redirectUri: isExpoGo ? expoProxyRedirectUri : googleNativeRedirectUri,
    responseType: googleResponseType,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    shouldAutoExchangeCode: false
  });

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (!googleResponse) {
      return;
    }

    if (googleResponse.type === "cancel" || googleResponse.type === "dismiss") {
      console.log("auth/google/cancelled");
      return;
    }

    if (googleResponse.type === "error") {
      console.log("auth/google/error");
      setError(t("auth.oauth.error"));
      return;
    }

    if (googleResponse.type !== "success") {
      return;
    }

    const responseKey = googleResponse.url ?? `${googleResponse.type}:${googleResponse.params?.state ?? ""}`;
    if (handledGoogleResponseRef.current === responseKey || googleProcessingRef.current) {
      return;
    }
    handledGoogleResponseRef.current = responseKey;

    const completeGoogleLogin = async () => {
      googleProcessingRef.current = true;
      setIsGoogleProcessing(true);

      try {
        let accessToken =
          googleResponse.authentication?.accessToken ??
          ((googleResponse as { params?: Record<string, string> }).params?.access_token ?? null);

        if (googleResponseType === ResponseType.Code) {
          const authorizationCode = googleResponse.params?.code;
          if (!authorizationCode) {
            console.log("auth/google/error");
            throw new Error(t("auth.oauth.error"));
          }

          if (!googleRequest?.clientId || !googleRequest.redirectUri || !googleRequest.codeVerifier) {
            console.log("auth/google/error");
            throw new Error(t("auth.oauth.googleMissingConfig"));
          }

          console.log("auth/google/authorization-success");
          console.log("auth/google/code-exchange-start");
          const tokenResponse = await exchangeCodeAsync(
            {
              clientId: googleRequest.clientId,
              code: authorizationCode,
              redirectUri: googleRequest.redirectUri,
              scopes: ["openid", "profile", "email"],
              extraParams: {
                code_verifier: googleRequest.codeVerifier
              }
            },
            Google.discovery
          );
          console.log("auth/google/code-exchange-success");
          accessToken = tokenResponse.accessToken;
        }

        if (!accessToken) {
          console.log("auth/google/error");
          throw new Error(t("auth.oauth.error"));
        }

        setError("");
        await signInWithGoogle({ accessToken });
        console.log("auth/google/backend-login-success");
      } catch (loginError) {
        console.log("auth/google/error");
        setError(t("auth.oauth.error"));
        handledGoogleResponseRef.current = null;
      } finally {
        googleProcessingRef.current = false;
        setIsGoogleProcessing(false);
      }
    };

    void completeGoogleLogin();
  }, [googleRequest, googleResponse, googleResponseType, signInWithGoogle, t]);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError(t("auth.login.required"));
      return;
    }

    setError("");

    try {
      await signIn({ identifier, password });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t("auth.login.error"));
    }
  };

  const handleGoogleLogin = async () => {
    setError("");

    if (isGoogleProcessing || googleProcessingRef.current) {
      return;
    }

    if (!hasGoogleConfig || !googleRequest) {
      setError(t("auth.oauth.googleMissingConfig"));
      return;
    }

    try {
      console.log("auth/google/start");
      if (isExpoGo && googleRequest.url) {
        const proxyStartUrl = `${expoProxyRedirectUri}/start?authUrl=${encodeURIComponent(googleRequest.url)}&returnUrl=${encodeURIComponent(expoProxyReturnUri)}`;
        await promptGoogle({ url: proxyStartUrl });
      } else {
        await promptGoogle();
      }
    } catch (googleError) {
      setError(t("auth.oauth.error"));
    }
  };

  const handleAppleLogin = async () => {
    setError("");

    if (!appleAvailable) {
      setError(t("auth.oauth.appleUnavailable"));
      return;
    }

    try {
      const response = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL]
      });

      if (!response.identityToken) {
        throw new Error(t("auth.oauth.error"));
      }

      await signInWithApple({
        identityToken: response.identityToken,
        email: response.email ?? undefined,
        firstName: response.fullName?.givenName ?? undefined,
        lastName: response.fullName?.familyName ?? undefined
      });
    } catch (appleError) {
      if (appleError instanceof Error && (appleError as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        setError(appleError.message);
      }
    }
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#071221" />
      <AuthScaffold
        title={t("auth.login.title")}
        subtitle={t("auth.login.subtitle")}
        footerText={t("auth.login.footer")}
      >
        <View style={styles.formBlock}>
          <FieldLabel label={t("auth.login.identifier")} />
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("auth.login.identifierPlaceholder")}
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          <FieldLabel label={t("auth.login.password")} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t("auth.login.passwordPlaceholder")}
            placeholderTextColor="#60728c"
            style={styles.input}
          />

          <Pressable style={styles.forgotLink} onPress={() => router.push("/forgot-password")}>
            <Text style={styles.forgotLinkText}>{t("auth.login.forgotPassword")}</Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t("auth.login.submit")}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/register")}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>{t("auth.login.createAccount")}</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>{t("auth.login.orContinue")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <SocialButton
            label={t("auth.login.google")}
            icon="logo-google"
            onPress={handleGoogleLogin}
            disabled={isSubmitting || isGoogleProcessing || !hasGoogleConfig}
          />

          {Platform.OS === "ios" ? (
            <SocialButton
              label={t("auth.login.apple")}
              icon="logo-apple"
              onPress={handleAppleLogin}
              disabled={isSubmitting}
            />
          ) : null}

          <Link href="/register" style={styles.inlineLink}>
            {t("auth.login.inlineRegister")}
          </Link>
        </View>
      </AuthScaffold>
    </>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.label}>{label}</Text>;
}

function SocialButton({
  label,
  icon,
  onPress,
  disabled
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.socialButton, disabled ? styles.socialButtonDisabled : null]} onPress={onPress} disabled={disabled}>
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
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -2,
    marginBottom: 2
  },
  forgotLinkText: {
    color: "#7db5ff",
    fontSize: 12,
    fontWeight: "800"
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
  socialButtonDisabled: {
    opacity: 0.7
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
