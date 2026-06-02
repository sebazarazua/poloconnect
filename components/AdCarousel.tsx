import { Ionicons } from "@expo/vector-icons";
import { useRef, useEffect, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { colors } from "@/constants/theme";

interface AdCarouselProps {
  height?: number;
}

const ads = [
  {
    title: "Sponsor",
    text: "Descubrí nuestras promociones",
    tone: "#d8ecff"
  },
  {
    title: "Equipamiento",
    text: "Mirá el mejor gear disponible",
    tone: "#eaf5ff"
  },
  {
    title: "Eventos",
    text: "Próximos torneos y competencias",
    tone: "#cfe7ff"
  }
];

export function AdCarousel({ height = 100 }: AdCarouselProps) {
  const carouselRef = useRef<ScrollView>(null);
  const [activeAd, setActiveAd] = useState(0);
  const { width } = useWindowDimensions();
  const screenHorizontalPadding = 40;
  const bannerWidth = Math.max(width - screenHorizontalPadding, 280);

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
    }, 4000);

    return () => clearInterval(timer);
  }, [bannerWidth]);

  const handleAdMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextAd = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    setActiveAd(nextAd);
  };

  return (
    <View>
      <ScrollView
        ref={carouselRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={bannerWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={handleAdMomentumEnd}
        contentContainerStyle={styles.track}
      >
        {ads.map((ad) => (
          <View
            key={ad.title}
            style={[
              styles.banner,
              { width: bannerWidth, height, backgroundColor: ad.tone }
            ]}
          >
            <Ionicons name="image-outline" size={18} color={colors.primary} />
            <View style={styles.content}>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {ad.title}
              </Text>
              <Text style={styles.bannerText} numberOfLines={1}>
                {ad.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {ads.map((ad, index) => (
          <View
            key={ad.title}
            style={[styles.dot, index === activeAd && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    marginBottom: 6
  },
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  content: {
    flex: 1
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  bannerText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginBottom: 12
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border
  },
  activeDot: {
    width: 14,
    backgroundColor: colors.primary
  }
});
