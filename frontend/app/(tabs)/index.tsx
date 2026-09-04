import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PixelRatio,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Card, SectionTitle } from "@/components/Card";
import { AdCarousel } from "@/components/AdCarousel";
import { Screen } from "@/components/Screen";
import { useAppDrawer } from "@/components/AppDrawer";
import { AppColors, useThemeColors } from "@/constants/theme";
import { resolveTeamLogoSource } from "@/constants/teamLogos";
import { formatHomeEyebrow } from "@/constants/i18n";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { getHomeContent } from "@/services/api/content";
import { listMatches } from "@/services/api/matches";
import { getLiveSpotlightEvents, type SpotlightEvent } from "@/services/api/spotlight-events";
import { resolveContentImageSource } from "@/services/content-images";
import { parseContentTarget } from "@/services/content-targets";
import { Match } from "@/services/matches";

const screenHorizontalPadding = 40;
const featuredMatchBackground = require("../../assets/home-match-bg.png");
const matchSlideDurationMs = 7000;
const newsSlideDurationMs = 4300;
const homePrimaryBannerDesignWidth = 390;
const homePrimaryBannerBaseHeight = 146;

function getResponsiveBannerHeight(baseHeight: number, currentWidth: number) {
  const scaledHeight = Math.round((currentWidth / homePrimaryBannerDesignWidth) * baseHeight);
  const minHeight = Math.round(baseHeight * 0.82);
  const maxHeight = Math.round(baseHeight * 1.45);

  return Math.max(minHeight, Math.min(maxHeight, scaledHeight));
}

