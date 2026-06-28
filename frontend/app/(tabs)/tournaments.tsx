import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { formatCalendarMonth } from "@/constants/i18n";
import { listTournaments, type Tournament } from "@/services/api/tournaments";

const weekDays = {
  "es-AR": ["L", "M", "X", "J", "V", "S", "D"],
  "en-US": ["M", "Tu", "W", "Th", "F", "Sa", "Su"]
} as const;

export default function TournamentsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { locale, t } = useLocale();
  const [calendarDate, setCalendarDate] = useState({ month: 5, year: 2026 });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    void listTournaments(calendarDate).then(setTournaments);
  }, [calendarDate]);

  const monthTournaments = useMemo(
    () => tournaments.filter(
      (tournament) =>
        tournament.month === calendarDate.month && tournament.year === calendarDate.year
    ),
    [calendarDate]
  );

  const markedDays = useMemo(
    () => new Set(monthTournaments.map((tournament) => tournament.day)),
    [monthTournaments]
  );

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calendarDate.year, calendarDate.month + 1, 0).getDate();
    const firstWeekDay = new Date(calendarDate.year, calendarDate.month, 1).getDay();
    const mondayFirstOffset = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

    return [
      ...Array.from({ length: mondayFirstOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
    ];
  }, [calendarDate]);

  const changeMonth = (direction: -1 | 1) => {
    setSelectedDay(null);
    setCalendarDate((currentDate) => {
      const nextMonth = currentDate.month + direction;

      if (nextMonth < 0) {
        return { month: 11, year: currentDate.year - 1 };
      }

      if (nextMonth > 11) {
        return { month: 0, year: currentDate.year + 1 };
      }

      return { month: nextMonth, year: currentDate.year };
    });
  };

  return (
    <Screen
      eyebrow={t("tournaments.eyebrow")}
      title={t("tournaments.title")}
      subtitle={t("tournaments.subtitle")}
    >
      <Card style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <View>
            <Text style={styles.calendarMonth}>
              {formatCalendarMonth(locale, calendarDate.month, calendarDate.year)}
            </Text>
            <Text style={styles.calendarHint}>{t("tournaments.calendarHint")}</Text>
          </View>
          <View style={styles.calendarActions}>
            <Pressable style={styles.monthButton} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={19} color={colors.primaryDark} />
            </Pressable>
            <Pressable style={styles.monthButton} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={19} color={colors.primaryDark} />
            </Pressable>
          </View>
        </View>

        <View style={styles.monthBadge}>
          <Text style={styles.monthBadgeText}>
            {monthTournaments.length} {monthTournaments.length === 1 ? t("tournaments.eventSingular") : t("tournaments.eventPlural")}
          </Text>
        </View>

        <View style={styles.weekGrid}>
          {weekDays[locale].map((day) => (
            <Text key={day} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarDays.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const isMarked = markedDays.has(day);
            const isSelected = selectedDay === day;

            return (
              <Pressable
                key={day}
                style={[
                  styles.dayCell,
                  isMarked ? styles.markedDay : null,
                  isSelected ? styles.selectedDay : null
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    isMarked ? styles.markedDayText : null,
                    isSelected ? styles.selectedDayText : null
                  ]}
                >
                  {day}
                </Text>
                {isMarked ? <View style={styles.dayDot} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionTitle title={t("tournaments.upcoming")} />
      {monthTournaments.map((item) => (
        <Card
          key={item.name}
          style={selectedDay === item.day ? styles.selectedTournament : undefined}
        >
          <View style={styles.row}>
            <View style={styles.dateBox}>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.level}>{item.level ?? t("tournaments.openRegistration")}</Text>
              <Text style={styles.club}>{item.club ?? t("tournaments.clubTbd")}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                pressed && styles.registerButtonPressed
              ]}
              onPress={() => router.push({ pathname: "/team-register", params: { tournamentId: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={t("tournaments.registerA11y", { name: item.name })}
            >
              <Ionicons name="person-add-outline" size={16} color="#ffffff" />
              <Text style={styles.registerButtonText}>{t("tournaments.register")}</Text>
            </Pressable>
          </View>
        </Card>
      ))}
      {monthTournaments.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("tournaments.emptyTitle")}</Text>
          <Text style={styles.emptyText}>{t("tournaments.emptyText")}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  calendarCard: {
    backgroundColor: colors.background
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  calendarMonth: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900"
  },
  calendarHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  calendarActions: {
    flexDirection: "row",
    gap: 8
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  monthBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18
  },
  monthBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  weekGrid: {
    flexDirection: "row",
    marginBottom: 8
  },
  weekDay: {
    width: "14.285%",
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8
  },
  dayCell: {
    width: "14.285%",
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14
  },
  markedDay: {
    backgroundColor: colors.primarySoft
  },
  selectedDay: {
    backgroundColor: colors.primary
  },
  dayText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  markedDayText: {
    color: colors.primaryDark
  },
  selectedDayText: {
    color: "#ffffff"
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 3
  },
  selectedTournament: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceStrong
  },
  row: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center"
  },
  dateBox: {
    width: 88,
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    padding: 10
  },
  date: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  info: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  level: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4
  },
  club: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6
  },
  registerButton: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    flexShrink: 0
  },
  registerButtonPressed: {
    opacity: 0.78
  },
  registerButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  emptyCard: {
    backgroundColor: colors.background
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  }
});
