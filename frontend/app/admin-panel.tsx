import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { describeContentAsset, resolveContentImageSource } from "@/services/content-images";
import {
  banCommunityMember,
  createAdminContent,
  deleteAdminContent,
  type CommunityBan,
  getAdminDashboard,
  listAdminContent,
  listCommunityBans,
  listCommunityMembers,
  listCommunityRooms,
  removeCommunityMember,
  unbanCommunityMember,
  updateAdminContent,
  uploadAdminContentImage,
  type AdminContentItem
} from "@/services/api/admin";

type ContentSection = {
  section: string;
  slot: string;
  titleKey: "adminPanel.section.logoTitle" | "adminPanel.section.homeHeroTitle" | "adminPanel.section.homeCompactTitle" | "adminPanel.section.homeNewsTitle" | "adminPanel.section.communityTitle" | "adminPanel.section.liveTitle";
  subtitleKey: "adminPanel.section.logoText" | "adminPanel.section.homeHeroText" | "adminPanel.section.homeCompactText" | "adminPanel.section.homeNewsText" | "adminPanel.section.communityText" | "adminPanel.section.liveText";
};

const contentSections: ContentSection[] = [
  { section: "branding", slot: "app_logo", titleKey: "adminPanel.section.logoTitle", subtitleKey: "adminPanel.section.logoText" },
  { section: "home", slot: "hero_ads", titleKey: "adminPanel.section.homeHeroTitle", subtitleKey: "adminPanel.section.homeHeroText" },
  { section: "home", slot: "compact_ads", titleKey: "adminPanel.section.homeCompactTitle", subtitleKey: "adminPanel.section.homeCompactText" },
  { section: "home", slot: "main_news", titleKey: "adminPanel.section.homeNewsTitle", subtitleKey: "adminPanel.section.homeNewsText" },
  { section: "community", slot: "ads", titleKey: "adminPanel.section.communityTitle", subtitleKey: "adminPanel.section.communityText" },
  { section: "live", slot: "ads", titleKey: "adminPanel.section.liveTitle", subtitleKey: "adminPanel.section.liveText" }
];

const contentTypeLabelKeys: Record<AdminContentItem["type"], "adminPanel.type.logo" | "adminPanel.type.ad" | "adminPanel.type.banner" | "adminPanel.type.news" | "adminPanel.type.generic"> = {
  logo: "adminPanel.type.logo",
  ad: "adminPanel.type.ad",
  banner: "adminPanel.type.banner",
  news: "adminPanel.type.news",
  generic: "adminPanel.type.generic"
};

