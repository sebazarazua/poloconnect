import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  Linking,
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
import { useAppDrawer } from "@/components/AppDrawer";
import { AppColors, useThemeColors } from "@/constants/theme";
import { getTeamLogoSource } from "@/constants/teamLogos";
import { formatHomeEyebrow } from "@/constants/i18n";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";

const screenHorizontalPadding = 40;
const featuredMatchBackground = require("../../assets/home-match-bg.png");
const poloHubUrl = "https://polohub.net/";

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
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { setDrawerGestureBlocked } = useAppDrawer();
  const { locale, t } = useLocale();
  const { user } = useAuth();
  const carouselRef = useRef<ScrollView>(null);
  const [activeAd, setActiveAd] = useState(0);
  const heroCarouselRef = useRef<ScrollView>(null);
  const [activeHero, setActiveHero] = useState(0);
  const { width } = useWindowDimensions();
  const bannerWidth = Math.max(width - screenHorizontalPadding, 280);
  const welcomeName = user?.firstName?.trim() || "Adrian";

  const openPoloHub = () => {
    Linking.openURL(poloHubUrl);
  };

  const openFeaturedMatch = () => {
    router.push({
      pathname: "/match-detail",
      params: { id: "2-1" }
    });
  };

  const quickAccessItems = [
    { key: "calendar", label: t("home.calendar"), icon: "calendar-outline", route: "/(tabs)/tournaments" },
    { key: "community", label: "Comunidades", icon: "people-outline", route: "/(tabs)/community" },
    { key: "broadcast", label: t("home.broadcast"), icon: "play-circle-outline", route: "/broadcast" },
    { key: "news", label: t("home.news"), icon: "newspaper-outline" }
  ] as const;

  type HeroItem =
    | { type: "match" }
    | {
        type: "news";
        source: string;
        category: string;
        title: string;
        summary: string;
        time: string;
        accent: string;
        background: string;
        panel: string;
        glow: string;
      };

  const heroItems: HeroItem[] = [
    { type: "match" },
    {
      type: "news",
      source: "Polo Hub",
      category: "FICHAJE",
      title: "Cambiaso renueva con La Dolfina por dos temporadas más",
      summary: "El mejor polista del mundo firmó su continuidad en el equipo hasta el 2028.",
      time: "Hace 2 horas",
      accent: "#f7c66b",
      background: "#0d4f8c",
      panel: "rgba(255, 255, 255, 0.10)",
      glow: "rgba(247, 198, 107, 0.22)"
    },
    {
      type: "news",
      source: "AAP Noticias",
      category: "TORNEO",
      title: "El Abierto de Palermo 2026 ya tiene fixture completo",
      summary: "La Asociación Argentina de Polo publicó el calendario oficial del torneo más importante del mundo.",
      time: "Hace 4 horas",
      accent: "#53d6b5",
      background: "#0a5a78",
      panel: "rgba(255, 255, 255, 0.10)",
      glow: "rgba(83, 214, 181, 0.20)"
    },
    {
      type: "news",
      source: "Polo Line",
      category: "INTERNACIONAL",
      title: "Argentina domina el ranking mundial con 8 jugadores en el top 10",
      summary: "La FIP publicó la nueva clasificación donde Argentina sigue siendo la potencia del polo mundial.",
      time: "Ayer",
      accent: "#8dc2ff",
      background: "#153f78",
      panel: "rgba(255, 255, 255, 0.09)",
      glow: "rgba(141, 194, 255, 0.18)"
    },
    {
      type: "news",
      source: "Equine Network",
      category: "BIENESTAR",
      title: "Nuevos protocolos de bienestar equino en torneos de alto handicap",
      summary: "La FIP aprobó medidas más estrictas para el cuidado de los caballos durante competencias.",
      time: "Ayer",
      accent: "#ff9f7a",
      background: "#6b3f63",
      panel: "rgba(255, 255, 255, 0.10)",
      glow: "rgba(255, 159, 122, 0.18)"
    }
  ];

  const handleQuickAccessPress = (key: string) => {
    if (key === "calendar") {
      router.push("/(tabs)/tournaments");
    } else if (key === "broadcast") {
      router.push("/broadcast");
    } else if (key === "community") {
      router.push("/(tabs)/community");
    } else if (key === "news") {
      openPoloHub();
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHero((current) => {
        const next = (current + 1) % heroItems.length;
        heroCarouselRef.current?.scrollTo({ x: next * bannerWidth, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerWidth]);

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

  const handleHeroMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    setActiveHero(next);
    setDrawerGestureBlocked(false);
  };

  const handleAdMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextAd = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    setActiveAd(nextAd);
    setDrawerGestureBlocked(false);
  };

  return (
    <Screen
      eyebrow={formatHomeEyebrow(locale, new Date(2026, 5, 1))}
      title={t("home.welcome", { name: welcomeName })}
    >
      {/* ── Hero carousel: live match + news ── */}
      <ScrollView
        ref={heroCarouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={bannerWidth}
        decelerationRate="fast"
        onTouchStart={() => setDrawerGestureBlocked(true)}
        onTouchEnd={() => setDrawerGestureBlocked(false)}
        onTouchCancel={() => setDrawerGestureBlocked(false)}
        onScrollBeginDrag={() => setDrawerGestureBlocked(true)}
        onScrollEndDrag={() => setDrawerGestureBlocked(false)}
        onMomentumScrollEnd={handleHeroMomentumEnd}
        onMomentumScrollBegin={() => setDrawerGestureBlocked(true)}
        contentContainerStyle={styles.heroTrack}
        style={{ width: bannerWidth }}
      >
        {heroItems.map((item, index) =>
          item.type === "match" ? (
            <Pressable
              key={index}
              style={[styles.matchHero, { width: bannerWidth }]}
              onPress={openFeaturedMatch}
            >
              <ImageBackground
                source={featuredMatchBackground}
                style={styles.matchHeroFill}
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

                <View style={styles.matchBottom}>
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
                </View>
              </View>
              </ImageBackground>
            </Pressable>
          ) : (
            <Pressable
              key={index}
              style={[
                styles.matchHero,
                styles.newsHero,
                { width: bannerWidth, backgroundColor: item.background }
              ]}
              onPress={openPoloHub}
            >
              <View style={styles.newsBackdrop}>
                <View
                  style={[
                    styles.newsGlowPrimary,
                    { backgroundColor: item.glow }
                  ]}
                />
                <View
                  style={[
                    styles.newsGlowSecondary,
                    { borderColor: `${item.accent}55` }
                  ]}
                />
              </View>

              <View style={styles.newsOverlay}>
                <View
                  style={[
                    styles.newsKickerLine,
                    { backgroundColor: item.accent }
                  ]}
                />

                <View
                  style={[
                    styles.newsContentPanel,
                    { backgroundColor: item.panel }
                  ]}
                >
                  <View style={styles.newsSourceRow}>
                    <View
                      style={[
                        styles.newsCategoryBadge,
                        { backgroundColor: item.accent }
                      ]}
                    >
                      <Text style={styles.newsCategoryText}>{item.category}</Text>
                    </View>
                    <Text style={styles.newsSourceText}>{item.source}</Text>
                    <Text style={styles.newsTime}>{item.time}</Text>
                  </View>

                  <View style={styles.newsBody}>
                    <Text style={styles.newsTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.newsSummary} numberOfLines={2}>
                      {item.summary}
                    </Text>
                    <View style={styles.readMoreButton}>
                      <Text style={styles.readMoreText}>Leer más</Text>
                      <Ionicons name="arrow-forward" size={13} color="#ffffff" />
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          )
        )}
      </ScrollView>


      <ScrollView
        ref={carouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={bannerWidth}
        decelerationRate="fast"
        onTouchStart={() => setDrawerGestureBlocked(true)}
        onTouchEnd={() => setDrawerGestureBlocked(false)}
        onTouchCancel={() => setDrawerGestureBlocked(false)}
        onScrollBeginDrag={() => setDrawerGestureBlocked(true)}
        onScrollEndDrag={() => setDrawerGestureBlocked(false)}
        onMomentumScrollBegin={() => setDrawerGestureBlocked(true)}
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

const createStyles = (colors: AppColors) => StyleSheet.create({
  matchHero: {
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: colors.primaryDark
  },
  matchHeroImage: {
    borderRadius: 18
  },
  matchHeroFill: {
    flex: 1
  },
  matchOverlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
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
    backgroundColor: colors.background
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
  matchBottom: {
    paddingBottom: 2
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
  },

  // Hero carousel
  heroTrack: {
    marginBottom: 0
  },
  heroDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 14
  },

  // News slide
  newsHero: {
    borderWidth: 1,
    borderColor: "rgba(217, 233, 247, 0.35)",
    position: "relative"
  },
  newsBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  newsOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12
  },
  newsGlowPrimary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -72,
    right: -42
  },
  newsGlowSecondary: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: -32,
    left: -26,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  newsKickerLine: {
    width: 42,
    height: 4,
    borderRadius: 999,
    marginBottom: 8,
    marginLeft: 4
  },
  newsContentPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#04172b",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  newsSourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  newsCategoryBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  newsCategoryText: {
    color: "#102235",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  newsSourceText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "700",
    flex: 1
  },
  newsTime: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700"
  },
  newsBody: {
    gap: 6
  },
  newsTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
    letterSpacing: -0.3
  },
  newsSummary: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 16
  },
  readMoreButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)"
  },
  readMoreText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800"
  }
});