type HomeAdItem = {
  imageUrl: string;
  targetUrl?: string;
};

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
  // PixelRatio rounding (not plain dp rounding) guarantees a whole number of
  // physical pixels per slide, which avoids a 1px seam/bleed between adjacent
  // carousel items on Android caused by Yoga rounding each item independently.
  const bannerWidth = PixelRatio.roundToNearestPixel(Math.max(width - screenHorizontalPadding, 280));
  const primaryBannerHeight = getResponsiveBannerHeight(homePrimaryBannerBaseHeight, bannerWidth);
  const welcomeName = user?.firstName?.trim() || "Adrian";
  const [homeContent, setHomeContent] = useState<{ heroAds: HomeAdItem[]; compactAds: HomeAdItem[]; news: Array<{ title: string; subtitle?: string; body?: string; imageUrl: string; targetUrl?: string }> }>({
    heroAds: [],
    compactAds: [],
    news: []
  });
  const [homeContentLoading, setHomeContentLoading] = useState(true);
  const [homeContentError, setHomeContentError] = useState(false);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [liveSpotlightEvents, setLiveSpotlightEvents] = useState<SpotlightEvent[]>([]);

  useEffect(() => {
    console.info("startup/home-mounted");
  }, []);

  const openTargetUrl = async (targetUrl?: string) => {
    const target = parseContentTarget(targetUrl);

    if (target.kind === "none") {
      return;
    }

    if (target.kind === "shop") {
      router.push({ pathname: "/brand-catalog", params: { id: target.brandId } });
      return;
    }

    await Linking.openURL(target.url);
  };
  const openFeaturedMatch = (id: string) => {
    router.push({
      pathname: "/match-detail",
      params: { id }
    });
  };

  const openSpotlightEvent = (youtubeUrl?: string | null, title?: string) => {
    if (!youtubeUrl) return;
    router.push({
      pathname: "/watch-live",
      params: { url: youtubeUrl, title: title ?? "" }
    });
  };

  useEffect(() => {
    setHomeContentLoading(true);
    void getHomeContent()
      .then((payload) => {
        setHomeContentError(false);
        setHomeContent({
          heroAds: payload.heroAds.map((item) => ({ imageUrl: item.imageUrl, targetUrl: item.targetUrl ?? undefined })),
          compactAds: payload.compactAds.map((item) => ({ imageUrl: item.imageUrl, targetUrl: item.targetUrl ?? undefined })),
          news: payload.news.map((item) => ({
            title: item.title ?? t("home.fallbackNewsTitle"),
            subtitle: item.subtitle ?? t("home.fallbackNewsCategory"),
            body: item.body ?? "",
            imageUrl: item.imageUrl,
            targetUrl: item.targetUrl ?? undefined
          }))
        });
      })
      .catch(() => {
        setHomeContentError(true);
      })
      .finally(() => {
        setHomeContentLoading(false);
      });

    void listMatches(undefined, "live")
      .then((matches) => {
        const sorted = [...matches].sort((a, b) => {
          const aTime = new Date(`${String(a.date).slice(0, 10)}T${a.time}:00`).getTime();
          const bTime = new Date(`${String(b.date).slice(0, 10)}T${b.time}:00`).getTime();
          return aTime - bTime;
        });
        setLiveMatches(sorted);
      })
      .catch(() => setLiveMatches([]));

    void getLiveSpotlightEvents()
      .then(setLiveSpotlightEvents)
      .catch(() => setLiveSpotlightEvents([]));
  }, [t]);

  const ads = homeContent.heroAds.map((ad) => resolveContentImageSource(ad.imageUrl));
  const adTargetUrls = homeContent.heroAds.map((ad) => ad.targetUrl);
  const compactAds = homeContent.compactAds.map((ad) => resolveContentImageSource(ad.imageUrl));
  const compactAdTargetUrls = homeContent.compactAds.map((ad) => ad.targetUrl);

  const quickAccessItems = [
    { key: "calendar", label: t("home.calendar"), icon: "calendar-outline" },
    { key: "community", label: t("home.communities"), icon: "people-outline" },
    { key: "broadcast", label: t("home.broadcast"), icon: "play-circle-outline" },
    { key: "auctions", label: t("home.auctions"), icon: "cash-outline" }
  ] as const;

  type HeroItem =
    | {
        type: "match";
        id: string;
        team1: string;
        team2: string;
        team1LogoUrl?: string;
        team2LogoUrl?: string;
        score1: number;
        score2: number;
        competition: string;
        chukker?: string;
        backgroundImageUrl?: string;
      }
    | {
        type: "event";
        id: string;
        title: string;
        description?: string;
        youtubeUrl?: string;
        backgroundImageUrl?: string;
      }
    | {
        type: "news";
        source: string;
        category: string;
        title: string;
        summary: string;
        time: string;
        imageUrl?: string;
        targetUrl?: string;
        accent: string;
        background: string;
        panel: string;
        glow: string;
      };

  const remoteNewsItems: HeroItem[] = homeContent.news.map((entry, index) => ({
    type: "news",
    source: "PoloHUB",
    category: entry.subtitle?.toUpperCase() || t("home.fallbackNewsCategory"),
    title: entry.title,
    summary: entry.body || "",
    time: t("home.now"),
    imageUrl: entry.imageUrl,
    targetUrl: entry.targetUrl,
    accent: ["#f7c66b", "#53d6b5", "#8dc2ff", "#ff9f7a"][index % 4],
    background: ["#0d4f8c", "#0a5a78", "#153f78", "#6b3f63"][index % 4],
    panel: "rgba(255, 255, 255, 0.10)",
    glow: ["rgba(247, 198, 107, 0.22)", "rgba(83, 214, 181, 0.20)", "rgba(141, 194, 255, 0.18)", "rgba(255, 159, 122, 0.18)"][index % 4]
  }));

  const liveMatchItems: HeroItem[] = liveMatches.map((match) => ({
    type: "match",
    id: match.externalCode || match.id,
    team1: match.team1,
    team2: match.team2,
    team1LogoUrl: match.team1LogoUrl,
    team2LogoUrl: match.team2LogoUrl,
    score1: match.score1,
    score2: match.score2,
    competition: match.competition,
    chukker: match.chukker,
    backgroundImageUrl: match.backgroundImageUrl
  }));

  const liveEventItems: HeroItem[] = liveSpotlightEvents.map((event) => ({
    type: "event",
    id: event.id,
    title: event.title,
    description: event.description ?? undefined,
    youtubeUrl: event.youtubeUrl ?? undefined,
    backgroundImageUrl: event.backgroundImageUrl ?? undefined
  }));

  const heroItems: HeroItem[] = [...liveMatchItems, ...liveEventItems, ...remoteNewsItems];

  const activeHeroItem = heroItems[activeHero];
  const activeHeroDuration = activeHeroItem?.type === "match" || activeHeroItem?.type === "event" ? matchSlideDurationMs : newsSlideDurationMs;

  const handleQuickAccessPress = (key: string) => {
    if (key === "calendar") {
      router.push("/(tabs)/tournaments");
    } else if (key === "broadcast") {
      router.push("/broadcast");
    } else if (key === "community") {
      router.push("/(tabs)/community");
    } else if (key === "auctions") {
      router.push("/horse-auctions");
    }
  };

  useEffect(() => {
    if (heroItems.length <= 1) return;

    const timer = setTimeout(() => {
      setActiveHero((current) => {
        const next = (current + 1) % heroItems.length;
        heroCarouselRef.current?.scrollTo({ x: next * bannerWidth, animated: true });
        return next;
      });
    }, activeHeroDuration);

    return () => clearTimeout(timer);
  }, [activeHero, activeHeroDuration, bannerWidth, heroItems.length]);

  useEffect(() => {
    if (activeHero < heroItems.length) return;
    setActiveHero(0);
    heroCarouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [activeHero, heroItems.length]);

  useEffect(() => {
    if (ads.length < 2) {
      return;
    }

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
  }, [ads.length, bannerWidth]);

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
      eyebrow={formatHomeEyebrow(locale, new Date())}
      title={t("home.welcome", { name: welcomeName })}
    >
      {/* ── Hero carousel: live match + news ── */}
      <ScrollView
        ref={heroCarouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={bannerWidth}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        overScrollMode="never"
        onTouchStart={() => setDrawerGestureBlocked(true)}
        onTouchEnd={() => setDrawerGestureBlocked(false)}
        onTouchCancel={() => setDrawerGestureBlocked(false)}
        onScrollBeginDrag={() => setDrawerGestureBlocked(true)}
        onScrollEndDrag={() => setDrawerGestureBlocked(false)}
        onMomentumScrollEnd={handleHeroMomentumEnd}
        onMomentumScrollBegin={() => setDrawerGestureBlocked(true)}
        contentContainerStyle={styles.heroTrack}
        style={{ width: bannerWidth, overflow: "hidden" }}
      >
        {heroItems.map((item, index) =>
          item.type === "match" ? (
            <Pressable
              key={index}
              style={[styles.matchHero, { width: bannerWidth }]}
              onPress={() => openFeaturedMatch(item.id)}
            >
              <ImageBackground
                source={item.backgroundImageUrl ? resolveContentImageSource(item.backgroundImageUrl) : featuredMatchBackground}
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
                    {(item.competition || "PARTIDO EN VIVO").toUpperCase()}
                  </Text>
                  <Text style={styles.matchChukker}>{(item.chukker || "EN JUEGO").toUpperCase()}</Text>
                </View>

                <View style={styles.matchBottom}>
                  <View style={styles.scoreRow}>
                    <View style={styles.teamBlock}>
                      <View style={styles.teamLogo}>
                        <Image
                          source={resolveTeamLogoSource(item.team1, item.team1LogoUrl, 92)}
                          style={styles.teamLogoImg}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {item.team1.toUpperCase()}
                      </Text>
                    </View>

                    <Text style={styles.matchScore}>{item.score1} - {item.score2}</Text>

                    <View style={styles.teamBlock}>
                      <View style={styles.teamLogo}>
                        <Image
                          source={resolveTeamLogoSource(item.team2, item.team2LogoUrl, 92)}
                          style={styles.teamLogoImg}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {item.team2.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              </ImageBackground>
            </Pressable>
          ) : item.type === "event" ? (
            <Pressable
              key={index}
              style={[styles.matchHero, { width: bannerWidth }]}
              onPress={() => openSpotlightEvent(item.youtubeUrl, item.title)}
            >
              <ImageBackground
                source={item.backgroundImageUrl ? resolveContentImageSource(item.backgroundImageUrl) : featuredMatchBackground}
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
                    <Text style={styles.matchTournament} numberOfLines={2}>
                      {item.title.toUpperCase()}
                    </Text>
                    {item.description ? (
                      <Text style={styles.matchChukker} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>

                  {item.youtubeUrl ? (
                    <View style={styles.matchBottom}>
                      <View style={styles.readMoreButton}>
                        <Text style={styles.readMoreText}>{t("home.watchLive")}</Text>
                        <Ionicons name="play" size={13} color="#ffffff" />
                      </View>
                    </View>
                  ) : null}
                </View>
              </ImageBackground>
            </Pressable>
          ) : (
            <Pressable
              key={index}
              style={[
                styles.matchHero,
                styles.newsHero,
                { width: bannerWidth }
              ]}
              onPress={() => void openTargetUrl(item.targetUrl)}
            >
              {item.imageUrl ? (
                <Image
                  source={resolveContentImageSource(item.imageUrl)}
                  style={styles.newsBackgroundImage}
                  resizeMode="cover"
                  blurRadius={3}
                />
              ) : null}

              <View style={styles.newsDarkLayer} />

              <View style={styles.matchHeroFill}>
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
                      <Text style={styles.readMoreText}>{t("home.readMore")}</Text>
                      <Ionicons name="arrow-forward" size={13} color="#ffffff" />
                    </View>
                  </View>
                  </View>
                </View>
              </View>
            </Pressable>
          )
        )}
      </ScrollView>

      {heroItems.length === 0 ? (
        <Card style={styles.homeStatusCard}>
          <Ionicons name={homeContentError ? "warning-outline" : "hourglass-outline"} size={20} color={homeContentError ? colors.danger : colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.homeStatusTitle}>{homeContentError ? "No se pudo cargar el inicio" : homeContentLoading ? t("common.loading") : "Sin contenido disponible"}</Text>
            <Text style={styles.homeStatusText}>{homeContentError ? "Las noticias y destacados no están disponibles por un error del proveedor." : "Estamos preparando las noticias y destacados."}</Text>
          </View>
        </Card>
      ) : null}

      <View style={styles.heroDots}>
        {heroItems.map((_, index) => (
          <View
            key={`hero-dot-${index}`}
            style={[styles.dot, index === activeHero ? styles.activeDot : null]}
          />
        ))}
      </View>


      {ads.length > 0 ? (
        <ScrollView
          ref={carouselRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={bannerWidth}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          overScrollMode="never"
          onTouchStart={() => setDrawerGestureBlocked(true)}
          onTouchEnd={() => setDrawerGestureBlocked(false)}
          onTouchCancel={() => setDrawerGestureBlocked(false)}
          onScrollBeginDrag={() => setDrawerGestureBlocked(true)}
          onScrollEndDrag={() => setDrawerGestureBlocked(false)}
          onMomentumScrollBegin={() => setDrawerGestureBlocked(true)}
          onMomentumScrollEnd={handleAdMomentumEnd}
          style={{ width: bannerWidth, overflow: "hidden" }}
          contentContainerStyle={styles.adsTrack}
        >
          {ads.map((ad, index) => (
            <Pressable
              key={`home-hero-${index}`}
              onPress={() => void openTargetUrl(adTargetUrls[index])}
              style={[styles.adBanner, { width: bannerWidth, height: primaryBannerHeight }]}
            >
              <Image source={ad} style={styles.adImage} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {ads.length > 0 ? (
        <View style={styles.dots}>
          {ads.map((_, index) => (
            <View
              key={`home-hero-dot-${index}`}
              style={[styles.dot, index === activeAd ? styles.activeDot : null]}
            />
          ))}
        </View>
      ) : null}

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
            <View style={styles.quickGoldBar} />
            <View style={styles.quickRow}>
              <View style={[
                styles.quickIconWrap,
                colors.background !== "#ffffff" && styles.quickIconWrapDark
              ]}>
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={30}
                  color={colors.background !== "#ffffff" ? "#0a3d7a" : "#E8C97A"}
                />
              </View>
              <Text
                style={styles.quickText}
                numberOfLines={2}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                textBreakStrategy="simple"
              >
                {label}
              </Text>
            </View>
            <View style={styles.quickGoldDot} />
          </Pressable>
        ))}
      </View>
      <AdCarousel images={compactAds} targetUrls={compactAdTargetUrls} height={90} />
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
    borderRadius: 18,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  adImage: {
    width: "100%",
    height: "100%",
    // Android only clips an Image reliably when it carries the same radius as
    // its parent; relying on the parent's overflow:hidden alone can leave a
    // hairline of the previous slide bleeding through the rounded edge.
    borderRadius: 18
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
    borderColor: "rgba(232, 201, 122, 0.30)",
    padding: 14,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#C9A84C",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  quickItemPressed: {
    backgroundColor: colors.surfaceStrong,
    opacity: 0.88
  },
  quickGoldBar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 3,
    height: "100%",
    backgroundColor: "#E8C97A",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  quickIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(232, 201, 122, 0.35)",
    shadowColor: "#E8C97A",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  quickIconWrapDark: {
    backgroundColor: "#E8C97A",
    borderColor: "rgba(232, 201, 122, 0.6)",
    shadowColor: "#C9A84C",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  quickText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    flex: 1
  },
  quickGoldDot: {
    position: "absolute",
    bottom: 10,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E8C97A",
    opacity: 0.7
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
  homeStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.background,
    marginBottom: 14
  },
  homeStatusTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  homeStatusText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },

  // News slide
  newsHero: {
    borderWidth: 0,
    position: "relative"
  },
  newsBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    // Android only clips an Image reliably when it carries the same radius as
    // its parent; relying on the parent's overflow:hidden alone can leave a
    // hairline of the previous slide bleeding through the rounded edge.
    borderRadius: 18
  },
  newsDarkLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 16, 28, 0.39)"
  },
  newsBackdrop: {
    ...StyleSheet.absoluteFillObject
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
  newsOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 0,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14
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
    marginBottom: 10
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
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "800",
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
