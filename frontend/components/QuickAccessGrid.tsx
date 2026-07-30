import { StyleSheet, View } from "react-native";
import { QuickAccessCard, type QuickAccessCardProps } from "./QuickAccessCard";

interface QuickAccessGridProps {
  items: QuickAccessCardProps[];
}

export function QuickAccessGrid({ items }: QuickAccessGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <QuickAccessCard
          key={item.title}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          onPress={item.onPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16
  }
});
