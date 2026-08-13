import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { resolveContentImageSource } from "@/services/content-images";
import { buildShopTarget, parseContentTarget } from "@/services/content-targets";
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
  createAdminTournament,
  listAdminTournaments,
  unbanCommunityMember,
  updateAdminContent,
  uploadAdminContentImage,
  type AdminContentItem,
  type AdminTournament
} from "@/services/api/admin";
import {
  type Brand,
  type BrandProduct,
  adminListBrands,
  adminCreateBrand,
  adminUpdateBrand,
  adminDeleteBrand,
  adminListBrandProducts,
  adminCreateBrandProduct,
  adminUpdateBrandProduct,
  adminDeleteBrandProduct,
  uploadBrandImage
} from "@/services/api/brands";

type Tab = "dashboard" | "content" | "community" | "brands" | "auctions" | "tournaments";

const contentSections = [
  { section: "branding", slot: "app_logo", titleKey: "adminPanel.section.logoTitle" as const, subtitleKey: "adminPanel.section.logoText" as const },
  { section: "home", slot: "hero_ads", titleKey: "adminPanel.section.homeHeroTitle" as const, subtitleKey: "adminPanel.section.homeHeroText" as const },
  { section: "home", slot: "compact_ads", titleKey: "adminPanel.section.homeCompactTitle" as const, subtitleKey: "adminPanel.section.homeCompactText" as const },
  { section: "home", slot: "main_news", titleKey: "adminPanel.section.homeNewsTitle" as const, subtitleKey: "adminPanel.section.homeNewsText" as const },
  { section: "community", slot: "ads", titleKey: "adminPanel.section.communityTitle" as const, subtitleKey: "adminPanel.section.communityText" as const },
  { section: "live", slot: "ads", titleKey: "adminPanel.section.liveTitle" as const, subtitleKey: "adminPanel.section.liveText" as const }
];

const contentTypeLabelKeys: Record<AdminContentItem["type"], "adminPanel.type.logo" | "adminPanel.type.ad" | "adminPanel.type.banner" | "adminPanel.type.news" | "adminPanel.type.generic"> = {
  logo: "adminPanel.type.logo",
  ad: "adminPanel.type.ad",
  banner: "adminPanel.type.banner",
  news: "adminPanel.type.news",
  generic: "adminPanel.type.generic"
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferType(section: string, slot: string): AdminContentItem["type"] {
  if (section === "branding" && slot === "app_logo") return "logo";
  if (section === "home" && slot === "main_news") return "news";
  return "ad";
}

const brandLogoCropPreviewSize = 220;
const brandLogoCropOutputSize = 512;
const brandLogoOffsetLimit = 90;

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

async function cropBrandLogoToBlob(params: {
  source: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  mimeType?: string;
}) {
  const { source, zoom, offsetX, offsetY, mimeType = "image/png" } = params;

  return new Promise<Blob>((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = brandLogoCropOutputSize;
      canvas.height = brandLogoCropOutputSize;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("No se pudo preparar el editor de imagen."));
        return;
      }

      const coverScale = Math.max(
        brandLogoCropOutputSize / image.naturalWidth,
        brandLogoCropOutputSize / image.naturalHeight
      );

      const drawWidth = image.naturalWidth * coverScale * zoom;
      const drawHeight = image.naturalHeight * coverScale * zoom;
      const scaleFactor = brandLogoCropOutputSize / brandLogoCropPreviewSize;
      const drawX = (brandLogoCropOutputSize - drawWidth) / 2 + offsetX * scaleFactor;
      const drawY = (brandLogoCropOutputSize - drawHeight) / 2 + offsetY * scaleFactor;

      context.clearRect(0, 0, brandLogoCropOutputSize, brandLogoCropOutputSize);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("No se pudo exportar la imagen."));
          return;
        }

        resolve(blob);
      }, mimeType, 0.92);
    };
    image.onerror = () => reject(new Error("No se pudo cargar la imagen seleccionada."));
    image.src = source;
  });
}

