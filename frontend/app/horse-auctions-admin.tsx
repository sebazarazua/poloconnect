import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import {
  createHorseAuctionEvent,
  createHorseAuctionHorse,
  deleteHorseAuctionEvent,
  deleteHorseAuctionHorse,
  listHorseAuctionsAdmin,
  resolveAuctionImageUrl,
  type HorseAuctionAdminEvent,
  updateHorseAuctionEvent,
  uploadHorseAuctionEventImage,
  uploadHorseAuctionHorseImage
} from "@/services/api/horse-auctions";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function dateToInput(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

export default function HorseAuctionsAdminScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  const [items, setItems] = useState<HorseAuctionAdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Argentina");
  const [eventDate, setEventDate] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  const [horseName, setHorseName] = useState("");
  const [horseImageUrl, setHorseImageUrl] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [horseBreed, setHorseBreed] = useState("");
  const [horseAgeYears, setHorseAgeYears] = useState("");
  const [horsePhone, setHorsePhone] = useState("");
  const [horseEmail, setHorseEmail] = useState("");
  const [savingHorse, setSavingHorse] = useState(false);

  const isAdmin = (user?.roles ?? []).some((role) => role === "admin" || role === "superadmin");

  const selectedEvent = useMemo(() => items.find((item) => item.id === selectedEventId) ?? null, [items, selectedEventId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listHorseAuctionsAdmin();
      setItems(data);
      if (!selectedEventId && data[0]) {
        setSelectedEventId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedEvent) {
      setTitle("");
      setSlug("");
      setImageUrl("");
      setOrganizer("");
      setVenue("");
      setCity("");
      setCountry("Argentina");
      setEventDate(new Date().toISOString().slice(0, 16));
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setWebsiteUrl("");
      setNotes("");
      return;
    }

    setTitle(selectedEvent.title);
    setSlug(selectedEvent.slug);
    setImageUrl(selectedEvent.imageUrl ?? "");
    setOrganizer(selectedEvent.organizer);
    setVenue(selectedEvent.venue);
    setCity(selectedEvent.city);
    setCountry(selectedEvent.country ?? "Argentina");
    setEventDate(dateToInput(selectedEvent.eventDate));
    setContactName(selectedEvent.contactName);
    setContactPhone(selectedEvent.contactPhone ?? "");
    setContactEmail(selectedEvent.contactEmail ?? "");
    setWebsiteUrl(selectedEvent.websiteUrl ?? "");
    setNotes(selectedEvent.notes ?? "");
  }, [selectedEvent]);

  const pickEventImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("profile.photoPermissionTitle"), t("profile.galleryPermissionText"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    const uploaded = await uploadHorseAuctionEventImage({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType
    });
    setImageUrl(uploaded.url);
  };

  const pickHorseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("profile.photoPermissionTitle"), t("profile.galleryPermissionText"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    const uploaded = await uploadHorseAuctionHorseImage({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType
    });
    setHorseImageUrl(uploaded.url);
  };

  const saveEvent = async () => {
    if (!title.trim() || !organizer.trim() || !venue.trim() || !city.trim() || !contactName.trim()) {
      Alert.alert(t("profile.errorTitle"), t("auctions.adminRequired"));
      return;
    }

    setSavingEvent(true);
    try {
      const payload = {
        slug: (slug.trim() || toSlug(title)).slice(0, 120),
        title: title.trim(),
        imageUrl: imageUrl.trim() || null,
        organizer: organizer.trim(),
        venue: venue.trim(),
        city: city.trim(),
        country: country.trim() || "Argentina",
        eventDate: new Date(eventDate).toISOString(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim() || null,
        contactEmail: contactEmail.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        notes: notes.trim() || null
      };

      if (selectedEventId) {
        await updateHorseAuctionEvent(selectedEventId, payload);
      } else {
        await createHorseAuctionEvent(payload);
      }

      await load();
      Alert.alert(t("common.done"), t("auctions.adminEventSaved"));
    } catch (error) {
      Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("auctions.loadError"));
    } finally {
      setSavingEvent(false);
    }
  };

  const removeEvent = async () => {
    if (!selectedEventId) return;

    Alert.alert(t("common.delete"), t("auctions.adminDeleteEventConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteHorseAuctionEvent(selectedEventId);
          setSelectedEventId(null);
          await load();
        }
      }
    ]);
  };

  const saveHorse = async () => {
    if (!selectedEventId) {
      Alert.alert(t("profile.errorTitle"), t("auctions.adminSelectEvent"));
      return;
    }

    if (!horseName.trim() || !ownerName.trim() || !reservePrice.trim()) {
      Alert.alert(t("profile.errorTitle"), t("auctions.adminHorseRequired"));
      return;
    }

    const reserve = Math.round(Number(reservePrice) * 100);
    if (!Number.isFinite(reserve) || reserve <= 0) {
      Alert.alert(t("profile.errorTitle"), t("auctions.adminPriceInvalid"));
      return;
    }

    setSavingHorse(true);
    try {
      await createHorseAuctionHorse(selectedEventId, {
        lotNumber: lotNumber.trim() ? Number(lotNumber) : null,
        horseName: horseName.trim(),
        imageUrl: horseImageUrl.trim() || null,
        ownerName: ownerName.trim(),
        reservePriceCents: reserve,
        breed: horseBreed.trim() || null,
        ageYears: horseAgeYears.trim() ? Number(horseAgeYears) : null,
        contactPhone: horsePhone.trim() || null,
        contactEmail: horseEmail.trim() || null,
        currency: "USD"
      });

      setHorseName("");
      setHorseImageUrl("");
      setLotNumber("");
      setOwnerName("");
      setReservePrice("");
      setHorseBreed("");
      setHorseAgeYears("");
      setHorsePhone("");
      setHorseEmail("");
      await load();
      Alert.alert(t("common.done"), t("auctions.adminHorseSaved"));
    } catch (error) {
      Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("auctions.loadError"));
    } finally {
      setSavingHorse(false);
    }
  };

  if (!isAdmin) {
    return (
      <Screen
        eyebrow={t("auctions.eyebrow")}
        title={t("adminPanel.noAccessTitle")}
        subtitle={t("adminPanel.noAccessSubtitle")}
        showBackButton
        onBackPress={() => router.back()}
      >
        <Text style={styles.subtleText}>{t("adminPanel.noAccessSubtitle")}</Text>
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow={t("auctions.eyebrow")}
      title={t("auctions.manage")}
      subtitle={t("auctions.manageSubtitle")}
      showBackButton
      onBackPress={() => router.back()}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsRow}>
          <Pressable style={[styles.eventPill, !selectedEventId && styles.eventPillActive]} onPress={() => setSelectedEventId(null)}>
            <Text style={[styles.eventPillText, !selectedEventId && styles.eventPillTextActive]}>{t("auctions.adminNewEvent")}</Text>
          </Pressable>
          {items.map((event) => (
            <Pressable
              key={event.id}
              style={[styles.eventPill, selectedEventId === event.id && styles.eventPillActive]}
              onPress={() => setSelectedEventId(event.id)}
            >
              <Text style={[styles.eventPillText, selectedEventId === event.id && styles.eventPillTextActive]} numberOfLines={1}>
                {event.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? <Text style={styles.subtleText}>{t("common.loading")}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("auctions.adminEventSection")}</Text>
          {imageUrl ? <Image source={{ uri: resolveAuctionImageUrl(imageUrl) }} style={styles.heroImage} resizeMode="cover" /> : null}

          <Pressable style={styles.lightButton} onPress={() => void pickEventImage()}>
            <Ionicons name="images-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.lightButtonText}>{t("auctions.adminPickEventImage")}</Text>
          </Pressable>

          <LabeledInput label={t("adminPanel.titleField")} value={title} onChangeText={(value) => {
            setTitle(value);
            if (!selectedEventId) setSlug(toSlug(value));
          }} />
          <LabeledInput label="Slug" value={slug} onChangeText={setSlug} autoCapitalize="none" />
          <LabeledInput label={t("auctions.organizer")} value={organizer} onChangeText={setOrganizer} />
          <LabeledInput label={t("auctions.venue")} value={venue} onChangeText={setVenue} />
          <LabeledInput label={t("auctions.city")} value={city} onChangeText={setCity} />
          <LabeledInput label={t("auctions.country")} value={country} onChangeText={setCountry} />
          <LabeledInput label={t("auctions.dateTime")} value={eventDate} onChangeText={setEventDate} placeholder="2026-11-04T18:00" />
          <LabeledInput label={t("auctions.contactSection")} value={contactName} onChangeText={setContactName} />
          <LabeledInput label={t("common.phone")} value={contactPhone} onChangeText={setContactPhone} />
          <LabeledInput label={t("common.email")} value={contactEmail} onChangeText={setContactEmail} autoCapitalize="none" />
          <LabeledInput label={t("auctions.viewWebsite")} value={websiteUrl} onChangeText={setWebsiteUrl} autoCapitalize="none" />
          <LabeledInput label={t("marketPublish.description")} value={notes} onChangeText={setNotes} multiline />

          <View style={styles.rowActions}>
            <Pressable style={styles.primaryButton} onPress={() => void saveEvent()} disabled={savingEvent}>
              <Text style={styles.primaryButtonText}>{savingEvent ? t("common.saving") : t("common.save")}</Text>
            </Pressable>
            {selectedEventId ? (
              <Pressable style={styles.dangerButton} onPress={removeEvent}>
                <Text style={styles.dangerButtonText}>{t("common.delete")}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {selectedEvent ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("auctions.adminHorseSection")}</Text>

            {horseImageUrl ? <Image source={{ uri: resolveAuctionImageUrl(horseImageUrl) }} style={styles.horseImage} resizeMode="cover" /> : null}

            <Pressable style={styles.lightButton} onPress={() => void pickHorseImage()}>
              <Ionicons name="image-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.lightButtonText}>{t("auctions.adminPickHorseImage")}</Text>
            </Pressable>

            <LabeledInput label={t("auctions.horseName")} value={horseName} onChangeText={setHorseName} />
            <LabeledInput label={t("auctions.owner")} value={ownerName} onChangeText={setOwnerName} />
            <LabeledInput label={t("auctions.lot")} value={lotNumber} onChangeText={setLotNumber} keyboardType="numeric" />
            <LabeledInput label={t("auctions.reservePriceUsd")} value={reservePrice} onChangeText={setReservePrice} keyboardType="numeric" placeholder="45000" />
            <LabeledInput label={t("auctions.breed")} value={horseBreed} onChangeText={setHorseBreed} />
            <LabeledInput label={t("auctions.age")} value={horseAgeYears} onChangeText={setHorseAgeYears} keyboardType="numeric" />
            <LabeledInput label={t("common.phone")} value={horsePhone} onChangeText={setHorsePhone} />
            <LabeledInput label={t("common.email")} value={horseEmail} onChangeText={setHorseEmail} autoCapitalize="none" />

            <Pressable style={styles.primaryButton} onPress={() => void saveHorse()} disabled={savingHorse}>
              <Text style={styles.primaryButtonText}>{savingHorse ? t("common.saving") : t("auctions.adminAddHorse")}</Text>
            </Pressable>

            {selectedEvent.horses.map((horse) => (
              <View key={horse.id} style={styles.horseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.horseRowTitle}>{horse.horseName}</Text>
                  <Text style={styles.subtleText}>{horse.ownerName}</Text>
                </View>
                <Pressable
                  onPress={async () => {
                    await deleteHorseAuctionHorse(horse.id);
                    await load();
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function LabeledInput({ label, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    subtleText: {
      color: colors.muted,
      fontSize: 13,
      marginBottom: 10
    },
    eventsRow: {
      paddingBottom: 10,
      gap: 8
    },
    eventPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 9,
      maxWidth: 220
    },
    eventPillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary
    },
    eventPillText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700"
    },
    eventPillTextActive: {
      color: colors.primaryDark
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 12
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 10
    },
    heroImage: {
      width: "100%",
      height: 170,
      borderRadius: 12,
      marginBottom: 10
    },
    horseImage: {
      width: "100%",
      height: 140,
      borderRadius: 12,
      marginBottom: 10
    },
    lightButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 7,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12
    },
    lightButtonText: {
      color: colors.primaryDark,
      fontWeight: "800",
      fontSize: 12
    },
    inputBlock: {
      marginBottom: 9
    },
    inputLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 6
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.background,
      color: colors.text,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    textArea: {
      minHeight: 82,
      textAlignVertical: "top"
    },
    rowActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 6
    },
    primaryButton: {
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingVertical: 11,
      paddingHorizontal: 14,
      alignItems: "center"
    },
    primaryButtonText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 13
    },
    dangerButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      paddingVertical: 11,
      paddingHorizontal: 14,
      alignItems: "center"
    },
    dangerButtonText: {
      color: colors.danger,
      fontWeight: "800",
      fontSize: 13
    },
    horseRow: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    horseRowTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14
    }
  });
