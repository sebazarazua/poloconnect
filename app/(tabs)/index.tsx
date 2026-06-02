import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Badge, Card, SectionTitle } from "@/components/Card";
import { AdCarousel } from "@/components/AdCarousel";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

const screenHorizontalPadding = 40;

const ads = [
  {
    title: "Sponsor Oficial",
    text: "Banner 1 para marca o club",
    tone: "#d8ecff"
  },
  {
    title: "Equipamiento premium",
    text: "Banner 2 para tienda de polo",
    tone: "#eaf5ff"
  },
  {
    title: "Torneos y eventos",
    text: "Banner 3 para torneo destacado",
    tone: "#cfe7ff"
  }
];

export default function HomeScreen() {
  const router = useRouter();
  const carouselRef = useRef<ScrollView>(null);
  const [activeAd, setActiveAd] = useState(0);
  const { width } = useWindowDimensions();
  const bannerWidth = Math.max(width - screenHorizontalPadding, 280);

  const handleQuickAccessPress = (label: string) => {
    if (label === "Calendario") {
      router.push("/(tabs)/tournaments");
    } else if (label === "Partidos emitidos") {
      router.push("/broadcast");
    } else if (label === "Anota a tu equipo") {
      router.push("/team-register");
    } else if (label === "Noticias") {
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
    <Screen eyebrow="Lunes, 1 de junio de 2026" title="¡Bienvenido, Adrián!">
      <Card style={styles.hero}>
        <View>
          <Badge label="Hoy" />
          <Text style={styles.heroTitle}>La Dolfina vs Ellerstina</Text>
          <Text style={styles.heroText}>Final de zona, 16:30 hs</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.score}>8 - 7</Text>
          <Text style={styles.scoreLabel}>3er chukker</Text>
        </View>
      </Card>

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
            key={ad.title}
            style={[styles.adBanner, { width: bannerWidth, backgroundColor: ad.tone }]}
          >
            <Ionicons name="image-outline" size={30} color={colors.primary} />
            <View style={styles.adContent}>
              <Text style={styles.placeholderText}>Placeholder {index + 1}</Text>
              <Text style={styles.adTitle}>{ad.title}</Text>
              <Text style={styles.adText}>{ad.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {ads.map((ad, index) => (
          <View
            key={ad.title}
            style={[styles.dot, index === activeAd ? styles.activeDot : null]}
          />
        ))}
      </View>

      <SectionTitle title="Accesos rapidos" />
      <View style={styles.quickGrid}>
        {[
          ["Calendario", "calendar-outline"],
          ["Anota a tu equipo", "person-add-outline"],
          ["Partidos emitidos", "play-circle-outline"],
          ["Noticias", "newspaper-outline"]
        ].map(([label, icon]) => (
          <Pressable
            key={label}
            style={({ pressed }) => [
              styles.quickItem,
              pressed && styles.quickItemPressed
            ]}
            onPress={() => handleQuickAccessPress(label)}
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
      <AdCarousel height={90} />    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surfaceStrong
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 14
  },
  heroText: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 6
  },
  scoreBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center"
  },
  score: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: "900"
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  adsTrack: {
    marginBottom: 8
  },
  adBanner: {
    minHeight: 146,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  adContent: {
    flex: 1,
    justifyContent: "center"
  },
  adTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 7
  },
  adText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4
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
