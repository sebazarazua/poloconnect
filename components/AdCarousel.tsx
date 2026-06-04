import { useEffect, useRef, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { useAppDrawer } from "@/components/AppDrawer";
import { AppColors, useThemeColors } from "@/constants/theme";

interface AdCarouselProps {
  images: ImageSourcePropType[];
  height?: number;
}

export function AdCarousel({ images, height = 100 }: AdCarouselProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { setDrawerGestureBlocked } = useAppDrawer();
  const carouselRef = useRef<ScrollView>(null);
  const [activeItem, setActiveItem] = useState(0);
  const { width } = useWindowDimensions();
  const bannerWidth = Math.max(width - 40, 280);

  useEffect(() => {
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

  return (
    <View>
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
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={styles.track}
      >
        {images.map((image, index) => (
          <View
            key={`ad-slide-${index}`}
            style={[
              styles.banner,
              { width: bannerWidth, height }
            ]}
          >
            <Image source={image} style={styles.image} resizeMode="cover" />
          </View>
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
    height: "100%"
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
