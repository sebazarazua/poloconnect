import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import YoutubeIframe, { PLAYER_STATES, type YoutubeIframeRef } from "react-native-youtube-iframe";
import { AppColors, useThemeColors } from "@/constants/theme";
import { extractYouTubeVideoId } from "@/utils/youtube";

interface YouTubeLivePlayerProps {
  videoUrl?: string | null;
  style?: StyleProp<ViewStyle>;
}

// react-native-youtube-iframe loads its player from this hosted page by default (no baseUrlOverride used here).
const PLAYER_HOST_URL = "https://lonelycpp.github.io/react-native-youtube-iframe/iframe_v2.html";

/**
 * Allows the player's own iframe/subresource loads (isTopFrame === false) plus the initial
 * host-page load, but blocks every other top-level navigation so the WebView can never open
 * youtube.com, Safari, Chrome, or any external browser/app.
 */
function guardAgainstExternalNavigation(request: { url: string; isTopFrame: boolean }) {
  if (!request.isTopFrame) return true;
  return request.url === "about:blank" || request.url.startsWith(PLAYER_HOST_URL);
}

export function YouTubeLivePlayer({ videoUrl, style }: YouTubeLivePlayerProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const videoId = extractYouTubeVideoId(videoUrl);

  const [containerWidth, setContainerWidth] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erroredVideoId, setErroredVideoId] = useState<string | null>(null);
  const playerRef = useRef<YoutubeIframeRef | null>(null);

  useEffect(() => {
    setPlaying(false);
    setLoading(true);
    setErroredVideoId(null);
  }, [videoId]);

  // Pause playback whenever the app leaves the foreground (e.g. user backgrounds the app).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") setPlaying(false);
    });
    return () => {
      subscription.remove();
      setPlaying(false);
    };
  }, []);

  const onReady = useCallback(() => setLoading(false), []);

  const onError = useCallback(() => {
    setLoading(false);
    setPlaying(false);
    setErroredVideoId(videoId);
  }, [videoId]);

  const onChangeState = useCallback((state: PLAYER_STATES) => {
    if (state === PLAYER_STATES.PLAYING) setPlaying(true);
    if (state === PLAYER_STATES.PAUSED || state === PLAYER_STATES.ENDED) setPlaying(false);
  }, []);

  const hasError = !videoId || erroredVideoId === videoId;

  if (hasError) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <Text style={styles.messageText}>
          {videoId ? "No se pudo cargar el video." : "No hay un video disponible en este momento."}
        </Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    const embedSrc = `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0`;

    return (
      <View style={[styles.container, style]}>
        <iframe
          key={videoId}
          src={embedSrc}
          style={webIframeStyle as any}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          onLoad={onReady}
        />
        {loading ? (
          <View style={[styles.container, styles.centered, styles.overlay]}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {containerWidth > 0 ? (
        <YoutubeIframe
          ref={playerRef}
          key={videoId}
          height={containerWidth * (9 / 16)}
          width={containerWidth}
          videoId={videoId}
          play={playing}
          onReady={onReady}
          onError={onError}
          onChangeState={onChangeState}
          webViewStyle={styles.webview}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            // No autoplay hacks: YouTube's own policies decide whether the video starts muted/paused.
            mediaPlaybackRequiresUserAction: false,
            onShouldStartLoadWithRequest: guardAgainstExternalNavigation
          }}
          initialPlayerParams={{
            controls: true,
            rel: false,
            preventFullScreen: false
          }}
        />
      ) : null}
      {loading ? (
        <View style={[styles.container, styles.centered, styles.overlay]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
    </View>
  );
}

const webIframeStyle = { width: "100%", height: "100%", border: "none" };

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000000"
  },
  webview: {
    backgroundColor: "#000000"
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  centered: {
    alignItems: "center",
    justifyContent: "center"
  },
  messageText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20
  }
});