export default function AdminPanelScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();
  const [contentItems, setContentItems] = useState<AdminContentItem[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; title: string; kind: string }>>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ userId: string; user: { id: string; firstName: string; lastName: string; username: string } }>>([]);
  const [roomBans, setRoomBans] = useState<CommunityBan[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newSection, setNewSection] = useState("home");
  const [newSlot, setNewSlot] = useState("hero_ads");
  const [newType, setNewType] = useState<AdminContentItem["type"]>("ad");
  const [newSortOrder, setNewSortOrder] = useState("1");
  const [newPriority, setNewPriority] = useState("0");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>("home");

  const isAdmin = useMemo(() => {
    const roles = user?.roles ?? [];
    return roles.includes("admin") || roles.includes("superadmin");
  }, [user?.roles]);

  const selectedContent = useMemo(() => contentItems.find((item) => item.id === selectedContentId) ?? null, [contentItems, selectedContentId]);

  const groupedContent = useMemo(() => {
    return contentSections.filter((group) => group.section === activeSectionFilter || activeSectionFilter === "all").map((group) => ({
      ...group,
      title: t(group.titleKey),
      subtitle: t(group.subtitleKey),
      items: contentItems.filter((item) => item.section === group.section && item.slot === group.slot).sort((a, b) => a.sortOrder - b.sortOrder)
    }));
  }, [activeSectionFilter, contentItems, t]);

  const isBanActive = (ban: CommunityBan) => {
    if (ban.revokedAt) return false;
    if (ban.isPermanent) return true;
    if (!ban.expiresAt) return true;
    return new Date(ban.expiresAt).getTime() > Date.now();
  };

  const moderationRows = useMemo(() => {
    const memberRows = members.map((entry) => ({
      user: entry.user,
      isMember: true,
      activeBan: roomBans.find((ban) => ban.userId === entry.user.id && isBanActive(ban)) ?? null
    }));

    const rowsByUserId = new Map(
      memberRows.map((row) => [row.user.id, { ...row, isBanned: Boolean(row.activeBan) }])
    );

    roomBans.forEach((ban) => {
        const existing = rowsByUserId.get(ban.userId);
        if (existing) {
          const nextActiveBan = isBanActive(ban) ? ban : existing.activeBan;
          rowsByUserId.set(ban.userId, { ...existing, activeBan: nextActiveBan, isBanned: Boolean(nextActiveBan) });
          return;
        }

        const activeBan = isBanActive(ban) ? ban : null;
        rowsByUserId.set(ban.userId, {
          user: {
            id: ban.user.id,
            firstName: ban.user.firstName,
            lastName: ban.user.lastName,
            username: ban.user.username
          },
          isMember: false,
          activeBan,
          isBanned: Boolean(activeBan)
        });
      });

    return Array.from(rowsByUserId.values()).sort((a, b) => Number(b.isBanned) - Number(a.isBanned));
  }, [members, roomBans]);

  const refreshRoomModeration = async (roomId: string) => {
    const [nextMembers, nextBans] = await Promise.all([listCommunityMembers(roomId), listCommunityBans(roomId)]);
    setMembers(nextMembers);
    setRoomBans(nextBans);
  };

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/login");
      return;
    }

    void Promise.all([getAdminDashboard(), listAdminContent(), listCommunityRooms()]).then(([dashboard, items, nextRooms]) => {
      setStats(dashboard.counters);
      setContentItems(items);
      setRooms(nextRooms);
      setSelectedRoomId((current) => current ?? nextRooms[0]?.id ?? null);
      setSelectedContentId((current) => current ?? items[0]?.id ?? null);
    });
  }, [isAdmin, router]);

  useEffect(() => {
    if (!selectedRoomId) return;
    void refreshRoomModeration(selectedRoomId);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedContent) return;
    setNewTitle(selectedContent.title ?? "");
    setNewSubtitle(selectedContent.subtitle ?? "");
    setNewBody(selectedContent.body ?? "");
    setNewImageUrl(selectedContent.imageUrl ?? "");
    setNewTargetUrl(selectedContent.targetUrl ?? "");
    setNewSection(selectedContent.section);
    setNewSlot(selectedContent.slot);
    setNewType(selectedContent.type);
    setNewSortOrder(String(selectedContent.sortOrder));
    setNewPriority(String(selectedContent.priority));
  }, [selectedContent]);

  if (Platform.OS !== "web") {
    return (
      <Screen eyebrow="Admin" title={t("adminPanel.webTitle")} subtitle={t("adminPanel.webSubtitle")} showBackButton onBackPress={() => router.back()}>
        <Text style={styles.infoText}>{t("adminPanel.webText")}</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen eyebrow="Admin" title={t("adminPanel.noAccessTitle")} subtitle={t("adminPanel.noAccessSubtitle")} showBackButton onBackPress={() => router.back()}>
        <Pressable style={styles.buttonSecondary} onPress={() => router.push("/admin-login")}>
          <Text style={styles.buttonSecondaryText}>{t("adminPanel.goLogin")}</Text>
        </Pressable>
      </Screen>
    );
  }

  const saveContent = async () => {
    const payload = {
      type: newType,
      section: newSection.trim(),
      slot: newSlot.trim(),
      title: newTitle.trim() || null,
      subtitle: newSubtitle.trim() || null,
      body: newBody.trim() || null,
      imageUrl: newImageUrl.trim(),
      targetUrl: newTargetUrl.trim() || null,
      priority: Number(newPriority) || 0,
      sortOrder: Number(newSortOrder) || 0,
      isActive: true
    };

    if (selectedContent) {
      await updateAdminContent(selectedContent.id, payload);
    } else {
      await createAdminContent(payload);
    }

    const nextItems = await listAdminContent();
    setContentItems(nextItems);
    if (!selectedContentId && nextItems[0]) {
      setSelectedContentId(nextItems[0].id);
    }
  };

  return (
    <Screen eyebrow="Admin" title={t("adminPanel.title")} subtitle={t("adminPanel.subtitle")}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroEyebrow}>{t("adminPanel.heroEyebrow")}</Text>
              <Text style={styles.heroTitle}>{t("adminPanel.heroTitle")}</Text>
              <Text style={styles.heroSubtitle}>{t("adminPanel.heroSubtitle")}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={styles.heroBadgeText}>{t("adminPanel.rbac")}</Text>
            </View>
          </View>
          <View style={styles.statGrid}>
            <StatTile label={t("adminPanel.stat.users")} value={stats.users ?? 0} />
            <StatTile label={t("adminPanel.stat.content")} value={stats.contentItems ?? 0} />
            <StatTile label={t("adminPanel.stat.communities")} value={stats.rooms ?? 0} />
            <StatTile label={t("adminPanel.stat.matches")} value={stats.matches ?? 0} />
            <StatTile label={t("adminPanel.stat.tournaments")} value={stats.tournaments ?? 0} />
            <StatTile label={t("adminPanel.stat.activity")} value={(stats as any).recentActivity ?? 0} />
          </View>
        </View>

        <View style={styles.layoutTwoColumns}>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.cardTitle}>{t("adminPanel.contentLibrary")}</Text>
                <Text style={styles.cardSubtitle}>{t("adminPanel.contentLibraryText")}</Text>
              </View>
              <Pressable style={styles.smallButton} onPress={() => setSelectedContentId(null)}>
                <Text style={styles.smallButtonText}>{t("adminPanel.new")}</Text>
              </Pressable>
            </View>

            <View style={styles.filterRow}>
              {(["all", "branding", "home", "community", "live"] as const).map((section) => (
                <Pressable key={section} style={[styles.filterChip, activeSectionFilter === section && styles.filterChipActive]} onPress={() => setActiveSectionFilter(section)}>
                  <Text style={[styles.filterChipText, activeSectionFilter === section && styles.filterChipTextActive]}>{section === "all" ? t("adminPanel.all") : section}</Text>
                </Pressable>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionPillsRow}>
              {contentSections.map((group) => (
                <View key={`${group.section}-${group.slot}`} style={styles.sectionPill}>
                  <Text style={styles.sectionPillTitle}>{t(group.titleKey)}</Text>
                  <Text style={styles.sectionPillMeta}>{group.section} / {group.slot}</Text>
                  <Text style={styles.sectionPillHint}>{t(group.subtitleKey)}</Text>
                </View>
              ))}
            </ScrollView>

            <ScrollView style={styles.contentList}>
              {groupedContent.map((group) => (
                <View key={`${group.section}-${group.slot}`} style={styles.contentGroup}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <Text style={styles.groupMeta}>{group.section} · {group.slot}</Text>
                  {group.items.length === 0 ? (
                    <Text style={styles.emptyText}>{t("adminPanel.noItems")}</Text>
                  ) : (
                    group.items.map((item) => (
                      <Pressable key={item.id} style={[styles.contentRow, selectedContentId === item.id && styles.contentRowActive]} onPress={() => setSelectedContentId(item.id)}>
                        <Image source={resolveContentImageSource(item.imageUrl)} style={styles.previewThumb} resizeMode="cover" />
                        <View style={styles.contentRowBody}>
                          <View style={styles.contentRowHeader}>
                            <Text style={styles.contentRowTitle}>{item.title || item.section}</Text>
                            <Text style={styles.badge}>{t(contentTypeLabelKeys[item.type])}</Text>
                          </View>
                          <Text style={styles.contentRowMeta}>{t("adminPanel.carousel", { order: item.sortOrder })} · {t("adminPanel.priority", { priority: item.priority })} · {describeContentAsset(item.imageUrl)}</Text>
                          <Text numberOfLines={1} style={styles.contentRowPath}>{item.imageUrl}</Text>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.cardTitle}>{selectedContent ? t("adminPanel.editContent") : t("adminPanel.createContent")}</Text>
                <Text style={styles.cardSubtitle}>{t("adminPanel.contentFormText")}</Text>
              </View>
            </View>

            <View style={styles.previewCard}>
              <Image source={resolveContentImageSource(newImageUrl || selectedContent?.imageUrl || "asset:home/hero-1")} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.previewCopy}>
                <Text style={styles.previewLabel}>{t(contentTypeLabelKeys[newType])}</Text>
                <Text style={styles.previewTitle}>{newTitle || selectedContent?.title || t("adminPanel.noTitle")}</Text>
                <Text style={styles.previewMeta}>{newSection} · {newSlot} · #{newSortOrder}</Text>
                <Text style={styles.previewHint}>{describeContentAsset(newImageUrl || selectedContent?.imageUrl || "asset:home/hero-1")}</Text>
              </View>
            </View>

            <View style={styles.formGrid}>
              <LabeledInput label={t("adminPanel.section")} value={newSection} onChangeText={setNewSection} placeholder="home" />
              <LabeledInput label={t("adminPanel.slot")} value={newSlot} onChangeText={setNewSlot} placeholder="hero_ads" />
              <LabeledInput label={t("adminPanel.type")} value={newType} onChangeText={(value) => setNewType(value as AdminContentItem["type"])} placeholder="ad" />
              <LabeledInput label={t("adminPanel.order")} value={newSortOrder} onChangeText={setNewSortOrder} placeholder="1" keyboardType="numeric" />
              <LabeledInput label={t("adminPanel.priorityLabel")} value={newPriority} onChangeText={setNewPriority} placeholder="0" keyboardType="numeric" />
              <LabeledInput label={t("adminPanel.titleField")} value={newTitle} onChangeText={setNewTitle} placeholder={t("adminPanel.visibleTitle")} />
              <LabeledInput label={t("adminPanel.subtitleField")} value={newSubtitle} onChangeText={setNewSubtitle} placeholder={t("adminPanel.subtitleField")} />
              <LabeledInput label={t("adminPanel.targetLink")} value={newTargetUrl} onChangeText={setNewTargetUrl} placeholder="https://..." />
              <View style={styles.fullWidthField}>
                <Text style={styles.inputLabel}>{t("adminPanel.body")}</Text>
                <TextInput style={[styles.textInput, styles.textArea]} value={newBody} onChangeText={setNewBody} placeholder={t("adminPanel.bodyPlaceholder")} placeholderTextColor={colors.muted} multiline />
              </View>
              <View style={styles.fullWidthField}>
                <Text style={styles.inputLabel}>{t("adminPanel.image")}</Text>
                <TextInput style={styles.textInput} value={newImageUrl} onChangeText={setNewImageUrl} placeholder={t("adminPanel.imagePlaceholder")} placeholderTextColor={colors.muted} autoCapitalize="none" />
                <Text style={styles.helperText}>{t("adminPanel.imageHelp")}</Text>
              </View>
            </View>

            <View style={styles.uploadBox}>
              <View style={styles.uploadHeaderRow}>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.primaryDark} />
                <View style={styles.uploadCopyBlock}>
                  <Text style={styles.uploadTitle}>{t("adminPanel.uploadTitle")}</Text>
                  <Text style={styles.uploadText}>{t("adminPanel.uploadText")}</Text>
                </View>
                <Pressable style={styles.smallButton} onPress={() => document.getElementById("admin-upload-input")?.click()}>
                  <Text style={styles.smallButtonText}>{uploading ? t("adminPanel.uploading") : t("adminPanel.chooseFile")}</Text>
                </Pressable>
              </View>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                id="admin-upload-input"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const uploaded = await uploadAdminContentImage(file);
                    setNewImageUrl(uploaded.url);
                    Alert.alert(t("adminPanel.imageUploaded"), uploaded.filename);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </View>

            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>{t("adminPanel.assetShortcut")}</Text>
              <View style={styles.assetGrid}>
                {[
                  "asset:app/logo",
                  "asset:home/hero-1",
                  "asset:home/hero-2",
                  "asset:home/hero-3",
                  "asset:home/compact-1",
                  "asset:home/compact-2",
                  "asset:home/compact-3",
                  "asset:community/slide-1",
                  "asset:community/slide-2",
                  "asset:community/slide-3",
                  "asset:live/slide-1",
                  "asset:live/slide-2",
                  "asset:live/slide-3"
                ].map((assetKey) => (
                  <Pressable key={assetKey} style={styles.assetChip} onPress={() => setNewImageUrl(assetKey)}>
                    <Text style={styles.assetChipText}>{assetKey.replace("asset:", "")}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.buttonPrimary} onPress={async () => {
                await saveContent();
                const nextItems = await listAdminContent();
                setContentItems(nextItems);
              }}>
                <Text style={styles.buttonPrimaryText}>{selectedContent ? t("adminPanel.saveChanges") : t("adminPanel.createItem")}</Text>
              </Pressable>
              {selectedContent ? (
                <Pressable style={styles.buttonDanger} onPress={async () => {
                  await deleteAdminContent(selectedContent.id);
                  const nextItems = await listAdminContent();
                  setContentItems(nextItems);
                  setSelectedContentId(nextItems[0]?.id ?? null);
                }}>
                  <Text style={styles.buttonDangerText}>{t("adminPanel.delete")}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.cardTitle}>{t("adminPanel.moderation")}</Text>
              <Text style={styles.cardSubtitle}>{t("adminPanel.moderationText")}</Text>
            </View>
          </View>

          <View style={styles.roomRow}>
            {rooms.map((room) => (
              <Pressable key={room.id} style={[styles.roomChip, selectedRoomId === room.id && styles.roomChipActive]} onPress={() => setSelectedRoomId(room.id)}>
                <Text style={[styles.roomChipText, selectedRoomId === room.id && styles.roomChipTextActive]}>{room.title}</Text>
                <Text style={[styles.roomChipMeta, selectedRoomId === room.id && styles.roomChipTextActive]}>{room.kind}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.memberGrid}>
            {moderationRows.map((entry) => (
              <View key={entry.user.id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{entry.user.firstName.charAt(0)}{entry.user.lastName.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{entry.user.firstName} {entry.user.lastName}</Text>
                  <Text style={styles.memberMeta}>@{entry.user.username}</Text>
                  <View style={styles.memberStatusRow}>
                    <Text style={[styles.memberStatusChip, entry.isBanned ? styles.memberStatusBanned : styles.memberStatusActive]}>{entry.isBanned ? t("adminPanel.banned") : t("adminPanel.active")}</Text>
                    <Text style={[styles.memberStatusChip, entry.isMember ? styles.memberStatusActive : styles.memberStatusMuted]}>{entry.isMember ? t("adminPanel.inRoom") : t("adminPanel.outRoom")}</Text>
                  </View>
                  <Text style={styles.memberMetaSmall}>ID {entry.user.id}</Text>
                </View>
                <View style={styles.memberActions}>
                  <Pressable
                    style={[styles.actionButton, entry.isBanned && styles.actionButtonDisabled]}
                    disabled={entry.isBanned}
                    onPress={async () => {
                      if (!selectedRoomId) return;
                      await banCommunityMember(selectedRoomId, entry.user.id, t("adminPanel.banReason"));
                      await refreshRoomModeration(selectedRoomId);
                    }}
                  >
                    <Text style={styles.actionButtonDanger}>{t("adminPanel.ban")}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, !entry.isMember && styles.actionButtonDisabled]}
                    disabled={!entry.isMember}
                    onPress={async () => {
                      if (!selectedRoomId) return;
                      await removeCommunityMember(selectedRoomId, entry.user.id, t("adminPanel.removeReason"));
                      await refreshRoomModeration(selectedRoomId);
                    }}
                  >
                    <Text style={styles.actionButtonPrimary}>{t("adminPanel.remove")}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, !entry.isBanned && styles.actionButtonDisabled]}
                    disabled={!entry.isBanned}
                    onPress={async () => {
                      if (!selectedRoomId) return;
                      await unbanCommunityMember(selectedRoomId, entry.user.id, t("adminPanel.unbanReason"));
                      await refreshRoomModeration(selectedRoomId);
                    }}
                  >
                    <Text style={styles.actionButtonPrimary}>{t("adminPanel.unban")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={stylesForTile.tile}>
      <Text style={stylesForTile.label}>{label}</Text>
      <Text style={stylesForTile.value}>{value}</Text>
    </View>
  );
}

function LabeledInput({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.fullWidthField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={styles.textInput} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

const stylesForTile = StyleSheet.create({
  tile: {
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(19, 67, 112, 0.08)"
  },
  label: {
    color: "#5b6b7f",
    fontSize: 12,
    fontWeight: "700"
  },
  value: {
    color: "#12324d",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6
  }
});

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      gap: 18,
      paddingBottom: 28
    },
    infoText: {
      color: colors.muted,
      fontSize: 14
    },
    heroCard: {
      borderRadius: 28,
      padding: 18,
      backgroundColor: "#eaf4ff",
      borderWidth: 1,
      borderColor: "rgba(18,50,77,0.08)",
      gap: 16
    },
    heroHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 14
    },
    heroEyebrow: {
      color: "#54708b",
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.8
    },
    heroTitle: {
      color: "#12324d",
      fontSize: 26,
      fontWeight: "900",
      marginTop: 4
    },
    heroSubtitle: {
      color: "#456078",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
      maxWidth: 560
    },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.primary
    },
    heroBadgeText: {
      color: "#fff",
      fontWeight: "800"
    },
    statGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12
    },
    layoutTwoColumns: {
      flexDirection: "row",
      gap: 16,
      alignItems: "flex-start"
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    filterChip: {
      minHeight: 34,
      borderRadius: 999,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: "#d7e4f2",
      backgroundColor: "#f7fbff",
      justifyContent: "center"
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    filterChipText: {
      color: "#33516e",
      fontWeight: "800",
      fontSize: 12,
      textTransform: "capitalize"
    },
    filterChipTextActive: {
      color: "#fff"
    },
    card: {
      flex: 1,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "rgba(18,50,77,0.08)",
      backgroundColor: "#ffffff",
      padding: 16,
      gap: 14,
      shadowColor: "#0f2540",
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 }
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12
    },
    cardTitle: {
      color: "#14354f",
      fontSize: 18,
      fontWeight: "900"
    },
    cardSubtitle: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4
    },
    smallButton: {
      paddingHorizontal: 12,
      minHeight: 36,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center"
    },
    smallButtonText: {
      color: "#fff",
      fontWeight: "800"
    },
    sectionPillsRow: {
      gap: 10,
      paddingVertical: 4
    },
    sectionPill: {
      width: 190,
      padding: 14,
      borderRadius: 18,
      backgroundColor: "#f5f9fd",
      borderWidth: 1,
      borderColor: "#e2edf8"
    },
    sectionPillTitle: {
      color: "#153958",
      fontWeight: "900",
      fontSize: 14
    },
    sectionPillMeta: {
      color: colors.primary,
      fontWeight: "800",
      fontSize: 12,
      marginTop: 6
    },
    sectionPillHint: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 6
    },
    contentList: {
      maxHeight: 520
    },
    contentGroup: {
      gap: 10,
      marginBottom: 14
    },
    groupTitle: {
      color: "#153958",
      fontSize: 15,
      fontWeight: "900"
    },
    groupMeta: {
      color: colors.primaryDark,
      fontSize: 12,
      fontWeight: "800"
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      paddingVertical: 8
    },
    contentRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      padding: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#e6eef7",
      backgroundColor: "#fbfdff"
    },
    contentRowActive: {
      borderColor: colors.primary,
      backgroundColor: "#eef6ff"
    },
    previewThumb: {
      width: 72,
      height: 58,
      borderRadius: 12,
      backgroundColor: colors.surfaceStrong
    },
    contentRowBody: {
      flex: 1,
      gap: 4
    },
    contentRowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10
    },
    contentRowTitle: {
      color: "#13334f",
      fontWeight: "900",
      flex: 1
    },
    badge: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "900",
      backgroundColor: "#e8f3ff",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999
    },
    contentRowMeta: {
      color: colors.muted,
      fontSize: 12
    },
    contentRowPath: {
      color: "#6b7d90",
      fontSize: 11
    },
    previewCard: {
      flexDirection: "row",
      gap: 14,
      padding: 14,
      borderRadius: 20,
      backgroundColor: "#f6fbff",
      borderWidth: 1,
      borderColor: "#dfeaf6"
    },
    previewImage: {
      width: 150,
      height: 110,
      borderRadius: 18,
      backgroundColor: colors.surfaceStrong
    },
    previewCopy: {
      flex: 1,
      justifyContent: "center",
      gap: 6
    },
    previewLabel: {
      color: colors.primary,
      fontWeight: "900",
      fontSize: 12,
      textTransform: "uppercase"
    },
    previewTitle: {
      color: "#163651",
      fontSize: 18,
      fontWeight: "900"
    },
    previewMeta: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    previewHint: {
      color: "#5f7288",
      fontSize: 12
    },
    formGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12
    },
    fullWidthField: {
      width: "100%",
      gap: 8
    },
    assetGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    assetChip: {
      borderRadius: 999,
      paddingHorizontal: 10,
      minHeight: 32,
      justifyContent: "center",
      backgroundColor: "#eef6ff",
      borderWidth: 1,
      borderColor: "#d2e4f6"
    },
    assetChipText: {
      color: "#2f5577",
      fontWeight: "800",
      fontSize: 11
    },
    inputLabel: {
      color: "#173754",
      fontWeight: "800",
      fontSize: 13
    },
    textInput: {
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#d8e5f1",
      backgroundColor: "#fff",
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12
    },
    textArea: {
      minHeight: 96,
      textAlignVertical: "top"
    },
    helperText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18
    },
    uploadBox: {
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: "#fff8ef",
      borderWidth: 1,
      borderColor: "#f6dfbe"
    },
    uploadHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      width: "100%"
    },
    uploadCopyBlock: {
      flex: 1,
      minWidth: 220
    },
    uploadTitle: {
      color: "#8b5d11",
      fontWeight: "900"
    },
    uploadText: {
      color: "#8a6e43",
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4
    },
    actionRow: {
      flexDirection: "row",
      gap: 12,
      flexWrap: "wrap"
    },
    buttonPrimary: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16
    },
    buttonPrimaryText: {
      color: "#fff",
      fontWeight: "900"
    },
    buttonDanger: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: colors.dangerSoft,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: "#ffd0c9"
    },
    buttonDangerText: {
      color: colors.danger,
      fontWeight: "900"
    },
    buttonSecondary: {
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16
    },
    buttonSecondaryText: {
      color: colors.text,
      fontWeight: "800"
    },
    roomRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    roomChip: {
      minWidth: 180,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#d9e6f3",
      backgroundColor: "#f8fbfe",
      padding: 14,
      gap: 6
    },
    roomChipActive: {
      backgroundColor: "#eef6ff",
      borderColor: colors.primary
    },
    roomChipText: {
      color: "#153651",
      fontWeight: "900"
    },
    roomChipTextActive: {
      color: colors.primary
    },
    roomChipMeta: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    memberGrid: {
      gap: 10
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: "#f8fbfe",
      borderWidth: 1,
      borderColor: "#dde9f4"
    },
    memberAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary
    },
    memberAvatarText: {
      color: "#fff",
      fontWeight: "900"
    },
    memberName: {
      color: "#14354f",
      fontWeight: "900"
    },
    memberMeta: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2
    },
    memberMetaSmall: {
      color: colors.primaryDark,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 2
    },
    memberStatusRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 6,
      flexWrap: "wrap"
    },
    memberStatusChip: {
      fontSize: 11,
      fontWeight: "900",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    memberStatusActive: {
      color: "#1f6b35",
      backgroundColor: "#e6f7eb"
    },
    memberStatusBanned: {
      color: colors.danger,
      backgroundColor: "#ffe9e6"
    },
    memberStatusMuted: {
      color: "#5b6b7f",
      backgroundColor: "#edf2f8"
    },
    memberActions: {
      flexDirection: "row",
      gap: 8
    },
    actionButton: {
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#dbe6f3",
      justifyContent: "center",
      alignItems: "center"
    },
    actionButtonDisabled: {
      opacity: 0.45
    },
    actionButtonDanger: {
      color: colors.danger,
      fontWeight: "900"
    },
    actionButtonPrimary: {
      color: colors.primary,
      fontWeight: "900"
    }
  });
