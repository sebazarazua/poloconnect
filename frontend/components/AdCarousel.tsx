import { useEffect, useRef, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PixelRatio,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { useAppDrawer } from "@/components/AppDrawer";
import { AppColors, useThemeColors } from "@/constants/theme";
import { parseContentTarget } from "@/services/content-targets";

interface AdCarouselProps {
  images: ImageSourcePropType[];
  targetUrls?: Array<string | null | undefined>;
  height?: number;
}

const BANNER_DESIGN_WIDTH = 390;

function getResponsiveHeight(baseHeight: number, currentWidth: number) {
  const scaledHeight = Math.round((currentWidth / BANNER_DESIGN_WIDTH) * baseHeight);
  const minHeight = Math.round(baseHeight * 0.82);
  const maxHeight = Math.round(baseHeight * 1.45);

  return Math.max(minHeight, Math.min(maxHeight, scaledHeight));
}

export function AdCarousel({ images, targetUrls = [], height = 100 }: AdCarouselProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { setDrawerGestureBlocked } = useAppDrawer();
  const carouselRef = useRef<ScrollView>(null);
  const [activeItem, setActiveItem] = useState(0);
  const { width } = useWindowDimensions();
  // PixelRatio rounding (not plain dp rounding) guarantees a whole number of
  // physical pixels per slide, which avoids a 1px seam/bleed between adjacent
  // carousel items on Android caused by Yoga rounding each item independently.
  const bannerWidth = PixelRatio.roundToNearestPixel(Math.max(width - 40, 280));
  const bannerHeight = getResponsiveHeight(height, bannerWidth);

  useEffect(() => {
    if (images.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      setActiveItem((currentItem) => {
        const nextItem = (currentItem + 1) % images.length;

        carouselRef.current?.scrollTo({
          x: nextItem * bannerWidth,
          animated: true
        });

        return nextItem;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [bannerWidth, images.length]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextItem = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    setActiveItem(nextItem);
    setDrawerGestureBlocked(false);
  };

  const openSlideTarget = async (index: number) => {
    const target = parseContentTarget(targetUrls[index]);
    if (target.kind === "none") {
      return;
    }

    if (target.kind === "shop") {
      router.push({ pathname: "/brand-catalog", params: { id: target.brandId } });
      return;
    }

    await Linking.openURL(target.url);
  };

  // A carousel with no published item must never collapse the layout: it keeps
  // its slot with a neutral branded placeholder instead.
  if (images.length === 0) {
    return (
      <View>
        <View style={[styles.banner, styles.placeholder, { width: bannerWidth, height: bannerHeight }]}>
          <Image source={require("@/assets/logo.png")} style={styles.placeholderLogo} resizeMode="contain" />
        </View>
        <View style={styles.dots} />
      </View>
    );
  }

  return (
    <View>
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
        onMomentumScrollEnd={handleMomentumEnd}
        style={{ width: bannerWidth, overflow: "hidden" }}
        contentContainerStyle={styles.track}
      >
        {images.map((image, index) => (
          <Pressable
            key={`ad-slide-${index}`}
            onPress={() => void openSlideTarget(index)}
            style={[
              styles.banner,
              { width: bannerWidth, height: bannerHeight }
            ]}
          >
            <Image source={image} style={styles.image} resizeMode="cover" />
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {images.map((_, index) => (
          <View
            key={`ad-dot-${index}`}
            style={[styles.dot, index === activeItem && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  track: {
    marginBottom: 6
  },
  banner: {
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  image: {
    width: "100%",
    height: "100%",
    // Android only clips an Image reliably when it carries the same radius as
    // its parent; relying on the parent's overflow:hidden alone can leave a
    // hairline of the previous slide bleeding through the rounded edge.
    borderRadius: 14
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6
  },
  placeholderLogo: {
    width: "38%",
    height: "46%",
    opacity: 0.35
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
