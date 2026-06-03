import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SectionTitle } from "@/components/Card";
import { AdCarousel } from "@/components/AdCarousel";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";
import { getTeamLogoSource } from "@/constants/teamLogos";
import { formatHomeEyebrow } from "@/constants/i18n";
import { useLocale } from "@/contexts/LocaleContext";
import { getTeamLogoUrl } from "@/services/matches";

const screenHorizontalPadding = 40;
const featuredMatchBackground = require("../../assets/home-match-bg.png");

const ads = [
  require("../../assets/ads/home/hero-1.png"),
  require("../../assets/ads/home/hero-2.png"),
  require("../../assets/ads/home/hero-3.png")
];

const compactAds = [
  require("../../assets/ads/home/compact-1.png"),
  require("../../assets/ads/home/compact-2.png"),
  require("../../assets/ads/home/compact-3.png")
];

export default function HomeScreen() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const carouselRef = useRef<ScrollView>(null);
  const [activeAd, setActiveAd] = useState(0);
  const { width } = useWindowDimensions();
  const bannerWidth = Math.max(width - screenHorizontalPadding, 280);

  const quickAccessItems = [
    { key: "calendar", label: t("home.calendar"), icon: "calendar-outline", route: "/(tabs)/tournaments" },
    { key: "team-register", label: t("home.teamRegister"), icon: "person-add-outline", route: "/team-register" },
    { key: "broadcast", label: t("home.broadcast"), icon: "play-circle-outline", route: "/broadcast" },
    { key: "news", label: t("home.news"), icon: "newspaper-outline" }
  ] as const;

  const handleQuickAccessPress = (key: string) => {
    if (key === "calendar") {
      router.push("/(tabs)/tournaments");
    } else if (key === "broadcast") {
      router.push("/broadcast");
    } else if (key === "team-register") {
      router.push("/team-register");
    } else if (key === "news") {
      // Navigate to news section
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAd((currentAd) => {
        const nextAd = (currentAd + 1) % ads.length;

        carouselRef.current?.scrollTo({
          x: nextAd * bannerWidth,
          animated: true
        });

        return nextAd;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [bannerWidth]);

  const handleAdMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextAd = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    setActiveAd(nextAd);
  };

  return (
    <Screen
      eyebrow={formatHomeEyebrow(locale, new Date(2026, 5, 1))}
      title={t("home.welcome", { name: "Adrián" })}
    >
      <ImageBackground
        source={featuredMatchBackground}
        style={styles.matchHero}
        imageStyle={styles.matchHeroImage}
        resizeMode="cover"
      >
        <View style={styles.matchOverlay}>
          <View>
            <View style={styles.liveBadge}>
              <View style={styles.liveBadgeDot} />
              <Text style={styles.liveBadgeText}>{t("home.live")}</Text>
            </View>

            <Text style={styles.matchTournament}>
              129° ABIERTO ARGENTINO DE POLO
            </Text>
            <Text style={styles.matchChukker}>CHUKKER 3</Text>
          </View>

          <View>
            <View style={styles.scoreRow}>
              <View style={styles.teamBlock}>
                <View style={styles.teamLogo}>
                  <Image
                    source={getTeamLogoSource("La Dolfina", 92)}
                    style={styles.teamLogoImg}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.teamName} numberOfLines={1}>
                  LA DOLFINA
                </Text>
              </View>

              <Text style={styles.matchScore}>5 - 3</Text>

              <View style={styles.teamBlock}>
                <View style={styles.teamLogo}>
                  <Image
                    source={getTeamLogoSource("Ellerstina", 92)}
                    style={styles.teamLogoImg}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.teamName} numberOfLines={1}>
                  ELLERSTINA
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }: { pressed: boolean }) => [
                styles.watchButton,
                pressed && styles.watchButtonPressed
              ]}
              onPress={() =>
                router.push({
                  pathname: "/match-detail",
                  params: { id: "2-1" }
                })
              }
            >
              <Text style={styles.watchButtonText}>{t("home.watchLive")}</Text>
              <Ionicons name="play" size={14} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </ImageBackground>

      <ScrollView
        ref={carouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={bannerWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={handleAdMomentumEnd}
        contentContainerStyle={styles.adsTrack}
      >
        {ads.map((ad, index) => (
          <View
            key={`home-hero-${index}`}
            style={[styles.adBanner, { width: bannerWidth }]}
          >
            <Image source={ad} style={styles.adImage} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {ads.map((_, index) => (
          <View
            key={`home-hero-dot-${index}`}
            style={[styles.dot, index === activeAd ? styles.activeDot : null]}
          />
        ))}
      </View>

      <SectionTitle title={t("home.quickAccess")} />
      <View style={styles.quickGrid}>
        {quickAccessItems.map(({ key, label, icon }) => (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.quickItem,
              pressed && styles.quickItemPressed
            ]}
            onPress={() => handleQuickAccessPress(key)}
          >
            <View>
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={23}
                color={colors.primary}
              />
            </View>
            <Text style={styles.quickText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <AdCarousel images={compactAds} height={90} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  matchHero: {
    minHeight: 220,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: colors.primaryDark
  },
  matchHeroImage: {
    borderRadius: 18
  },
  matchOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(5, 15, 28, 0.58)"
  },
  liveBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 6,
    backgroundColor: "#e21f2f",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  liveBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#ffffff"
  },
  liveBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  matchTournament: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 12
  },
  matchChukker: {
    color: "#7dc7ff",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12
  },
  teamBlock: {
    width: 88,
    alignItems: "center",
    gap: 7
  },
  teamLogo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    overflow: "hidden"
  },
  teamLogoImg: {
    width: 46,
    height: 46
  },
  teamName: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  matchScore: {
    flex: 1,
    color: "#ffffff",
    fontSize: 33,
    fontWeight: "900",
    textAlign: "center"
  },
  watchButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 7,
    backgroundColor: colors.primary,
    paddingHorizontal: 17,
    paddingVertical: 12,
    marginTop: 16
  },
  watchButtonPressed: {
    opacity: 0.82
  },
  watchButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  adsTrack: {
    marginBottom: 8
  },
  adBanner: {
    height: 146,
    borderRadius: 18,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  adImage: {
    width: "100%",
    height: "100%"
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 2,
    marginBottom: 14
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border
  },
  activeDot: {
    width: 18,
    backgroundColor: colors.primary
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16
  },
  quickItem: {
    width: "48%",
    minHeight: 84,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    justifyContent: "space-between"
  },
  quickItemPressed: {
    backgroundColor: colors.surfaceStrong,
    opacity: 0.8
  },
  quickText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  cardText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8
  }
});
