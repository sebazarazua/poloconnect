import { Ionicons } from "@expo/vector-icons";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppColors, useThemeColors } from "@/constants/theme";
import type { AdminTimeZoneOption } from "@/utils/argentinaTime";

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

type AdminDateTimeFieldProps = {
  label: string;
  date: string;
  onDateChange: (value: string) => void;
  time?: string;
  onTimeChange?: (value: string) => void;
  timezone?: string;
  onTimezoneChange?: (value: string) => void;
  timezoneOptions?: AdminTimeZoneOption[];
  required?: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateString(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseDateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const now = new Date();

  if (!match) {
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3])
  };
}

export function AdminDateTimeField({
  label,
  date,
  onDateChange,
  time,
  onTimeChange,
  timezone,
  onTimezoneChange,
  timezoneOptions = [],
  required
}: AdminDateTimeFieldProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const initial = parseDateParts(date);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [viewYear, setViewYear] = useState(initial.year);
  const selected = parseDateParts(date);
  const years = useMemo(() => Array.from({ length: 17 }, (_, index) => viewYear - 8 + index), [viewYear]);

  const days = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstWeekDay = new Date(viewYear, viewMonth, 1).getDay();
    const mondayFirstOffset = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

    return [
      ...Array.from({ length: mondayFirstOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
    ];
  }, [viewMonth, viewYear]);

  const shiftMonth = (direction: -1 | 1) => {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectDay = (day: number) => {
    onDateChange(dateString(viewYear, viewMonth, day));
    setOpen(false);
  };

  const selectedLabel = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })
    : "Seleccionar fecha";

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? " *" : ""}</Text>
      <Pressable style={styles.dateButton} onPress={() => setOpen((current) => !current)}>
        <Ionicons name="calendar-outline" size={16} color={colors.primaryDark} />
        <Text style={[styles.dateButtonText, !date && styles.placeholder]}>{selectedLabel}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
      </Pressable>

      {open ? (
        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeader}>
            <Pressable style={styles.iconButton} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
            </Pressable>
            <View style={styles.selectRow}>
              {Platform.OS === "web" ? (
                <>
                  <select
                    value={viewMonth}
                    onChange={(event) => setViewMonth(Number(event.currentTarget.value))}
                    style={webSelectStyle(colors)}
                  >
                    {monthNames.map((month, index) => (
                      <option key={month} value={index}>{month}</option>
                    ))}
                  </select>
                  <select
                    value={viewYear}
                    onChange={(event) => setViewYear(Number(event.currentTarget.value))}
                    style={webSelectStyle(colors)}
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </>
              ) : (
                <Text style={styles.monthTitle}>{monthNames[viewMonth]} {viewYear}</Text>
              )}
            </View>
            <Pressable style={styles.iconButton} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day) => (
              <Text key={day} style={styles.weekDay}>{day}</Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
              const isSelected = selected.year === viewYear && selected.month === viewMonth && selected.day === day && Boolean(date);

              return (
                <Pressable key={day} style={[styles.dayCell, isSelected && styles.dayCellActive]} onPress={() => selectDay(day)}>
                  <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {onTimeChange ? (
        <View style={styles.timeRow}>
          <Text style={styles.smallLabel}>Hora</Text>
          {Platform.OS === "web" ? (
            <input
              type="time"
              value={time ?? ""}
              onChange={(event) => onTimeChange(event.currentTarget.value)}
              style={webInputStyle(colors)}
            />
          ) : null}
        </View>
      ) : null}

      {timezone && onTimezoneChange ? (
        <View style={styles.timeRow}>
          <Text style={styles.smallLabel}>Zona horaria</Text>
          {Platform.OS === "web" ? (
            <select value={timezone} onChange={(event) => onTimezoneChange(event.currentTarget.value)} style={webInputStyle(colors)}>
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <Text style={styles.timezoneText}>{timezoneOptions.find((option) => option.value === timezone)?.label ?? timezone}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function webSelectStyle(colors: AppColors): CSSProperties {
  return {
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    background: colors.background,
    color: colors.text,
    fontSize: 13,
    fontWeight: 700,
    padding: "8px 10px",
    minWidth: 116
  };
}

function webInputStyle(colors: AppColors): CSSProperties {
  return {
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    background: colors.background,
    color: colors.text,
    fontSize: 13,
    fontWeight: 700,
    padding: "9px 10px",
    minHeight: 38,
    flex: 1
  };
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  field: {
    width: "100%",
    gap: 8,
    marginBottom: 9
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  dateButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  dateButtonText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  placeholder: {
    color: colors.muted
  },
  calendarPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 10
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  selectRow: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center"
  },
  monthTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  weekRow: {
    flexDirection: "row"
  },
  weekDay: {
    width: "14.285%",
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center"
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4
  },
  dayCell: {
    width: "14.285%",
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10
  },
  dayCellActive: {
    backgroundColor: colors.primary
  },
  dayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  dayTextActive: {
    color: "#ffffff"
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  smallLabel: {
    width: 92,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  timezoneText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  }
});
