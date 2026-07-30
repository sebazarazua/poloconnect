import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
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
  normalizeAuctionImageUrlForStorage,
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

function PreviewImage({ uri, width, height, borderRadius }: { uri: string; width: number; height: number; borderRadius: number }) {
  if (Platform.OS === "web") {
    return (
      <img
        src={uri}
        alt="Preview"
        style={{
          width,
          height,
          borderRadius,
          objectFit: "contain",
          display: "block",
          background: "transparent"
        }}
      />
    );
  }

  return <Image source={{ uri }} style={{ width, height, borderRadius }} resizeMode="contain" />;
}

export default function HorseAuctionsAdminScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, isAuthenticated } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  if (Platform.OS !== "web") {
    return <Redirect href={isAuthenticated ? "/horse-auctions" : "/login"} />;
  }

  const [items, setItems] = useState<HorseAuctionAdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [address, setAddress] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  const [horseName, setHorseName] = useState("");
  const [horseImageUrl, setHorseImageUrl] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [damName, setDamName] = useState("");
  const [sireName, setSireName] = useState("");
  const [horseBreed, setHorseBreed] = useState("");
  const [horseAgeYears, setHorseAgeYears] = useState("");
  const [savingHorse, setSavingHorse] = useState(false);

  const isAdmin = (user?.roles ?? []).some((role) => role === "admin" || role === "superadmin");

  const selectedEvent = useMemo(() => items.find((item) => item.id === selectedEventId) ?? null, [items, selectedEventId]);

  const persistEventImageIfEditing = async (nextImageUrl: string) => {
    if (!selectedEventId) return;
    const parsedDate = new Date(eventDate);
    if (Number.isNaN(parsedDate.getTime())) {
      Alert.alert(t("profile.errorTitle"), t("auctions.loadError"));
      return;
    }

    await updateHorseAuctionEvent(selectedEventId, {
      slug: (slug.trim() || toSlug(title)).slice(0, 120),
      title: title.trim(),
      imageUrl: nextImageUrl,
      organizer: title.trim(),
      venue: address.trim(),
      city: address.trim(),
      country: "",
      eventDate: parsedDate.toISOString(),
      contactName: title.trim(),
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      notes: notes.trim() || null
    });
    await load();
  };

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
  }, [isAdmin, router]);

  useEffect(() => {
    if (!selectedEvent) {
      setTitle("");
      setSlug("");
      setImageUrl("");
      setAddress("");
      setEventDate(new Date().toISOString().slice(0, 16));
      setContactPhone("");
      setContactEmail("");
      setWebsiteUrl("");
      setNotes("");
      return;
    }

    setTitle(selectedEvent.title);
    setSlug(selectedEvent.slug);
    setImageUrl(selectedEvent.imageUrl ?? "");
    setAddress(selectedEvent.venue);
    setEventDate(dateToInput(selectedEvent.eventDate));
    setContactPhone(selectedEvent.contactPhone ?? "");
    setContactEmail(selectedEvent.contactEmail ?? "");
    setWebsiteUrl(selectedEvent.websiteUrl ?? "");
    setNotes(selectedEvent.notes ?? "");
  }, [selectedEvent]);

  const pickEventImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const uploaded = await uploadHorseAuctionEventImage(file);
          const nextImageUrl = normalizeAuctionImageUrlForStorage(uploaded.url) ?? "";
          setImageUrl(nextImageUrl);
          if (selectedEventId) {
            await persistEventImageIfEditing(nextImageUrl);
            Alert.alert(t("common.done"), t("auctions.adminEventSaved"));
          }
        } catch (error) {
          Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("auctions.loadError"));
        }
      };
      input.click();
      return;
    }

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
    const nextImageUrl = normalizeAuctionImageUrlForStorage(uploaded.url) ?? "";
    setImageUrl(nextImageUrl);
    if (selectedEventId) {
      try {
        await persistEventImageIfEditing(nextImageUrl);
        Alert.alert(t("common.done"), t("auctions.adminEventSaved"));
      } catch (error) {
        Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("auctions.loadError"));
      }
    }
  };

  const pickHorseImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const uploaded = await uploadHorseAuctionHorseImage(file);
          setHorseImageUrl(normalizeAuctionImageUrlForStorage(uploaded.url) ?? "");
        } catch (error) {
          Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("auctions.loadError"));
        }
      };
      input.click();
      return;
    }

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
    setHorseImageUrl(normalizeAuctionImageUrlForStorage(uploaded.url) ?? "");
  };

  const saveEvent = async () => {
    if (!title.trim() || !address.trim()) {
      Alert.alert(t("profile.errorTitle"), t("auctions.adminRequired"));
      return;
    }

    setSavingEvent(true);
    try {
      const payload = {
        slug: (slug.trim() || toSlug(title)).slice(0, 120),
        title: title.trim(),
        imageUrl: imageUrl.trim() || null,
        organizer: title.trim(),
        venue: address.trim(),
        city: address.trim(),
        country: "",
        eventDate: new Date(eventDate).toISOString(),
        contactName: title.trim(),
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

    if (!horseName.trim() || !ownerName.trim()) {
      Alert.alert(t("profile.errorTitle"), t("auctions.adminHorseRequired"));
      return;
    }

    setSavingHorse(true);
    try {
      await createHorseAuctionHorse(selectedEventId, {
        lotNumber: null,
        horseName: horseName.trim(),
        imageUrl: horseImageUrl.trim() || null,
        ownerName: ownerName.trim(),
        damName: damName.trim() || null,
        sireName: sireName.trim() || null,
        reservePriceCents: 1,
        breed: horseBreed.trim() || null,
        ageYears: horseAgeYears.trim() ? Number(horseAgeYears) : null,
        contactPhone: null,
        contactEmail: null,
        currency: "USD"
      });

      setHorseName("");
      setHorseImageUrl("");
      setOwnerName("");
      setDamName("");
      setSireName("");
      setHorseBreed("");
      setHorseAgeYears("");
      await load();
      Alert.alert(t("common.done"), t("auctions.adminHorseSaved"));
    } catch (error) {
      Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("auctions.loadError"));
    } finally {
      setSavingHorse(false);
    }
  };

  if (!isAdmin) {
    if (!isAuthenticated) {
      return <Redirect href="/admin-login" />;
    }

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
          <Text style={styles.scopeNote}>{t("auctions.adminScopeNote")}</Text>
          {imageUrl ? (
            <View style={styles.previewWrap}>
              <PreviewImage uri={resolveAuctionImageUrl(imageUrl) ?? imageUrl} width={220} height={120} borderRadius={12} />
            </View>
          ) : null}

          <Pressable style={styles.lightButton} onPress={() => void pickEventImage()}>
            <Ionicons name="images-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.lightButtonText}>{t("auctions.adminPickEventImage")}</Text>
          </Pressable>

          <LabeledInput label={t("adminPanel.titleField")} value={title} onChangeText={(value) => {
            setTitle(value);
            if (!selectedEventId) setSlug(toSlug(value));
          }} />
          <LabeledInput label="Dirección" value={address} onChangeText={setAddress} />
          <LabeledInput label={t("auctions.dateTime")} value={eventDate} onChangeText={setEventDate} placeholder="2026-11-04T18:00" />
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

            {horseImageUrl ? (
              <View style={styles.previewWrap}>
                <PreviewImage uri={resolveAuctionImageUrl(horseImageUrl) ?? horseImageUrl} width={160} height={96} borderRadius={12} />
              </View>
            ) : null}

            <Pressable style={styles.lightButton} onPress={() => void pickHorseImage()}>
              <Ionicons name="image-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.lightButtonText}>{t("auctions.adminPickHorseImage")}</Text>
            </Pressable>

            <LabeledInput label={t("auctions.horseName")} value={horseName} onChangeText={setHorseName} />
            <LabeledInput label={t("auctions.owner")} value={ownerName} onChangeText={setOwnerName} />
            <LabeledInput label={t("auctions.dam")} value={damName} onChangeText={setDamName} />
            <LabeledInput label={t("auctions.sire")} value={sireName} onChangeText={setSireName} />
            <LabeledInput label={t("auctions.breed")} value={horseBreed} onChangeText={setHorseBreed} />
            <LabeledInput label={t("auctions.age")} value={horseAgeYears} onChangeText={setHorseAgeYears} keyboardType="numeric" />

            <Pressable style={styles.primaryButton} onPress={() => void saveHorse()} disabled={savingHorse}>
              <Text style={styles.primaryButtonText}>{savingHorse ? t("common.saving") : t("auctions.adminAddHorse")}</Text>
            </Pressable>

            {selectedEvent.horses.map((horse) => (
              <View key={horse.id} style={styles.horseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.horseRowTitle}>{horse.horseName}</Text>
                  <Text style={styles.subtleText}>{horse.ownerName}</Text>
                  {horse.damName ? <Text style={styles.horseMetaText}>{t("auctions.dam")}: {horse.damName}</Text> : null}
                  {horse.sireName ? <Text style={styles.horseMetaText}>{t("auctions.sire")}: {horse.sireName}</Text> : null}
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
    scopeNote: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 10
    },
    heroImage: {
      width: 220,
      height: 120,
      borderRadius: 12,
      marginBottom: 10
    },
    previewWrap: {
      alignSelf: "flex-start",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 6,
      marginBottom: 10
    },
    horseImage: {
      width: 160,
      height: 96,
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
    },
    horseMetaText: {
      color: colors.muted,
      fontSize: 12
    }
  });