export default function AdminPanelScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLocale();

  if (Platform.OS !== "web") {
    return <Redirect href={isAuthenticated ? "/(tabs)" : "/login"} />;
  }

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Record<string, number>>({});

  // Content state
  const [contentItems, setContentItems] = useState<AdminContentItem[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>("home");
  const [newTitle, setNewTitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newSection, setNewSection] = useState("home");
  const [newSlot, setNewSlot] = useState("hero_ads");
  const [newType, setNewType] = useState<AdminContentItem["type"]>("ad");
  const [newSortOrder, setNewSortOrder] = useState("1");
  const [newPriority, setNewPriority] = useState("0");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [selectedShopTargetId, setSelectedShopTargetId] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [uploading, setUploading] = useState(false);

  // Community state
  const [rooms, setRooms] = useState<Array<{ id: string; title: string; kind: string }>>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ userId: string; user: { id: string; firstName: string; lastName: string; username: string } }>>([]);
  const [roomBans, setRoomBans] = useState<CommunityBan[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");

  // Brands state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brandProducts, setBrandProducts] = useState<BrandProduct[]>([]);
  const [brandForm, setBrandForm] = useState({ name: "", slug: "", description: "", whatsapp: "", phone: "", email: "", website: "", logoUrl: "" });
  const [bpForm, setBpForm] = useState({ name: "", description: "", price: "", imageUrl: "" });
  const [selectedBpId, setSelectedBpId] = useState<string | null>(null);
  const [bpUploading, setBpUploading] = useState(false);
  const [brandLogoDraftUrl, setBrandLogoDraftUrl] = useState<string | null>(null);
  const [brandLogoDraftName, setBrandLogoDraftName] = useState("brand-logo.png");
  const [brandLogoZoom, setBrandLogoZoom] = useState(1);
  const [brandLogoOffsetX, setBrandLogoOffsetX] = useState(0);
  const [brandLogoOffsetY, setBrandLogoOffsetY] = useState(0);
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const brandLogoInputRef = useRef<any>(null);
  const bpImageInputRef = useRef<any>(null);

  // Tournaments state
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [tournamentSaving, setTournamentSaving] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({
    name: "",
    slug: "",
    clubId: "",
    startDate: "",
    endDate: "",
    levelLabel: "",
    minHandicap: "",
    maxHandicap: "",
    maxTeams: "",
    contactName: "",
    contactPhone: "",
    registrationStatus: "open",
    status: "scheduled"
  });

  const isAdmin = useMemo(() => {
    const roles = user?.roles ?? [];
    return roles.includes("admin") || roles.includes("superadmin");
  }, [user?.roles]);

  const selectedContent = useMemo(() => contentItems.find((i) => i.id === selectedContentId) ?? null, [contentItems, selectedContentId]);

  const activeContentTemplate = useMemo(() => {
    if (selectedContent) {
      return { section: selectedContent.section, slot: selectedContent.slot, type: selectedContent.type };
    }

    const preferredGroup = activeSectionFilter === "all"
      ? contentSections[0]
      : contentSections.find((group) => group.section === activeSectionFilter) ?? contentSections[0];

    return {
      section: preferredGroup.section,
      slot: preferredGroup.slot,
      type: inferType(preferredGroup.section, preferredGroup.slot)
    };
  }, [activeSectionFilter, selectedContent]);

  const groupedContent = useMemo(() => {
    return contentSections
      .filter((g) => g.section === activeSectionFilter || activeSectionFilter === "all")
      .map((g) => ({
        ...g,
        title: t(g.titleKey),
        items: contentItems.filter((i) => i.section === g.section && i.slot === g.slot).sort((a, b) => a.sortOrder - b.sortOrder)
      }));
  }, [activeSectionFilter, contentItems, t]);

  const isBanActive = (ban: CommunityBan) => {
    if (ban.revokedAt) return false;
    if (ban.isPermanent) return true;
    return ban.expiresAt ? new Date(ban.expiresAt).getTime() > Date.now() : true;
  };

  const moderationRows = useMemo(() => {
    const byId = new Map(members.map((m) => [m.user.id, { user: m.user, isMember: true, activeBan: roomBans.find((b) => b.userId === m.user.id && isBanActive(b)) ?? null }]));
    roomBans.forEach((ban) => {
      const existing = byId.get(ban.userId);
      const activeBan = isBanActive(ban) ? ban : null;
      if (existing) { byId.set(ban.userId, { ...existing, activeBan: activeBan ?? existing.activeBan }); }
      else { byId.set(ban.userId, { user: { id: ban.user.id, firstName: ban.user.firstName, lastName: ban.user.lastName, username: ban.user.username }, isMember: false, activeBan }); }
    });
    return Array.from(byId.values()).map((r) => ({ ...r, isBanned: Boolean(r.activeBan) })).sort((a, b) => Number(b.isBanned) - Number(a.isBanned));
  }, [members, roomBans]);

  const filteredModerationRows = useMemo(() => {
    const query = communitySearch.trim().toLowerCase();
    if (!query) return moderationRows;
    return moderationRows.filter((entry) => {
      const fullName = `${entry.user.firstName} ${entry.user.lastName}`.toLowerCase();
      return fullName.includes(query) || entry.user.username.toLowerCase().includes(query) || entry.user.id.toLowerCase().includes(query);
    });
  }, [communitySearch, moderationRows]);

  const refreshRoomModeration = async (roomId: string) => {
    const [m, b] = await Promise.all([listCommunityMembers(roomId), listCommunityBans(roomId)]);
    setMembers(m);
    setRoomBans(b);
  };

  const resetBrandLogoEditor = () => {
    setBrandLogoDraftUrl(null);
    setBrandLogoDraftName("brand-logo.png");
    setBrandLogoZoom(1);
    setBrandLogoOffsetX(0);
    setBrandLogoOffsetY(0);
    if (brandLogoInputRef.current) {
      brandLogoInputRef.current.value = "";
    }
  };

  const prepareBrandLogo = async (file?: File | null) => {
    if (!file) return;

    try {
      const previewUrl = await readFileAsDataUrl(file);
      setBrandLogoDraftUrl(previewUrl);
      setBrandLogoDraftName(file.name || "brand-logo.png");
      setBrandLogoZoom(1);
      setBrandLogoOffsetX(0);
      setBrandLogoOffsetY(0);
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "No se pudo preparar la imagen.");
    }
  };

  const uploadPreparedBrandLogo = async () => {
    if (!brandLogoDraftUrl) {
      return;
    }

    try {
      setBrandLogoUploading(true);
      const blob = await cropBrandLogoToBlob({
        source: brandLogoDraftUrl,
        zoom: brandLogoZoom,
        offsetX: brandLogoOffsetX,
        offsetY: brandLogoOffsetY
      });
      const safeName = brandLogoDraftName.replace(/\.[^.]+$/, "") || "brand-logo";
      const file = new File([blob], `${safeName}.png`, { type: "image/png" });
      const uploadedUrl = await uploadBrandImage(file);
      setBrandForm((current) => ({ ...current, logoUrl: uploadedUrl }));
      resetBrandLogoEditor();
      Alert.alert("Listo", "Logo subido y guardado localmente.");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "No se pudo subir el logo.");
    } finally {
      setBrandLogoUploading(false);
    }
  };

  const uploadBrandProductImage = async (file?: File | null) => {
    if (!file) {
      return;
    }

    try {
      setBpUploading(true);
      const uploadedUrl = await uploadBrandImage(file);
      setBpForm((current) => ({ ...current, imageUrl: uploadedUrl }));
      Alert.alert("Listo", "Imagen de producto subida.");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "No se pudo subir la imagen del producto.");
    } finally {
      setBpUploading(false);
      if (bpImageInputRef.current) {
        bpImageInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (!isAdmin) { return; }
    void Promise.all([getAdminDashboard(), listAdminContent(), listCommunityRooms()]).then(([dash, items, nextRooms]) => {
      setStats(dash.counters);
      setContentItems(items);
      setRooms(nextRooms);
      setSelectedRoomId((c) => c ?? nextRooms[0]?.id ?? null);
      setSelectedContentId((c) => c ?? items[0]?.id ?? null);
    });
    void adminListBrands().then(setBrands).catch(() => {});
    void listAdminTournaments().then(setTournaments).catch(() => {});
  }, [isAdmin, router]);

  useEffect(() => { if (selectedRoomId) void refreshRoomModeration(selectedRoomId); }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedContent) {
      setNewTitle("");
      setNewSubtitle("");
      setNewBody("");
      setNewImageUrl("");
      setNewTargetUrl("");
      setSelectedShopTargetId("");
      return;
    }

    const parsedTarget = parseContentTarget(selectedContent.targetUrl ?? "");

    setNewTitle(selectedContent.title ?? "");
    setNewSubtitle(selectedContent.subtitle ?? "");
    setNewBody(selectedContent.body ?? "");
    setNewImageUrl(selectedContent.imageUrl ?? "");
    setNewTargetUrl(parsedTarget.kind === "external" ? parsedTarget.url : "");
    setSelectedShopTargetId(parsedTarget.kind === "shop" ? parsedTarget.brandId : "");
    setNewSection(selectedContent.section);
    setNewSlot(selectedContent.slot);
    setNewType(selectedContent.type);
    setNewSortOrder(String(selectedContent.sortOrder));
    setNewPriority(String(selectedContent.priority));
  }, [selectedContent]);

  if (!isAuthenticated) {
    return <Redirect href="/admin-login" />;
  }

  if (!isAdmin) {
    return (
      <Screen eyebrow="Admin" title={t("adminPanel.noAccessTitle")} subtitle={t("adminPanel.noAccessSubtitle")} showBackButton onBackPress={() => router.back()}>
        <Pressable style={styles.btnSecondary} onPress={() => router.push("/admin-login")}>
          <Text style={styles.btnSecondaryText}>{t("adminPanel.goLogin")}</Text>
        </Pressable>
      </Screen>
    );
  }

  const saveContent = async () => {
    const externalTargetUrl = newTargetUrl.trim();
    const shopTargetId = selectedShopTargetId.trim();

    if (externalTargetUrl && shopTargetId) {
      Alert.alert("Error", "Elegí solo un destino: URL externa o shop interno.");
      return;
    }

    const payload = {
      type: selectedContent?.type ?? activeContentTemplate.type,
      section: selectedContent?.section ?? activeContentTemplate.section,
      slot: selectedContent?.slot ?? activeContentTemplate.slot,
      title: selectedContent?.title ?? null,
      subtitle: selectedContent?.subtitle ?? null,
      body: selectedContent?.body ?? null,
      imageUrl: newImageUrl.trim(),
      targetUrl: shopTargetId ? buildShopTarget(shopTargetId) : externalTargetUrl || null,
      priority: selectedContent?.priority ?? 0,
      sortOrder: selectedContent?.sortOrder ?? (contentItems.filter((item) => item.section === activeContentTemplate.section && item.slot === activeContentTemplate.slot).length + 1),
      isActive: true
    };
    if (selectedContent) await updateAdminContent(selectedContent.id, payload);
    else await createAdminContent(payload);
    const next = await listAdminContent();
    setContentItems(next);
    if (!selectedContentId && next[0]) setSelectedContentId(next[0].id);
  };

  const saveTournament = async () => {
    if (!tournamentForm.name.trim()) {
      Alert.alert("Error", "El nombre del torneo es obligatorio.");
      return;
    }

    const normalizedSlug = slugify(tournamentForm.slug.trim() || tournamentForm.name.trim());

    const startDateRaw = tournamentForm.startDate.trim();
    if (!startDateRaw) {
      Alert.alert("Error", "La fecha de inicio es obligatoria (YYYY-MM-DD).");
      return;
    }

    const startDateIso = new Date(`${startDateRaw}T09:00:00.000Z`);
    if (Number.isNaN(startDateIso.getTime())) {
      Alert.alert("Error", "La fecha de inicio no es válida. Usá formato YYYY-MM-DD.");
      return;
    }

    let endDateIso: Date | undefined;
    if (tournamentForm.endDate.trim()) {
      endDateIso = new Date(`${tournamentForm.endDate.trim()}T23:00:00.000Z`);
      if (Number.isNaN(endDateIso.getTime())) {
        Alert.alert("Error", "La fecha de fin no es válida. Usá formato YYYY-MM-DD.");
        return;
      }
    }

    try {
      setTournamentSaving(true);
      await createAdminTournament({
        name: tournamentForm.name.trim(),
        slug: normalizedSlug,
        clubId: tournamentForm.clubId.trim() || undefined,
        startDate: startDateIso.toISOString(),
        endDate: endDateIso?.toISOString(),
        levelLabel: tournamentForm.levelLabel.trim() || undefined,
        minHandicap: tournamentForm.minHandicap.trim() ? Number(tournamentForm.minHandicap) : undefined,
        maxHandicap: tournamentForm.maxHandicap.trim() ? Number(tournamentForm.maxHandicap) : undefined,
        maxTeams: tournamentForm.maxTeams.trim() ? Number(tournamentForm.maxTeams) : undefined,
        contactName: tournamentForm.contactName.trim() || undefined,
        contactPhone: tournamentForm.contactPhone.trim() || undefined,
        registrationStatus: tournamentForm.registrationStatus.trim() || undefined,
        status: tournamentForm.status.trim() || undefined
      });

      const next = await listAdminTournaments();
      setTournaments(next);
      setTournamentForm({
        name: "",
        slug: "",
        clubId: "",
        startDate: "",
        endDate: "",
        levelLabel: "",
        minHandicap: "",
        maxHandicap: "",
        maxTeams: "",
        contactName: "",
        contactPhone: "",
        registrationStatus: "open",
        status: "scheduled"
      });
      Alert.alert("Listo", "Torneo creado correctamente.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo crear el torneo.");
    } finally {
      setTournamentSaving(false);
    }
  };

  const tabs: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; count?: number }> = [
    { key: "dashboard", label: "Dashboard", icon: "grid-outline" },
    { key: "content", label: "Contenido", icon: "images-outline", count: contentItems.length },
    { key: "community", label: "Comunidad", icon: "people-outline", count: rooms.length },
    { key: "brands", label: "Marcas", icon: "pricetags-outline", count: brands.length },
    { key: "auctions", label: "Remates", icon: "ribbon-outline" },
    { key: "tournaments", label: "Torneos", icon: "trophy-outline", count: tournaments.length }
  ];

  return (
    <Screen eyebrow="Admin" title="Panel de administración">
      <ScrollView contentContainerStyle={styles.container}>

        {/* ── Tab bar ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable key={tab.key} style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]} onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={tab.icon} size={20} color={activeTab === tab.key ? "#fff" : colors.muted} />
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
              {tab.count !== undefined && tab.count > 0 ? (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{tab.count}</Text></View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>

        {/* ── DASHBOARD ── */}
        {activeTab === "dashboard" && (
          <View style={styles.section}>
            <View style={styles.statGrid}>
              {[
                { label: "Usuarios", value: stats.users ?? 0, icon: "person-outline" as const, color: "#4f8cff" },
                { label: "Productos", value: stats.products ?? 0, icon: "cube-outline" as const, color: "#16a34a" },
                { label: "Comunidades", value: stats.rooms ?? 0, icon: "people-outline" as const, color: "#8b5cf6" },
                { label: "Partidos", value: stats.matches ?? 0, icon: "football-outline" as const, color: "#f59e0b" },
                { label: "Torneos", value: stats.tournaments ?? 0, icon: "trophy-outline" as const, color: "#ef4444" },
                { label: "Contenido", value: stats.contentItems ?? 0, icon: "images-outline" as const, color: "#0ea5e9" }
              ].map((stat) => (
                <View key={stat.label} style={[styles.statCard, { borderLeftColor: stat.color, borderLeftWidth: 3 }]}>
                  <View style={[styles.statIcon, { backgroundColor: `${stat.color}18` }]}>
                    <Ionicons name={stat.icon} size={20} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── CONTENT ── */}
        {activeTab === "content" && (
          <View style={styles.section}>
            <View style={styles.twoCol}>
              {/* Left: list */}
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Biblioteca de contenido</Text>
                  <Pressable style={styles.btnPrimary} onPress={() => setSelectedContentId(null)}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Nuevo</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {(["all", "branding", "home", "community", "live"] as const).map((s) => (
                    <Pressable key={s} style={[styles.chip, activeSectionFilter === s && styles.chipActive]} onPress={() => setActiveSectionFilter(s)}>
                      <Text style={[styles.chipText, activeSectionFilter === s && styles.chipTextActive]}>{s === "all" ? "Todo" : s}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <ScrollView style={{ maxHeight: 480 }}>
                  {groupedContent.map((group) => (
                    <View key={`${group.section}-${group.slot}`} style={{ marginBottom: 16 }}>
                      <Text style={styles.groupLabel}>{t(group.titleKey)}</Text>
                      <Text style={styles.groupMeta}>{group.items.length} elemento(s)</Text>
                      {group.items.length === 0 ? (
                        <Text style={styles.emptyText}>Sin ítems</Text>
                      ) : group.items.map((item) => (
                        <Pressable key={item.id} style={[styles.contentRow, selectedContentId === item.id && styles.contentRowActive]} onPress={() => setSelectedContentId(item.id)}>
                          <Image source={resolveContentImageSource(item.imageUrl)} style={styles.contentThumb} resizeMode="contain" />
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.contentRowTitle} numberOfLines={1}>{group.title}</Text>
                            <Text style={styles.contentRowMeta}>Posición #{item.sortOrder}</Text>
                            <Text style={styles.contentRowPath} numberOfLines={1}>{item.imageUrl.split("/").pop() ?? item.imageUrl}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Right: form */}
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>{selectedContent ? "Editar ítem" : "Nuevo ítem"}</Text>
                </View>
                <View style={styles.contentPreviewCard}>
                  <Image source={resolveContentImageSource(newImageUrl || selectedContent?.imageUrl || "asset:home/hero-1")} style={styles.contentPreview} resizeMode="contain" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.fieldLabel}>Destino</Text>
                    <Text style={styles.helperText}>{selectedContent ? `${selectedContent.section} / ${selectedContent.slot}` : `${activeContentTemplate.section} / ${activeContentTemplate.slot}`}</Text>
                    <Text style={styles.helperText}>La imagen se agrega en la sección que elegís a la izquierda.</Text>
                  </View>
                </View>
                <View style={styles.formGrid}>
                  <LabeledInput
                    label="URL externa de destino"
                    value={newTargetUrl}
                    onChangeText={(value) => {
                      setNewTargetUrl(value);
                      if (value.trim()) {
                        setSelectedShopTargetId("");
                      }
                    }}
                    placeholder="https://..."
                  />
                </View>
                <View style={styles.fullField}>
                  <Text style={styles.fieldLabel}>Shop interno de Polo Connect</Text>
                  <Text style={styles.helperText}>Elegí una tienda existente. Si seleccionás una, se anula la URL externa. Si escribís URL, se deselecciona el shop.</Text>
                  {brands.length === 0 ? (
                    <Text style={styles.helperText}>No hay shops disponibles para vincular.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopSelectorRow}>
                      {brands.map((brand) => (
                        <Pressable
                          key={brand.id}
                          style={[styles.shopChip, selectedShopTargetId === brand.id && styles.shopChipActive]}
                          onPress={() => {
                            setSelectedShopTargetId((current) => current === brand.id ? "" : brand.id);
                            setNewTargetUrl("");
                          }}
                        >
                          <Text style={[styles.shopChipText, selectedShopTargetId === brand.id && styles.shopChipTextActive]} numberOfLines={1}>
                            {brand.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
                <View style={styles.fullField}>
                  <Text style={styles.fieldLabel}>Imagen</Text>
                  <TextInput style={styles.input} value={newImageUrl} onChangeText={setNewImageUrl} placeholderTextColor={colors.muted} placeholder="Pegá una URL o subí una imagen" autoCapitalize="none" />
                </View>
                <View style={styles.uploadBox}>
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.primaryDark} />
                  <Text style={styles.uploadLabel}>Subí una imagen desde la PC o pegá una única URL.</Text>
                  <Pressable style={styles.btnPrimary} onPress={() => (document as any).getElementById("admin-upload-input")?.click()}>
                    <Text style={styles.btnPrimaryText}>{uploading ? "Subiendo..." : "Elegir archivo"}</Text>
                  </Pressable>
                  <input type="file" accept="image/*" style={{ display: "none" }} id="admin-upload-input" onChange={async (e: any) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setUploading(true);
                    try { const u = await uploadAdminContentImage(file); setNewImageUrl(u.url); Alert.alert("Subida", u.filename); }
                    finally { setUploading(false); }
                  }} />
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.btnPrimary} onPress={async () => { await saveContent(); }}>
                    <Text style={styles.btnPrimaryText}>{selectedContent ? "Guardar cambios" : "Crear ítem"}</Text>
                  </Pressable>
                  {selectedContent ? (
                    <Pressable style={styles.btnDanger} onPress={async () => {
                      await deleteAdminContent(selectedContent.id);
                      const next = await listAdminContent();
                      setContentItems(next);
                      setSelectedContentId(next[0]?.id ?? null);
                    }}>
                      <Text style={styles.btnDangerText}>Eliminar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── COMMUNITY ── */}
        {activeTab === "community" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Salas de comunidad</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomChipsRow}>
              {rooms.map((room) => (
                <Pressable key={room.id} style={[styles.roomChip, selectedRoomId === room.id && styles.roomChipActive]} onPress={() => setSelectedRoomId(room.id)}>
                  <Text style={[styles.roomChipTitle, selectedRoomId === room.id && { color: "#fff" }]} numberOfLines={1}>{room.title}</Text>
                  <View style={[styles.roomChipBadge, selectedRoomId === room.id && styles.roomChipBadgeActive]}>
                    <Text style={[styles.roomChipKind, selectedRoomId === room.id && styles.roomChipKindActive]}>{room.kind}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.communitySearchPanel}>
              <Text style={styles.fieldLabel}>Buscar usuario en la sala</Text>
              <TextInput
                style={styles.input}
                value={communitySearch}
                onChangeText={setCommunitySearch}
                placeholder="Nombre, usuario o ID"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>Mostrando {filteredModerationRows.length} de {moderationRows.length} usuarios.</Text>
            </View>
            <View style={{ gap: 10, marginTop: 8 }}>
              {filteredModerationRows.map((entry) => (
                <View key={entry.user.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{entry.user.firstName.charAt(0)}{entry.user.lastName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{entry.user.firstName} {entry.user.lastName}</Text>
                    <Text style={styles.memberMeta}>@{entry.user.username}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <Text style={[styles.statusChip, entry.isBanned ? styles.statusBanned : styles.statusActive]}>{entry.isBanned ? "Baneado" : "Activo"}</Text>
                      <Text style={[styles.statusChip, entry.isMember ? styles.statusActive : styles.statusMuted]}>{entry.isMember ? "En sala" : "Fuera"}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable style={[styles.actionBtn, entry.isBanned && styles.actionBtnDisabled]} disabled={entry.isBanned} onPress={async () => { if (!selectedRoomId) return; await banCommunityMember(selectedRoomId, entry.user.id, t("adminPanel.banReason")); await refreshRoomModeration(selectedRoomId); }}>
                      <Text style={styles.actionBtnDanger}>Banear</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, !entry.isMember && styles.actionBtnDisabled]} disabled={!entry.isMember} onPress={async () => { if (!selectedRoomId) return; await removeCommunityMember(selectedRoomId, entry.user.id, t("adminPanel.removeReason")); await refreshRoomModeration(selectedRoomId); }}>
                      <Text style={styles.actionBtnPrimary}>Remover</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, !entry.isBanned && styles.actionBtnDisabled]} disabled={!entry.isBanned} onPress={async () => { if (!selectedRoomId) return; await unbanCommunityMember(selectedRoomId, entry.user.id, t("adminPanel.unbanReason")); await refreshRoomModeration(selectedRoomId); }}>
                      <Text style={styles.actionBtnPrimary}>Desbanear</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              {filteredModerationRows.length === 0 ? (
                <View style={styles.panel}>
                  <Text style={styles.emptyText}>No hay usuarios que coincidan con la búsqueda.</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* ── BRANDS ── */}
        {activeTab === "brands" && (
          <View style={styles.section}>
            <View style={styles.twoCol}>
              {/* Left: brand list */}
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Marcas ({brands.length})</Text>
                  <Pressable style={styles.btnPrimary} onPress={() => {
                    setBrandForm({ name: "", slug: "", description: "", whatsapp: "", phone: "", email: "", website: "", logoUrl: "" });
                    setSelectedBrandId(null);
                    setBrandProducts([]);
                    setSelectedBpId(null);
                    resetBrandLogoEditor();
                  }}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Nueva</Text>
                  </Pressable>
                </View>
                {brands.map((brand) => (
                  <Pressable key={brand.id} style={[styles.brandRow, selectedBrandId === brand.id && styles.brandRowActive]} onPress={async () => {
                    setBrandForm({ name: brand.name, slug: brand.slug, description: brand.description ?? "", whatsapp: brand.whatsapp ?? "", phone: brand.phone ?? "", email: brand.email ?? "", website: brand.website ?? "", logoUrl: brand.logoUrl ?? "" });
                    setSelectedBrandId(brand.id);
                    setSelectedBpId(null);
                    setBpForm({ name: "", description: "", price: "", imageUrl: "" });
                    resetBrandLogoEditor();
                    const prods = await adminListBrandProducts(brand.id).catch(() => []);
                    setBrandProducts(prods);
                  }}>
                    {brand.logoUrl ? (
                      <Image source={resolveContentImageSource(brand.logoUrl)} style={styles.brandRowLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.brandRowLogo, { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceStrong }]}>
                        <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.brandRowName}>{brand.name}</Text>
                      <Text style={styles.brandRowMeta}>{(brand as any)._count?.products ?? 0} productos</Text>
                    </View>
                    <Pressable onPress={async () => {
                      await adminDeleteBrand(brand.id);
                      setBrands((p) => p.filter((b) => b.id !== brand.id));
                      if (selectedBrandId === brand.id) setSelectedBrandId(null);
                    }}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>

              {/* Right: brand form + products */}
              <View style={[styles.panel, { gap: 10 }]}>
                <Text style={styles.panelTitle}>{selectedBrandId ? "Editar marca" : "Nueva marca"}</Text>
                <View style={styles.brandLogoEditorCard}>
                  <Text style={styles.fieldLabel}>Logo de la marca</Text>
                  <Text style={styles.helperText}>Podés subir una imagen local, ajustarla antes de guardar y queda persistida en el backend.</Text>
                  <View style={styles.brandLogoEditorRow}>
                    <View style={styles.brandLogoPreviewFrame}>
                      {brandLogoDraftUrl || brandForm.logoUrl ? (
                        <View style={styles.brandLogoPreviewInner}>
                          <Image
                            source={resolveContentImageSource(brandLogoDraftUrl || brandForm.logoUrl)}
                            style={[
                              styles.brandLogoPreviewImage,
                              brandLogoDraftUrl ? {
                                transform: [
                                  { translateX: brandLogoOffsetX },
                                  { translateY: brandLogoOffsetY },
                                  { scale: brandLogoZoom }
                                ]
                              } : null
                            ]}
                            resizeMode="cover"
                          />
                        </View>
                      ) : (
                        <View style={styles.brandLogoEmptyState}>
                          <Ionicons name="image-outline" size={28} color={colors.muted} />
                          <Text style={styles.helperText}>Todavía no hay logo</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.brandLogoControls}>
                      <Pressable style={styles.btnPrimary} onPress={() => brandLogoInputRef.current?.click()}>
                        <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                        <Text style={styles.btnPrimaryText}>Elegir logo</Text>
                      </Pressable>
                      <input
                        ref={brandLogoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (event: any) => {
                          const file = event.target.files?.[0] as File | undefined;
                          await prepareBrandLogo(file ?? null);
                        }}
                      />

                      {brandLogoDraftUrl ? (
                        <>
                          <View style={styles.sliderGroup}>
                            <Text style={styles.sliderLabel}>Zoom</Text>
                            <input
                              type="range"
                              min="1"
                              max="2.6"
                              step="0.01"
                              value={String(brandLogoZoom)}
                              onChange={(event) => setBrandLogoZoom(Number(event.currentTarget.value))}
                            />
                          </View>
                          <View style={styles.sliderGroup}>
                            <Text style={styles.sliderLabel}>Mover horizontal</Text>
                            <input
                              type="range"
                              min={String(-brandLogoOffsetLimit)}
                              max={String(brandLogoOffsetLimit)}
                              step="1"
                              value={String(brandLogoOffsetX)}
                              onChange={(event) => setBrandLogoOffsetX(Number(event.currentTarget.value))}
                            />
                          </View>
                          <View style={styles.sliderGroup}>
                            <Text style={styles.sliderLabel}>Mover vertical</Text>
                            <input
                              type="range"
                              min={String(-brandLogoOffsetLimit)}
                              max={String(brandLogoOffsetLimit)}
                              step="1"
                              value={String(brandLogoOffsetY)}
                              onChange={(event) => setBrandLogoOffsetY(Number(event.currentTarget.value))}
                            />
                          </View>
                          <View style={styles.actionRow}>
                            <Pressable style={styles.btnPrimary} onPress={() => { void uploadPreparedBrandLogo(); }} disabled={brandLogoUploading}>
                              <Ionicons name="checkmark-outline" size={16} color="#fff" />
                              <Text style={styles.btnPrimaryText}>{brandLogoUploading ? "Subiendo..." : "Usar este logo"}</Text>
                            </Pressable>
                            <Pressable style={styles.btnSecondary} onPress={resetBrandLogoEditor}>
                              <Text style={styles.btnSecondaryText}>Cancelar ajuste</Text>
                            </Pressable>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>
                <LabeledInput label="Nombre *" value={brandForm.name} onChangeText={(v) => setBrandForm((f) => ({ ...f, name: v }))} placeholder="Ej: La Dolfina" />
                <LabeledInput label="Descripción" value={brandForm.description} onChangeText={(v) => setBrandForm((f) => ({ ...f, description: v }))} />
                <LabeledInput label="WhatsApp" value={brandForm.whatsapp} onChangeText={(v) => setBrandForm((f) => ({ ...f, whatsapp: v }))} placeholder="+54911..." keyboardType="phone-pad" />
                <LabeledInput label="Teléfono" value={brandForm.phone} onChangeText={(v) => setBrandForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
                <LabeledInput label="Email" value={brandForm.email} onChangeText={(v) => setBrandForm((f) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />
                <LabeledInput label="Sitio web" value={brandForm.website} onChangeText={(v) => setBrandForm((f) => ({ ...f, website: v }))} autoCapitalize="none" />
                <LabeledInput label="URL del logo" value={brandForm.logoUrl} onChangeText={(v) => setBrandForm((f) => ({ ...f, logoUrl: v }))} autoCapitalize="none" />
                <Pressable style={styles.btnPrimary} onPress={async () => {
                  if (!brandForm.name.trim()) { Alert.alert("Error", "El nombre es requerido."); return; }
                  try {
                    const payload = { ...brandForm, slug: selectedBrandId ? brandForm.slug : slugify(brandForm.name), isActive: true, sortOrder: 0 };
                    if (selectedBrandId) {
                      const u = await adminUpdateBrand(selectedBrandId, payload);
                      setBrands((p) => p.map((b) => b.id === selectedBrandId ? u : b));
                    } else {
                      const c = await adminCreateBrand(payload);
                      setBrands((p) => [...p, c]);
                    }
                    setBrandForm({ name: "", slug: "", description: "", whatsapp: "", phone: "", email: "", website: "", logoUrl: "" });
                    setSelectedBrandId(null);
                    resetBrandLogoEditor();
                    Alert.alert("Listo", selectedBrandId ? "Marca actualizada." : "Marca creada.");
                  } catch (err: any) { Alert.alert("Error", err?.message ?? "No se pudo guardar."); }
                }}>
                  <Text style={styles.btnPrimaryText}>{selectedBrandId ? "Guardar cambios" : "Crear marca"}</Text>
                </Pressable>

                {/* Products sub-section */}
                {selectedBrandId ? (
                  <View style={{ gap: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                    <View style={styles.panelHeader}>
                      <Text style={styles.panelTitle}>Productos ({brandProducts.length}/20)</Text>
                    </View>
                    {brandProducts.map((bp) => (
                      <View key={bp.id} style={styles.brandRow}>
                        {bp.imageUrl ? (
                          <Image source={resolveContentImageSource(bp.imageUrl)} style={styles.brandRowLogo} resizeMode="cover" />
                        ) : (
                          <View style={[styles.brandRowLogo, { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceStrong }]}>
                            <Ionicons name="cube-outline" size={16} color={colors.muted} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.brandRowName} numberOfLines={1}>{bp.name}</Text>
                          <Text style={styles.brandRowMeta}>{bp.priceCents ? `${bp.currency} ${(bp.priceCents / 100).toLocaleString()}` : "Sin precio"}</Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <Pressable onPress={() => { setBpForm({ name: bp.name, description: bp.description, price: bp.priceCents ? String(bp.priceCents / 100) : "", imageUrl: bp.imageUrl ?? "" }); setSelectedBpId(bp.id); }}>
                            <Ionicons name="create-outline" size={18} color={colors.primary} />
                          </Pressable>
                          <Pressable onPress={async () => { await adminDeleteBrandProduct(selectedBrandId!, bp.id); setBrandProducts((p) => p.filter((x) => x.id !== bp.id)); }}>
                            <Ionicons name="trash-outline" size={18} color={colors.danger} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                    {brandProducts.length < 20 && (
                      <View style={{ gap: 8, backgroundColor: colors.surfaceStrong, borderRadius: 14, padding: 12 }}>
                        <Text style={styles.fieldLabel}>{selectedBpId ? "Editar producto" : "Agregar producto"}</Text>
                        <LabeledInput label="Nombre *" value={bpForm.name} onChangeText={(v) => setBpForm((f) => ({ ...f, name: v }))} />
                        <LabeledInput label="Descripción *" value={bpForm.description} onChangeText={(v) => setBpForm((f) => ({ ...f, description: v }))} />
                        <LabeledInput label="Precio (opcional)" value={bpForm.price} onChangeText={(v) => setBpForm((f) => ({ ...f, price: v }))} keyboardType="numeric" />
                        {bpForm.imageUrl ? (
                          <Image source={resolveContentImageSource(bpForm.imageUrl)} style={styles.brandRowLogo} resizeMode="cover" />
                        ) : null}
                        <LabeledInput label="URL imagen" value={bpForm.imageUrl} onChangeText={(v) => setBpForm((f) => ({ ...f, imageUrl: v }))} autoCapitalize="none" />
                        <View style={styles.uploadBox}>
                          <Ionicons name="image-outline" size={22} color={colors.primaryDark} />
                          <Text style={styles.uploadLabel}>Subí una imagen local para este producto.</Text>
                          <Pressable style={styles.btnPrimary} onPress={() => bpImageInputRef.current?.click()}>
                            <Text style={styles.btnPrimaryText}>{bpUploading ? "Subiendo..." : "Elegir archivo"}</Text>
                          </Pressable>
                          <input
                            ref={bpImageInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={async (event: any) => {
                              const file = event.target.files?.[0] as File | undefined;
                              await uploadBrandProductImage(file ?? null);
                            }}
                          />
                        </View>
                        <Pressable style={styles.btnPrimary} onPress={async () => {
                          if (!bpForm.name.trim() || !bpForm.description.trim()) { Alert.alert("Error", "Nombre y descripción son requeridos."); return; }
                          const payload = { name: bpForm.name.trim(), description: bpForm.description.trim(), price: bpForm.price ? Number(bpForm.price) : undefined, imageUrl: bpForm.imageUrl || undefined };
                          try {
                            if (selectedBpId) {
                              const u = await adminUpdateBrandProduct(selectedBrandId!, selectedBpId, payload);
                              setBrandProducts((p) => p.map((x) => x.id === selectedBpId ? u : x));
                            } else {
                              const c = await adminCreateBrandProduct(selectedBrandId!, payload);
                              setBrandProducts((p) => [...p, c]);
                            }
                            setBpForm({ name: "", description: "", price: "", imageUrl: "" });
                            setSelectedBpId(null);
                          } catch (err: any) { Alert.alert("Error", err?.message ?? "No se pudo guardar."); }
                        }}>
                          <Text style={styles.btnPrimaryText}>{selectedBpId ? "Guardar producto" : "Agregar producto"}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* ── AUCTIONS ── */}
        {activeTab === "auctions" && (
          <View style={styles.section}>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Remates</Text>
              <Text style={styles.sectionLead}>Proceso simple: creá el evento, cargá caballos y revisá que esté publicado.</Text>

              <View style={styles.stepCard}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Crear o editar evento</Text>
                  <Text style={styles.stepHint}>Definí título, fecha y datos generales del remate.</Text>
                </View>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Cargar caballos</Text>
                  <Text style={styles.stepHint}>Completá nombre, imagen, raza, edad y linaje (madre/padre).</Text>
                </View>
              </View>

              <View style={styles.stepCard}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Revisar vista pública</Text>
                  <Text style={styles.stepHint}>Verificá que el remate y sus caballos se vean correctamente en la app.</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <Pressable style={styles.btnPrimary} onPress={() => router.push("/horse-auctions-admin")}>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>Abrir gestor de remates</Text>
                </Pressable>
                <Pressable style={styles.btnSecondary} onPress={() => router.push("/horse-auctions")}>
                  <Ionicons name="eye-outline" size={16} color={colors.primaryDark} />
                  <Text style={styles.btnSecondaryText}>Ver vista pública</Text>
                </Pressable>
              </View>

              <View style={styles.infoPill}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.primaryDark} />
                <Text style={styles.infoPillText}>Preparado para permisos por dueño de remate en próximos pasos.</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── TOURNAMENTS ── */}
        {activeTab === "tournaments" && (
          <View style={styles.section}>
            <View style={styles.twoCol}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Crear torneo</Text>
                <Text style={styles.sectionLead}>Completá los datos principales para que aparezca en la app.</Text>
                <View style={styles.formGrid}>
                  <LabeledInput label="Nombre *" value={tournamentForm.name} onChangeText={(v) => setTournamentForm((f) => ({ ...f, name: v }))} placeholder="Ej: Copa Primavera" />
                  <LabeledInput label="Slug (opcional)" value={tournamentForm.slug} onChangeText={(v) => setTournamentForm((f) => ({ ...f, slug: v }))} placeholder="copa-primavera" autoCapitalize="none" />
                  <LabeledInput label="Club ID (opcional)" value={tournamentForm.clubId} onChangeText={(v) => setTournamentForm((f) => ({ ...f, clubId: v }))} placeholder="UUID del club" autoCapitalize="none" />
                  <LabeledInput label="Inicio (YYYY-MM-DD) *" value={tournamentForm.startDate} onChangeText={(v) => setTournamentForm((f) => ({ ...f, startDate: v }))} placeholder="2026-09-12" />
                  <LabeledInput label="Fin (YYYY-MM-DD)" value={tournamentForm.endDate} onChangeText={(v) => setTournamentForm((f) => ({ ...f, endDate: v }))} placeholder="2026-09-20" />
                  <LabeledInput label="Nivel" value={tournamentForm.levelLabel} onChangeText={(v) => setTournamentForm((f) => ({ ...f, levelLabel: v }))} placeholder="Abierto" />
                  <LabeledInput label="Handicap mínimo" value={tournamentForm.minHandicap} onChangeText={(v) => setTournamentForm((f) => ({ ...f, minHandicap: v }))} keyboardType="numeric" placeholder="0" />
                  <LabeledInput label="Handicap máximo" value={tournamentForm.maxHandicap} onChangeText={(v) => setTournamentForm((f) => ({ ...f, maxHandicap: v }))} keyboardType="numeric" placeholder="8" />
                  <LabeledInput label="Máx. equipos" value={tournamentForm.maxTeams} onChangeText={(v) => setTournamentForm((f) => ({ ...f, maxTeams: v }))} keyboardType="numeric" placeholder="12" />
                  <LabeledInput label="Contacto" value={tournamentForm.contactName} onChangeText={(v) => setTournamentForm((f) => ({ ...f, contactName: v }))} placeholder="Nombre del organizador" />
                  <LabeledInput label="Teléfono contacto" value={tournamentForm.contactPhone} onChangeText={(v) => setTournamentForm((f) => ({ ...f, contactPhone: v }))} placeholder="+54..." keyboardType="phone-pad" />
                  <LabeledInput label="Estado inscripción" value={tournamentForm.registrationStatus} onChangeText={(v) => setTournamentForm((f) => ({ ...f, registrationStatus: v }))} placeholder="open" autoCapitalize="none" />
                  <LabeledInput label="Estado torneo" value={tournamentForm.status} onChangeText={(v) => setTournamentForm((f) => ({ ...f, status: v }))} placeholder="scheduled" autoCapitalize="none" />
                </View>
                <Pressable style={styles.btnPrimary} onPress={() => { void saveTournament(); }} disabled={tournamentSaving}>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{tournamentSaving ? "Guardando..." : "Guardar torneo"}</Text>
                </Pressable>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Torneos cargados ({tournaments.length})</Text>
                <Text style={styles.helperText}>Vista rápida de lo que ya está disponible en la app.</Text>
                <ScrollView style={{ maxHeight: 560 }}>
                  {tournaments.map((tournament) => (
                    <View key={tournament.id} style={styles.tournamentRow}>
                      <Text style={styles.tournamentName}>{tournament.name}</Text>
                      <Text style={styles.tournamentMeta}>Slug: {tournament.slug}</Text>
                      {tournament.clubId ? <Text style={styles.tournamentMeta}>Club ID: {tournament.clubId}</Text> : null}
                      <Text style={styles.tournamentMeta}>Inicio: {new Date(tournament.startDate).toLocaleDateString("es-AR")}</Text>
                      {tournament.endDate ? <Text style={styles.tournamentMeta}>Fin: {new Date(tournament.endDate).toLocaleDateString("es-AR")}</Text> : null}
                      {tournament.levelLabel ? <Text style={styles.tournamentMeta}>Nivel: {tournament.levelLabel}</Text> : null}
                      {tournament.minHandicap !== null && tournament.minHandicap !== undefined && tournament.maxHandicap !== null && tournament.maxHandicap !== undefined ? (
                        <Text style={styles.tournamentMeta}>Handicap: {tournament.minHandicap} a {tournament.maxHandicap} goles</Text>
                      ) : null}
                      {tournament.maxTeams ? <Text style={styles.tournamentMeta}>Máx. equipos: {tournament.maxTeams}</Text> : null}
                      {tournament.contactName ? <Text style={styles.tournamentMeta}>Contacto: {tournament.contactName}</Text> : null}
                      {tournament.contactPhone ? <Text style={styles.tournamentMeta}>Teléfono: {tournament.contactPhone}</Text> : null}
                      <Text style={styles.tournamentMeta}>Inscripción: {tournament.registrationStatus ?? "open"} · Estado: {tournament.status ?? "scheduled"}</Text>
                    </View>
                  ))}
                  {tournaments.length === 0 ? <Text style={styles.emptyText}>Todavía no hay torneos cargados desde admin.</Text> : null}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </Screen>
  );
}

function LabeledInput({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.fullField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { gap: 16, paddingBottom: 28 },
  infoText: { color: colors.muted, fontSize: 14 },
  sectionLead: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  helperText: { color: colors.muted, fontSize: 12 },

  // Tab bar
  tabBar: { flexDirection: "row", gap: 8, backgroundColor: colors.surface, borderRadius: 16, padding: 6, borderWidth: 1, borderColor: colors.border },
  tabItem: { minWidth: 130, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  tabItemActive: { backgroundColor: colors.primary },
  tabLabel: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  tabLabelActive: { color: "#fff" },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },

  // Layout
  section: { gap: 14 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  twoCol: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  panel: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },

  // Stats
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "30%", minWidth: 120, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { color: colors.text, fontSize: 28, fontWeight: "900" },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },

  // Buttons
  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 14, justifyContent: "center" },
  btnPrimaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  btnSecondary: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  btnSecondaryText: { color: colors.text, fontWeight: "800" },
  btnDanger: { minHeight: 40, borderRadius: 12, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: "#ffd0c9", justifyContent: "center", paddingHorizontal: 14 },
  btnDangerText: { color: colors.danger, fontWeight: "900" },

  // Filters / chips
  chip: { minHeight: 32, borderRadius: 999, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, justifyContent: "center" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: "800", fontSize: 12, textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },

  // Content list
  groupLabel: { color: colors.text, fontSize: 14, fontWeight: "900" },
  groupMeta: { color: colors.primaryDark, fontSize: 11, fontWeight: "800", marginBottom: 4 },
  emptyText: { color: colors.muted, fontSize: 13, paddingVertical: 8 },
  contentRow: { flexDirection: "row", gap: 10, alignItems: "center", padding: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 6 },
  contentRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  contentThumb: { width: 52, height: 40, borderRadius: 8, backgroundColor: colors.surfaceStrong },
  contentRowTitle: { color: colors.text, fontWeight: "800", fontSize: 13 },
  contentRowMeta: { color: colors.muted, fontSize: 11 },
  contentRowPath: { color: colors.muted, fontSize: 10 },
  typeBadge: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { color: colors.primaryDark, fontSize: 10, fontWeight: "900" },
  contentPreviewCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 10 },
  contentPreview: { width: 120, height: 82, borderRadius: 10, backgroundColor: colors.surfaceStrong },

  // Form
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fullField: { width: "100%", gap: 6 },
  fieldLabel: { color: colors.text, fontWeight: "800", fontSize: 13 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  uploadBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border },
  uploadLabel: { flex: 1, color: colors.text, fontWeight: "700", fontSize: 13 },
  shopSelectorRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  shopChip: { minHeight: 34, borderRadius: 999, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, justifyContent: "center", maxWidth: 220 },
  shopChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  shopChipText: { color: colors.text, fontWeight: "800", fontSize: 12 },
  shopChipTextActive: { color: "#fff" },
  assetChip: { borderRadius: 999, paddingHorizontal: 10, minHeight: 30, justifyContent: "center", backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border },
  assetChipText: { color: colors.primaryDark, fontWeight: "800", fontSize: 11 },
  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

  // Guided cards
  stepCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 12 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  stepBadgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" },
  stepTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  stepHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  infoPill: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 },
  infoPillText: { color: colors.primaryDark, fontSize: 12, fontWeight: "700" },

  // Community
  roomChipsRow: { gap: 10, paddingBottom: 6, paddingRight: 8 },
  roomChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minWidth: 0, alignSelf: "flex-start", maxWidth: 240 },
  roomChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roomChipTitle: { color: colors.text, fontWeight: "800", fontSize: 11.5, flexShrink: 1 },
  roomChipBadge: { borderRadius: 999, backgroundColor: colors.surfaceStrong, paddingHorizontal: 7, paddingVertical: 3 },
  roomChipBadgeActive: { backgroundColor: "rgba(255,255,255,0.18)" },
  roomChipKind: { color: colors.muted, fontSize: 9.5, fontWeight: "700", textTransform: "lowercase" },
  roomChipKindActive: { color: "rgba(255,255,255,0.88)" },
  communitySearchPanel: { gap: 8, marginTop: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 },
  memberCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  memberAvatarText: { color: "#fff", fontWeight: "900" },
  memberName: { color: colors.text, fontWeight: "900", fontSize: 14 },
  memberMeta: { color: colors.muted, fontSize: 12 },
  statusChip: { fontSize: 11, fontWeight: "900", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusActive: { color: "#1f6b35", backgroundColor: "#e6f7eb" },
  statusBanned: { color: colors.danger, backgroundColor: colors.dangerSoft },
  statusMuted: { color: colors.muted, backgroundColor: colors.surfaceStrong },
  actionBtn: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center" },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnDanger: { color: colors.danger, fontWeight: "900", fontSize: 13 },
  actionBtnPrimary: { color: colors.primary, fontWeight: "900", fontSize: 13 },

  // Brands
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
  brandRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  brandRowLogo: { width: 38, height: 38, borderRadius: 10 },
  brandRowName: { color: colors.text, fontWeight: "800", fontSize: 13 },
  brandRowMeta: { color: colors.muted, fontSize: 11 },
  brandLogoEditorCard: { gap: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 12 },
  brandLogoEditorRow: { flexDirection: "row", gap: 14, alignItems: "flex-start", flexWrap: "wrap" },
  brandLogoPreviewFrame: { width: brandLogoCropPreviewSize, height: brandLogoCropPreviewSize, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong },
  brandLogoPreviewInner: { flex: 1, overflow: "hidden", borderRadius: 24, backgroundColor: colors.surfaceStrong },
  brandLogoPreviewImage: { width: "100%", height: "100%" },
  brandLogoEmptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  brandLogoControls: { flex: 1, minWidth: 260, gap: 10 },
  sliderGroup: { gap: 6 },
  sliderLabel: { color: colors.text, fontSize: 12, fontWeight: "800" },

  // Tournaments
  tournamentRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, backgroundColor: colors.background, marginBottom: 8, gap: 2 },
  tournamentName: { color: colors.text, fontSize: 14, fontWeight: "900" },
  tournamentMeta: { color: colors.muted, fontSize: 12 }
});
