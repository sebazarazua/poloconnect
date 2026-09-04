import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminDateTimeField } from "@/components/AdminDateTimeField";
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
  patchAdminContent,
  reorderAdminContent,
  type CommunityBan,
  type AdminCommunityRoom,
  getAdminDashboard,
  listAdminContent,
  sendAdminTestPush,
  listCommunityBans,
  listCommunityMembers,
  listCommunityRooms,
  createCommunityRoom,
  updateCommunityRoom,
  deleteCommunityRoom,
  removeCommunityMember,
  createAdminTournament,
  updateAdminTournament,
  deleteAdminTournament,
  listAdminTournaments,
  createAdminTeam,
  listAdminTeams,
  deleteAdminTeam,
  uploadAdminTeamLogo,
  createAdminMatch,
  updateAdminMatch,
  deleteAdminMatch,
  listAdminMatches,
  uploadAdminMatchImage,
  setAdminMatchLineup,
  listAdminSpotlightEvents,
  createAdminSpotlightEvent,
  updateAdminSpotlightEvent,
  deleteAdminSpotlightEvent,
  uploadAdminSpotlightEventImage,
  unbanCommunityMember,
  updateAdminContent,
  uploadAdminContentImage,
  listAdminMarketplaceProducts,
  approveAdminMarketplaceProduct,
  rejectAdminMarketplaceProduct,
  deleteAdminMarketplaceProduct,
  type AdminContentItem,
  type AdminTournament,
  type AdminTeam,
  type AdminMatch,
  type AdminSpotlightEvent,
  type AdminMarketplaceProduct
} from "@/services/api/admin";
import { fetchMatch, updateMatchLiveState } from "@/services/api/matches";
import { ARGENTINA_TIME_ZONE, adminTimeZoneOptions, fromZonedDateTimeInputs, toZonedDateTimeInputs } from "@/utils/argentinaTime";
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

type Tab = "dashboard" | "content" | "community" | "brands" | "marketplace" | "auctions" | "tournaments" | "matches" | "events";

const contentSections = [
  { section: "home", slot: "hero_ads", titleKey: "adminPanel.section.homeHeroTitle" as const, subtitleKey: "adminPanel.section.homeHeroText" as const },
  { section: "home", slot: "compact_ads", titleKey: "adminPanel.section.homeCompactTitle" as const, subtitleKey: "adminPanel.section.homeCompactText" as const },
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

const matchStatusLabels: Record<"upcoming" | "live" | "finished" | "cancelled", string> = {
  upcoming: "Por disputarse",
  live: "En vivo",
  finished: "Finalizado",
  cancelled: "Cancelado"
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
  const { user, isAuthenticated, authReady } = useAuth();
  const { t } = useLocale();

  if (Platform.OS !== "web") {
    return <Redirect href={isAuthenticated ? "/(tabs)" : "/login"} />;
  }

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [pushTestSending, setPushTestSending] = useState(false);

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
  const [newIsActive, setNewIsActive] = useState(true);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentBusyId, setContentBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Community state
  const [rooms, setRooms] = useState<AdminCommunityRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ userId: string; user: { id: string; firstName: string; lastName: string; username: string } }>>([]);
  const [roomBans, setRoomBans] = useState<CommunityBan[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");
  const emptyRoomForm = {
    title: "",
    description: "",
    isRecommended: false,
    isPublic: true
  };
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomSaving, setRoomSaving] = useState(false);

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

  // Marketplace moderation state
  const [marketplaceProducts, setMarketplaceProducts] = useState<AdminMarketplaceProduct[]>([]);
  const [marketplaceStatusFilter, setMarketplaceStatusFilter] = useState<string>("pending_review");
  const [marketplaceBusyId, setMarketplaceBusyId] = useState<string | null>(null);

  const loadMarketplaceProducts = async (status: string) => {
    const next = await listAdminMarketplaceProducts(status || undefined).catch(() => []);
    setMarketplaceProducts(next);
  };

  // Tournaments state
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [tournamentSaving, setTournamentSaving] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [tournamentForm, setTournamentForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    levelLabel: "",
    minHandicap: "",
    maxHandicap: "",
    maxTeams: "",
    contactName: "",
    contactPhone: ""
  });

  const isAdmin = useMemo(() => {
    const roles = user?.roles ?? [];
    return roles.includes("admin") || roles.includes("superadmin");
  }, [user?.roles]);

  // Teams state (used to build match slides: name + logo)
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", logoUrl: "" });
  const [teamLogoUploading, setTeamLogoUploading] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  // Matches state (live broadcast scheduling). Status is never chosen here: it's
  // derived automatically from scheduledAt + durationMinutes (see backend).
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [matchSaving, setMatchSaving] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const emptyMatchForm = {
    team1Id: "",
    team2Id: "",
    tournamentId: "",
    scheduledDate: "",
    scheduledTime: "",
    timeZone: ARGENTINA_TIME_ZONE,
    durationMinutes: "",
    competitionName: "",
    youtubeUrl: "",
    backgroundImageUrl: ""
  };
  const [matchForm, setMatchForm] = useState(emptyMatchForm);
  const [matchImageUploading, setMatchImageUploading] = useState(false);
  const [matchScoreDrafts, setMatchScoreDrafts] = useState<Record<string, { score1: string; score2: string; currentChukker: string }>>({});
  const [matchScoreSavingId, setMatchScoreSavingId] = useState<string | null>(null);
  const [tournamentSearchQuery, setTournamentSearchQuery] = useState("");

  // Lineup/referees + comment composer for the match being edited
  const emptyLineupSlots = () => Array.from({ length: 4 }, () => ({ name: "", handicap: "" }));
  const [lineupForm, setLineupForm] = useState({ team1: emptyLineupSlots(), team2: emptyLineupSlots(), refereeMain: "", refereeAssistant: "" });
  const [lineupSaving, setLineupSaving] = useState(false);
  const [commentForm, setCommentForm] = useState({ title: "", body: "" });
  const [commentSaving, setCommentSaving] = useState(false);

  // Spotlight events state (generic home-carousel highlights: interview, pre-match, etc.)
  const [spotlightEvents, setSpotlightEvents] = useState<AdminSpotlightEvent[]>([]);
  const [eventSaving, setEventSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const emptyEventForm = {
    title: "",
    description: "",
    scheduledDate: "",
    scheduledTime: "",
    timeZone: ARGENTINA_TIME_ZONE,
    durationMinutes: "",
    youtubeUrl: "",
    backgroundImageUrl: ""
  };
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [eventImageUploading, setEventImageUploading] = useState(false);

  const filteredTeamsForSearch = useMemo(
    () => teams.filter((team) => team.name.toLowerCase().includes(teamSearchQuery.trim().toLowerCase())),
    [teams, teamSearchQuery]
  );
  const filteredTournamentsForSearch = useMemo(
    () => tournaments.filter((tournament) => tournament.name.toLowerCase().includes(tournamentSearchQuery.trim().toLowerCase())),
    [tournaments, tournamentSearchQuery]
  );

  const selectedContent = useMemo(() => contentItems.find((i) => i.id === selectedContentId) ?? null, [contentItems, selectedContentId]);

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
    void getAdminDashboard().then((dash) => setStats(dash.counters)).catch(() => setStats({}));
    void listAdminContent().then(setContentItems).catch(() => setContentItems([]));
    void listCommunityRooms()
      .then((nextRooms) => {
        setRooms(nextRooms);
        setSelectedRoomId((c) => c ?? nextRooms[0]?.id ?? null);
      })
      .catch(() => setRooms([]));
    void adminListBrands().then(setBrands).catch(() => {});
    void listAdminTournaments().then(setTournaments).catch(() => {});
    void listAdminTeams().then(setTeams).catch(() => {});
    void listAdminMatches().then(setMatches).catch(() => {});
    void listAdminSpotlightEvents().then(setSpotlightEvents).catch(() => {});
  }, [isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadMarketplaceProducts(marketplaceStatusFilter);
  }, [isAdmin, marketplaceStatusFilter]);

  useEffect(() => { if (selectedRoomId) void refreshRoomModeration(selectedRoomId).catch(() => { setMembers([]); setRoomBans([]); }); }, [selectedRoomId]);

  const sendPushTest = async () => {
    try {
      setPushTestSending(true);
      const result = await sendAdminTestPush();
      Alert.alert("Listo", result.tokensQueued > 0 ? "Push de prueba enviado." : "Notificacion creada, pero no hay tokens push activos para tu usuario.");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "No se pudo enviar el push de prueba.");
    } finally {
      setPushTestSending(false);
    }
  };

  useEffect(() => {
    if (!selectedContent) {
      setNewTitle("");
      setNewSubtitle("");
      setNewBody("");
      setNewImageUrl("");
      setNewTargetUrl("");
      setSelectedShopTargetId("");
      setNewIsActive(true);
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
    setNewIsActive(selectedContent.isActive);
  }, [selectedContent]);

  if (!authReady) {
    return null;
  }

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

  const refreshContent = async () => {
    const next = await listAdminContent();
    setContentItems(next);
    return next;
  };

  const startNewContent = (section: string, slot: string) => {
    setSelectedContentId(null);
    setNewSection(section);
    setNewSlot(slot);
    setNewType(inferType(section, slot));
    setNewSortOrder("");
    setNewPriority("0");
    setNewIsActive(true);
  };

  const saveContent = async () => {
    const externalTargetUrl = newTargetUrl.trim();
    const shopTargetId = selectedShopTargetId.trim();

    if (externalTargetUrl && shopTargetId) {
      Alert.alert("Error", "Elegí solo un destino: URL externa o shop interno.");
      return;
    }

    if (!newImageUrl.trim()) {
      Alert.alert("Error", "Subí una imagen antes de guardar.");
      return;
    }

    const payload = {
      type: newType,
      section: newSection,
      slot: newSlot,
      title: newTitle.trim() || null,
      subtitle: newSubtitle.trim() || null,
      body: newBody.trim() || null,
      imageUrl: newImageUrl.trim(),
      targetUrl: shopTargetId ? buildShopTarget(shopTargetId) : externalTargetUrl || null,
      priority: Number(newPriority) || 0,
      sortOrder: newSortOrder.trim() ? Number(newSortOrder) : undefined,
      isActive: newIsActive
    };

    try {
      setContentSaving(true);
      const saved = selectedContent
        ? await updateAdminContent(selectedContent.id, payload)
        : await createAdminContent(payload);
      await refreshContent();
      setSelectedContentId(saved.id);
      Alert.alert("Listo", selectedContent ? "Publicación actualizada." : "Publicación creada.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo guardar la publicación.");
    } finally {
      setContentSaving(false);
    }
  };

  const toggleContentActive = async (item: AdminContentItem) => {
    try {
      setContentBusyId(item.id);
      await patchAdminContent(item.id, { isActive: !item.isActive });
      await refreshContent();
    } catch (err: any) {
      Alert.alert("No se puede", err?.message ?? "No se pudo cambiar el estado.");
    } finally {
      setContentBusyId(null);
    }
  };

  const removeContent = async (item: AdminContentItem) => {
    try {
      setContentBusyId(item.id);
      await deleteAdminContent(item.id);
      const next = await refreshContent();
      if (selectedContentId === item.id) {
        setSelectedContentId(next.find((entry) => entry.section === item.section && entry.slot === item.slot)?.id ?? null);
      }
    } catch (err: any) {
      Alert.alert("No se puede", err?.message ?? "No se pudo eliminar la publicación.");
    } finally {
      setContentBusyId(null);
    }
  };

  const moveContent = async (items: AdminContentItem[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const orderedIds = items.map((item) => item.id);
    [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];

    try {
      setContentBusyId(items[index].id);
      await reorderAdminContent(items[index].section, items[index].slot, orderedIds);
      await refreshContent();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo reordenar el carrusel.");
    } finally {
      setContentBusyId(null);
    }
  };

  const refreshRooms = async () => {
    const next = await listCommunityRooms();
    setRooms(next);
    return next;
  };

  const startNewRoom = () => {
    setEditingRoomId(null);
    setRoomForm(emptyRoomForm);
  };

  const startEditRoom = (room: AdminCommunityRoom) => {
    setEditingRoomId(room.id);
    setRoomForm({
      title: room.title,
      description: room.description ?? "",
      isRecommended: room.isRecommended,
      isPublic: room.isPublic
    });
  };

  const saveRoom = async () => {
    if (!roomForm.title.trim()) {
      Alert.alert("Error", "El título de la comunidad es obligatorio.");
      return;
    }

    const payload = {
      title: roomForm.title.trim(),
      description: roomForm.description.trim() || undefined,
      isRecommended: roomForm.isRecommended,
      isPublic: roomForm.isPublic
    };

    try {
      setRoomSaving(true);
      const saved = editingRoomId ? await updateCommunityRoom(editingRoomId, payload) : await createCommunityRoom(payload);
      await refreshRooms();
      setSelectedRoomId(saved.id);
      startNewRoom();
      Alert.alert("Listo", editingRoomId ? "Comunidad actualizada." : "Comunidad creada.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo guardar la comunidad.");
    } finally {
      setRoomSaving(false);
    }
  };

  const removeRoom = async (room: AdminCommunityRoom) => {
    try {
      await deleteCommunityRoom(room.id);
      const next = await refreshRooms();
      if (selectedRoomId === room.id) setSelectedRoomId(next[0]?.id ?? null);
      if (editingRoomId === room.id) startNewRoom();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo eliminar la comunidad.");
    }
  };

  const emptyTournamentForm = () => ({
    name: "",
    startDate: "",
    endDate: "",
    levelLabel: "",
    minHandicap: "",
    maxHandicap: "",
    maxTeams: "",
    contactName: "",
    contactPhone: ""
  });

  const resetTournamentForm = () => {
    setEditingTournamentId(null);
    setTournamentForm(emptyTournamentForm());
  };

  const startEditTournament = (tournament: AdminTournament) => {
    setEditingTournamentId(tournament.id);
    setTournamentForm({
      name: tournament.name,
      startDate: toZonedDateTimeInputs(new Date(tournament.startDate), ARGENTINA_TIME_ZONE).date,
      endDate: tournament.endDate ? toZonedDateTimeInputs(new Date(tournament.endDate), ARGENTINA_TIME_ZONE).date : "",
      levelLabel: tournament.levelLabel ?? "",
      minHandicap: tournament.minHandicap !== null && tournament.minHandicap !== undefined ? String(tournament.minHandicap) : "",
      maxHandicap: tournament.maxHandicap !== null && tournament.maxHandicap !== undefined ? String(tournament.maxHandicap) : "",
      maxTeams: tournament.maxTeams ? String(tournament.maxTeams) : "",
      contactName: tournament.contactName ?? "",
      contactPhone: tournament.contactPhone ?? ""
    });
  };

  const removeTournament = async (tournament: AdminTournament) => {
    try {
      await deleteAdminTournament(tournament.id);
      const next = await listAdminTournaments();
      setTournaments(next);
      if (editingTournamentId === tournament.id) resetTournamentForm();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo eliminar el torneo.");
    }
  };

  const saveTournament = async () => {
    if (!tournamentForm.name.trim()) {
      Alert.alert("Error", "El nombre del torneo es obligatorio.");
      return;
    }

    const startDateRaw = tournamentForm.startDate.trim();
    if (!startDateRaw) {
      Alert.alert("Error", "La fecha de inicio es obligatoria.");
      return;
    }

    const startDateIso = fromZonedDateTimeInputs(startDateRaw, "09:00", ARGENTINA_TIME_ZONE);
    if (Number.isNaN(startDateIso.getTime())) {
      Alert.alert("Error", "La fecha de inicio no es válida.");
      return;
    }

    let endDateIso: Date | undefined;
    if (tournamentForm.endDate.trim()) {
      endDateIso = fromZonedDateTimeInputs(tournamentForm.endDate.trim(), "23:59", ARGENTINA_TIME_ZONE);
      if (Number.isNaN(endDateIso.getTime())) {
        Alert.alert("Error", "La fecha de fin no es válida.");
        return;
      }
    }

    try {
      setTournamentSaving(true);
      const payload = {
        name: tournamentForm.name.trim(),
        startDate: startDateIso.toISOString(),
        endDate: endDateIso?.toISOString(),
        levelLabel: tournamentForm.levelLabel.trim() || undefined,
        minHandicap: tournamentForm.minHandicap.trim() ? Number(tournamentForm.minHandicap) : undefined,
        maxHandicap: tournamentForm.maxHandicap.trim() ? Number(tournamentForm.maxHandicap) : undefined,
        maxTeams: tournamentForm.maxTeams.trim() ? Number(tournamentForm.maxTeams) : undefined,
        contactName: tournamentForm.contactName.trim() || undefined,
        contactPhone: tournamentForm.contactPhone.trim() || undefined
      };

      if (editingTournamentId) {
        await updateAdminTournament(editingTournamentId, payload);
      } else {
        await createAdminTournament(payload);
      }

      const next = await listAdminTournaments();
      setTournaments(next);
      resetTournamentForm();
      Alert.alert("Listo", editingTournamentId ? "Torneo actualizado correctamente." : "Torneo creado correctamente.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo guardar el torneo.");
    } finally {
      setTournamentSaving(false);
    }
  };

  const saveTeam = async () => {
    if (!teamForm.name.trim()) {
      Alert.alert("Error", "El nombre del equipo es obligatorio.");
      return;
    }

    try {
      setTeamSaving(true);
      await createAdminTeam({
        name: teamForm.name.trim(),
        logoUrl: teamForm.logoUrl.trim() || undefined
      });

      const next = await listAdminTeams();
      setTeams(next);
      setTeamForm({ name: "", logoUrl: "" });
      Alert.alert("Listo", "Equipo creado correctamente.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo crear el equipo.");
    } finally {
      setTeamSaving(false);
    }
  };

  const removeTeam = async (team: AdminTeam) => {
    try {
      await deleteAdminTeam(team.id);
      const next = await listAdminTeams();
      setTeams(next);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo eliminar el equipo.");
    }
  };

  const startEditMatch = (match: AdminMatch) => {
    const scheduled = new Date(match.scheduledAt);
    const durationMinutes = match.endsAt
      ? Math.round((new Date(match.endsAt).getTime() - scheduled.getTime()) / 60000)
      : undefined;
    const { date, time } = toZonedDateTimeInputs(scheduled, ARGENTINA_TIME_ZONE);

    setEditingMatchId(match.id);
    setMatchForm({
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      tournamentId: match.tournamentId ?? "",
      scheduledDate: date,
      scheduledTime: time,
      timeZone: ARGENTINA_TIME_ZONE,
      durationMinutes: durationMinutes ? String(durationMinutes) : "",
      competitionName: match.competitionName ?? "",
      youtubeUrl: match.youtubeUrl ?? "",
      backgroundImageUrl: match.backgroundImageUrl ?? ""
    });
    setCommentForm({ title: "", body: "" });

    void fetchMatch(match.id).then((detail) => {
      const toSlots = (items?: Array<{ name: string; handicap?: number }>) => {
        const slots = emptyLineupSlots();
        (items ?? []).slice(0, 4).forEach((p, i) => { slots[i] = { name: p.name, handicap: p.handicap !== undefined ? String(p.handicap) : "" }; });
        return slots;
      };
      setLineupForm({
        team1: toSlots(detail.lineups?.left),
        team2: toSlots(detail.lineups?.right),
        refereeMain: detail.referees?.main ?? "",
        refereeAssistant: detail.referees?.assistant ?? ""
      });
    }).catch(() => {});
  };

  const cancelEditMatch = () => {
    setEditingMatchId(null);
    setMatchForm(emptyMatchForm);
    setLineupForm({ team1: emptyLineupSlots(), team2: emptyLineupSlots(), refereeMain: "", refereeAssistant: "" });
  };

  const saveLineup = async () => {
    if (!editingMatchId) return;
    const toPayload = (slots: typeof lineupForm.team1) =>
      slots
        .filter((s) => s.name.trim())
        .map((s) => ({ name: s.name.trim(), handicap: s.handicap.trim() ? Number(s.handicap) : undefined }));

    try {
      setLineupSaving(true);
      await setAdminMatchLineup(editingMatchId, {
        team1: toPayload(lineupForm.team1),
        team2: toPayload(lineupForm.team2),
        refereeMain: lineupForm.refereeMain.trim() || undefined,
        refereeAssistant: lineupForm.refereeAssistant.trim() || undefined
      });
      Alert.alert("Listo", "Formación y árbitros guardados.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo guardar la formación.");
    } finally {
      setLineupSaving(false);
    }
  };

  const postComment = async () => {
    if (!editingMatchId || !commentForm.title.trim() || !commentForm.body.trim()) {
      Alert.alert("Error", "Completá título y texto del comentario.");
      return;
    }
    try {
      setCommentSaving(true);
      await updateMatchLiveState(editingMatchId, { title: commentForm.title.trim(), body: commentForm.body.trim() });
      setCommentForm({ title: "", body: "" });
      Alert.alert("Listo", "Comentario agregado.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo agregar el comentario.");
    } finally {
      setCommentSaving(false);
    }
  };

  const removeMatch = async (match: AdminMatch) => {
    try {
      await deleteAdminMatch(match.id);
      const next = await listAdminMatches();
      setMatches(next);
      if (editingMatchId === match.id) cancelEditMatch();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo eliminar el partido.");
    }
  };

  const saveMatch = async () => {
    if (!matchForm.team1Id || !matchForm.team2Id) {
      Alert.alert("Error", "Elegí los dos equipos que van a jugar.");
      return;
    }
    if (matchForm.team1Id === matchForm.team2Id) {
      Alert.alert("Error", "Los dos equipos tienen que ser distintos.");
      return;
    }
    if (!matchForm.scheduledDate.trim() || !matchForm.scheduledTime.trim()) {
      Alert.alert("Error", "La fecha y hora del partido son obligatorias.");
      return;
    }

    const scheduledAt = fromZonedDateTimeInputs(matchForm.scheduledDate.trim(), matchForm.scheduledTime.trim(), matchForm.timeZone);
    if (Number.isNaN(scheduledAt.getTime())) {
      Alert.alert("Error", "La fecha/hora del partido no es válida.");
      return;
    }

    let endsAt: Date | undefined;
    const durationMinutes = Number(matchForm.durationMinutes);
    if (matchForm.durationMinutes.trim() && durationMinutes > 0) {
      endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);
    }

    const payload = {
      team1Id: matchForm.team1Id,
      team2Id: matchForm.team2Id,
      tournamentId: matchForm.tournamentId || undefined,
      scheduledAt: scheduledAt.toISOString(),
      endsAt: endsAt?.toISOString(),
      competitionName: matchForm.competitionName.trim() || undefined,
      youtubeUrl: matchForm.youtubeUrl.trim() || undefined,
      backgroundImageUrl: matchForm.backgroundImageUrl.trim() || undefined
    };

    try {
      setMatchSaving(true);
      if (editingMatchId) {
        await updateAdminMatch(editingMatchId, payload);
      } else {
        await createAdminMatch(payload);
      }

      const next = await listAdminMatches();
      setMatches(next);
      cancelEditMatch();
      Alert.alert("Listo", editingMatchId ? "Partido actualizado correctamente." : "Partido creado correctamente.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo guardar el partido.");
    } finally {
      setMatchSaving(false);
    }
  };

  const getMatchScoreDraft = (match: AdminMatch) =>
    matchScoreDrafts[match.id] ?? {
      score1: String(match.score1),
      score2: String(match.score2),
      currentChukker: match.currentChukker ? String(match.currentChukker) : ""
    };

  const saveMatchScore = async (match: AdminMatch) => {
    const draft = getMatchScoreDraft(match);
    try {
      setMatchScoreSavingId(match.id);
      await updateMatchLiveState(match.id, {
        score1: Number(draft.score1) || 0,
        score2: Number(draft.score2) || 0,
        currentChukker: draft.currentChukker.trim() ? Number(draft.currentChukker) : undefined
      });
      const next = await listAdminMatches();
      setMatches(next);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo actualizar el partido.");
    } finally {
      setMatchScoreSavingId(null);
    }
  };

  const startEditEvent = (event: AdminSpotlightEvent) => {
    const scheduled = new Date(event.scheduledAt);
    const durationMinutes = event.endsAt
      ? Math.round((new Date(event.endsAt).getTime() - scheduled.getTime()) / 60000)
      : undefined;
    const { date, time } = toZonedDateTimeInputs(scheduled, ARGENTINA_TIME_ZONE);

    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      description: event.description ?? "",
      scheduledDate: date,
      scheduledTime: time,
      timeZone: ARGENTINA_TIME_ZONE,
      durationMinutes: durationMinutes ? String(durationMinutes) : "",
      youtubeUrl: event.youtubeUrl ?? "",
      backgroundImageUrl: event.backgroundImageUrl ?? ""
    });
  };

  const cancelEditEvent = () => {
    setEditingEventId(null);
    setEventForm(emptyEventForm);
  };

  const removeEvent = async (event: AdminSpotlightEvent) => {
    try {
      await deleteAdminSpotlightEvent(event.id);
      const next = await listAdminSpotlightEvents();
      setSpotlightEvents(next);
      if (editingEventId === event.id) cancelEditEvent();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo eliminar el evento.");
    }
  };

  const saveEvent = async () => {
    if (!eventForm.title.trim()) {
      Alert.alert("Error", "El título del evento es obligatorio.");
      return;
    }
    if (!eventForm.scheduledDate.trim() || !eventForm.scheduledTime.trim()) {
      Alert.alert("Error", "La fecha y hora del evento son obligatorias.");
      return;
    }

    const scheduledAt = fromZonedDateTimeInputs(eventForm.scheduledDate.trim(), eventForm.scheduledTime.trim(), eventForm.timeZone);
    if (Number.isNaN(scheduledAt.getTime())) {
      Alert.alert("Error", "La fecha/hora del evento no es válida.");
      return;
    }

    let endsAt: Date | undefined;
    const durationMinutes = Number(eventForm.durationMinutes);
    if (eventForm.durationMinutes.trim() && durationMinutes > 0) {
      endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);
    }

    const payload = {
      title: eventForm.title.trim(),
      description: eventForm.description.trim() || undefined,
      scheduledAt: scheduledAt.toISOString(),
      endsAt: endsAt?.toISOString(),
      youtubeUrl: eventForm.youtubeUrl.trim() || undefined,
      backgroundImageUrl: eventForm.backgroundImageUrl.trim() || undefined
    };

    try {
      setEventSaving(true);
      if (editingEventId) {
        await updateAdminSpotlightEvent(editingEventId, payload);
      } else {
        await createAdminSpotlightEvent(payload);
      }

      const next = await listAdminSpotlightEvents();
      setSpotlightEvents(next);
      cancelEditEvent();
      Alert.alert("Listo", editingEventId ? "Evento actualizado correctamente." : "Evento creado correctamente.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo guardar el evento.");
    } finally {
      setEventSaving(false);
    }
  };

  const tabs: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; count?: number }> = [
    { key: "dashboard", label: "Dashboard", icon: "grid-outline" },
    { key: "content", label: "Contenido", icon: "images-outline", count: contentItems.length },
    { key: "community", label: "Comunidad", icon: "people-outline", count: rooms.length },
    { key: "brands", label: "Marcas", icon: "pricetags-outline", count: brands.length },
    { key: "marketplace", label: "Mercado", icon: "cash-outline", count: marketplaceProducts.length },
    { key: "auctions", label: "Remates", icon: "ribbon-outline" },
    { key: "tournaments", label: "Torneos", icon: "trophy-outline", count: tournaments.length },
    { key: "matches", label: "Partidos", icon: "football-outline", count: matches.length },
    { key: "events", label: "Eventos", icon: "sparkles-outline", count: spotlightEvents.length }
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
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>Push notifications</Text>
                  <Text style={styles.helperText}>Envia una notificacion real al usuario admin autenticado en este dispositivo.</Text>
                </View>
                <Pressable style={styles.btnPrimary} onPress={() => { void sendPushTest(); }} disabled={pushTestSending}>
                  <Ionicons name="notifications-outline" size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{pushTestSending ? "Enviando..." : "Probar push"}</Text>
                </Pressable>
              </View>
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
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {(["all", "home", "community", "live"] as const).map((s) => (
                    <Pressable key={s} style={[styles.chip, activeSectionFilter === s && styles.chipActive]} onPress={() => setActiveSectionFilter(s)}>
                      <Text style={[styles.chipText, activeSectionFilter === s && styles.chipTextActive]}>{s === "all" ? "Todo" : s}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <ScrollView style={{ maxHeight: 520 }}>
                  {groupedContent.map((group) => (
                    <View key={`${group.section}-${group.slot}`} style={{ marginBottom: 16 }}>
                      <View style={styles.panelHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.groupLabel}>{group.title}</Text>
                          <Text style={styles.groupMeta}>
                            {group.items.length} elemento(s) · {group.items.filter((item) => item.isActive).length} activo(s)
                          </Text>
                        </View>
                        <Pressable style={styles.btnPrimary} onPress={() => startNewContent(group.section, group.slot)}>
                          <Ionicons name="add" size={16} color="#fff" />
                          <Text style={styles.btnPrimaryText}>Agregar</Text>
                        </Pressable>
                      </View>

                      {group.items.length === 0 ? (
                        <View style={styles.emptyStateBox}>
                          <Ionicons name="images-outline" size={20} color={colors.muted} />
                          <Text style={styles.emptyText}>Todavía no hay publicaciones en este espacio.</Text>
                          <Pressable style={styles.btnPrimary} onPress={() => startNewContent(group.section, group.slot)}>
                            <Text style={styles.btnPrimaryText}>Agregar la primera</Text>
                          </Pressable>
                        </View>
                      ) : group.items.map((item, index) => (
                        <Pressable key={item.id} style={[styles.contentRow, selectedContentId === item.id && styles.contentRowActive]} onPress={() => setSelectedContentId(item.id)}>
                          <Image source={resolveContentImageSource(item.imageUrl)} style={styles.contentThumb} resizeMode="contain" />
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.contentRowTitle} numberOfLines={1}>{item.title || group.title}</Text>
                            <Text style={styles.contentRowMeta}>Posición #{item.sortOrder}</Text>
                            <Text style={[styles.statusChip, item.isActive ? styles.statusActive : styles.statusMuted]}>
                              {item.isActive ? "Publicada" : "Pausada"}
                            </Text>
                          </View>
                          <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                            <Pressable disabled={index === 0 || contentBusyId === item.id} onPress={() => void moveContent(group.items, index, -1)}>
                              <Ionicons name="arrow-up" size={18} color={index === 0 ? colors.border : colors.muted} />
                            </Pressable>
                            <Pressable disabled={index === group.items.length - 1 || contentBusyId === item.id} onPress={() => void moveContent(group.items, index, 1)}>
                              <Ionicons name="arrow-down" size={18} color={index === group.items.length - 1 ? colors.border : colors.muted} />
                            </Pressable>
                            <Pressable disabled={contentBusyId === item.id} onPress={() => void toggleContentActive(item)}>
                              <Ionicons name={item.isActive ? "pause-circle-outline" : "play-circle-outline"} size={20} color={colors.primary} />
                            </Pressable>
                            <Pressable disabled={contentBusyId === item.id} onPress={() => void removeContent(item)}>
                              <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            </Pressable>
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
                  <Text style={styles.panelTitle}>{selectedContent ? "Editar publicidad" : "Nueva publicidad"}</Text>
                  {selectedContent ? (
                    <Pressable style={styles.btnSecondary} onPress={() => startNewContent(newSection, newSlot)}>
                      <Text style={styles.btnSecondaryText}>Nueva</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.fullField}>
                  <Text style={styles.fieldLabel}>Ubicación en la app</Text>
                  <View style={styles.readOnlyLocation}>
                    <Ionicons name="location-outline" size={16} color={colors.primaryDark} />
                    <Text style={styles.readOnlyLocationText}>
                      {contentSections.find((group) => group.section === newSection && group.slot === newSlot)?.titleKey
                        ? t(contentSections.find((group) => group.section === newSection && group.slot === newSlot)!.titleKey)
                        : `${newSection} / ${newSlot}`}
                    </Text>
                  </View>
                  <Text style={styles.helperText}>{newSection} / {newSlot}</Text>
                </View>

                <View style={styles.contentPreviewCard}>
                  {newImageUrl ? (
                    <Image source={resolveContentImageSource(newImageUrl)} style={styles.contentPreview} resizeMode="contain" />
                  ) : (
                    <View style={[styles.contentPreview, { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceStrong }]}>
                      <Ionicons name="image-outline" size={24} color={colors.muted} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.fieldLabel}>Estado</Text>
                    <Pressable style={[styles.chip, newIsActive && styles.chipActive]} onPress={() => setNewIsActive((current) => !current)}>
                      <Text style={[styles.chipText, newIsActive && styles.chipTextActive]}>{newIsActive ? "Publicada" : "Pausada"}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <LabeledInput label="Título (opcional)" value={newTitle} onChangeText={setNewTitle} placeholder="Nombre interno o título visible" />
                  <LabeledInput label="Posición (opcional)" value={newSortOrder} onChangeText={setNewSortOrder} placeholder="Se asigna sola si la dejás vacía" keyboardType="numeric" />
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
                  <Text style={styles.helperText}>Solo se aceptan archivos subidos.</Text>
                </View>
                <View style={styles.uploadBox}>
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.primaryDark} />
                  <Text style={styles.uploadLabel}>Subí una imagen desde la PC.</Text>
                  <Pressable style={styles.btnPrimary} onPress={() => (document as any).getElementById("admin-upload-input")?.click()}>
                    <Text style={styles.btnPrimaryText}>{uploading ? "Subiendo..." : "Elegir archivo"}</Text>
                  </Pressable>
                  <input type="file" accept="image/*" style={{ display: "none" }} id="admin-upload-input" onChange={async (e: any) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setUploading(true);
                    try { const u = await uploadAdminContentImage(file); setNewImageUrl(u.url); }
                    catch (error: any) { Alert.alert("Error", error?.message ?? "No se pudo subir la imagen."); }
                    finally { setUploading(false); e.target.value = ""; }
                  }} />
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.btnPrimary} disabled={contentSaving} onPress={() => void saveContent()}>
                    <Text style={styles.btnPrimaryText}>{contentSaving ? "Guardando..." : selectedContent ? "Guardar cambios" : "Crear publicidad"}</Text>
                  </Pressable>
                  {selectedContent ? (
                    <Pressable style={styles.btnDanger} onPress={() => void removeContent(selectedContent)}>
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
            <View style={styles.twoCol}>
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Comunidades ({rooms.length})</Text>
                  <Pressable style={styles.btnPrimary} onPress={startNewRoom}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Crear comunidad</Text>
                  </Pressable>
                </View>

                {rooms.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <Ionicons name="people-outline" size={22} color={colors.muted} />
                    <Text style={styles.emptyText}>Todavía no hay comunidades cargadas.</Text>
                    <Pressable style={styles.btnPrimary} onPress={startNewRoom}>
                      <Text style={styles.btnPrimaryText}>Crear la primera</Text>
                    </Pressable>
                  </View>
                ) : rooms.map((room) => (
                  <Pressable key={room.id} style={[styles.brandRow, selectedRoomId === room.id && styles.brandRowActive]} onPress={() => setSelectedRoomId(room.id)}>
                    <View style={[styles.brandRowLogo, { alignItems: "center", justifyContent: "center", backgroundColor: room.tone || colors.surfaceStrong }]}>
                      <Ionicons name={(room.icon as keyof typeof Ionicons.glyphMap) || "chatbubbles-outline"} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.brandRowName}>{room.title}</Text>
                      <Text style={styles.brandRowMeta}>
                        {room.kind} · {room._count?.memberships ?? 0} miembros · {room.isPublic ? "pública" : "privada"}{room.isRecommended ? " · recomendada" : ""}
                      </Text>
                    </View>
                    <Pressable onPress={() => startEditRoom(room)}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => void removeRoom(room)}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.panel, { gap: 10 }]}>
                <Text style={styles.panelTitle}>{editingRoomId ? "Editar comunidad" : "Nueva comunidad"}</Text>
                <View style={styles.formGrid}>
                  <LabeledInput label="Título" value={roomForm.title} onChangeText={(value) => setRoomForm((c) => ({ ...c, title: value }))} />
                </View>
                <View style={styles.fullField}>
                  <Text style={styles.fieldLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 70 }]}
                    value={roomForm.description}
                    onChangeText={(value) => setRoomForm((c) => ({ ...c, description: value }))}
                    placeholder=""
                    placeholderTextColor={colors.muted}
                    multiline
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Pressable style={[styles.chip, roomForm.isPublic && styles.chipActive]} onPress={() => setRoomForm((c) => ({ ...c, isPublic: !c.isPublic }))}>
                    <Text style={[styles.chipText, roomForm.isPublic && styles.chipTextActive]}>{roomForm.isPublic ? "Pública" : "Privada"}</Text>
                  </Pressable>
                  <Pressable style={[styles.chip, roomForm.isRecommended && styles.chipActive]} onPress={() => setRoomForm((c) => ({ ...c, isRecommended: !c.isRecommended }))}>
                    <Text style={[styles.chipText, roomForm.isRecommended && styles.chipTextActive]}>{roomForm.isRecommended ? "Recomendada" : "No recomendada"}</Text>
                  </Pressable>
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.btnPrimary} disabled={roomSaving} onPress={() => void saveRoom()}>
                    <Text style={styles.btnPrimaryText}>{roomSaving ? "Guardando..." : editingRoomId ? "Guardar cambios" : "Crear comunidad"}</Text>
                  </Pressable>
                  {editingRoomId ? (
                    <Pressable style={styles.btnSecondary} onPress={startNewRoom}>
                      <Text style={styles.btnSecondaryText}>Cancelar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Moderación de miembros</Text>
            {rooms.length === 0 ? (
              <View style={styles.panel}>
                <Text style={styles.emptyText}>Creá una comunidad para moderar sus miembros.</Text>
              </View>
            ) : (
              <>
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
                      <Text style={styles.emptyText}>Esta comunidad todavía no tiene miembros.</Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}
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
                {brands.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <Ionicons name="storefront-outline" size={22} color={colors.muted} />
                    <Text style={styles.emptyText}>Todavía no hay marcas cargadas. Completá el formulario para crear la primera.</Text>
                  </View>
                ) : null}
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
                  <Text style={styles.helperText}>Podés subir una imagen local y ajustarla antes de guardar.</Text>
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
                        <Text style={styles.helperText}>La imagen se define solo por subida de archivo.</Text>
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

        {/* ── MARKETPLACE MODERATION ── */}
        {activeTab === "marketplace" && (
          <View style={styles.section}>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Publicaciones ({marketplaceProducts.length})</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {[
                  { key: "pending_review", label: "En revisión" },
                  { key: "pending_payment", label: "Pago pendiente" },
                  { key: "active", label: "Activas" },
                  { key: "rejected", label: "Rechazadas" },
                  { key: "", label: "Todas" }
                ].map((filter) => (
                  <Pressable
                    key={filter.key || "all"}
                    style={[styles.tabItem, marketplaceStatusFilter === filter.key && styles.tabItemActive]}
                    onPress={() => setMarketplaceStatusFilter(filter.key)}
                  >
                    <Text style={[styles.tabLabel, marketplaceStatusFilter === filter.key && styles.tabLabelActive]}>{filter.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {marketplaceProducts.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="cash-outline" size={22} color={colors.muted} />
                  <Text style={styles.emptyText}>No hay publicaciones en este estado.</Text>
                </View>
              ) : null}

              {marketplaceProducts.map((product) => (
                <View key={product.id} style={[styles.brandRow, { alignItems: "flex-start" }]}>
                  {product.image ? (
                    <Image source={resolveContentImageSource(product.image)} style={styles.brandRowLogo} resizeMode="cover" />
                  ) : (
                    <View style={[styles.brandRowLogo, { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceStrong }]}>
                      <Ionicons name="cube-outline" size={18} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.brandRowName}>{product.name}</Text>
                    <Text style={styles.brandRowMeta}>{product.currency} {product.price.toLocaleString()} · {product.publicationStatus}</Text>
                    {product.seller ? <Text style={styles.brandRowMeta}>Vendedor: {product.seller.name}</Text> : null}
                    {product.lastPayment ? (
                      <Text style={styles.brandRowMeta}>
                        Pago: {product.lastPayment.status} ({product.lastPayment.currency} {(product.lastPayment.amountCents / 100).toLocaleString()})
                      </Text>
                    ) : null}
                    {product.publicationStatus === "pending_review" ? (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                        <Pressable
                          style={styles.btnPrimary}
                          disabled={marketplaceBusyId === product.id}
                          onPress={async () => {
                            setMarketplaceBusyId(product.id);
                            try {
                              await approveAdminMarketplaceProduct(product.id);
                              await loadMarketplaceProducts(marketplaceStatusFilter);
                            } catch (err: any) {
                              Alert.alert("Error", err?.message ?? "No se pudo aprobar la publicación.");
                            } finally {
                              setMarketplaceBusyId(null);
                            }
                          }}
                        >
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={styles.btnPrimaryText}>Aprobar</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.btnPrimary, { backgroundColor: colors.danger }]}
                          disabled={marketplaceBusyId === product.id}
                          onPress={async () => {
                            setMarketplaceBusyId(product.id);
                            try {
                              await rejectAdminMarketplaceProduct(product.id);
                              await loadMarketplaceProducts(marketplaceStatusFilter);
                            } catch (err: any) {
                              Alert.alert("Error", err?.message ?? "No se pudo rechazar la publicación.");
                            } finally {
                              setMarketplaceBusyId(null);
                            }
                          }}
                        >
                          <Ionicons name="close" size={16} color="#fff" />
                          <Text style={styles.btnPrimaryText}>Rechazar</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <Pressable
                        style={styles.btnDanger}
                        disabled={marketplaceBusyId === product.id}
                        onPress={async () => {
                          setMarketplaceBusyId(product.id);
                          try {
                            await deleteAdminMarketplaceProduct(product.id);
                            await loadMarketplaceProducts(marketplaceStatusFilter);
                          } catch (err: any) {
                            Alert.alert("Error", err?.message ?? "No se pudo eliminar la publicación.");
                          } finally {
                            setMarketplaceBusyId(null);
                          }
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={styles.btnDangerText}>Eliminar</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
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
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>{editingTournamentId ? "Editar torneo" : "Crear torneo"}</Text>
                  {editingTournamentId ? (
                    <Pressable style={styles.btnSecondary} onPress={resetTournamentForm}>
                      <Text style={styles.btnSecondaryText}>Nuevo</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.sectionLead}>Completá los datos principales para que aparezca en la app.</Text>
                <View style={styles.formGrid}>
                  <LabeledInput label="Nombre *" value={tournamentForm.name} onChangeText={(v) => setTournamentForm((f) => ({ ...f, name: v }))} />
                  <AdminDateTimeField label="Inicio" date={tournamentForm.startDate} onDateChange={(v) => setTournamentForm((f) => ({ ...f, startDate: v }))} required />
                  <AdminDateTimeField label="Fin" date={tournamentForm.endDate} onDateChange={(v) => setTournamentForm((f) => ({ ...f, endDate: v }))} />
                  <LabeledInput label="Nivel" value={tournamentForm.levelLabel} onChangeText={(v) => setTournamentForm((f) => ({ ...f, levelLabel: v }))} />
                  <LabeledInput label="Handicap mínimo" value={tournamentForm.minHandicap} onChangeText={(v) => setTournamentForm((f) => ({ ...f, minHandicap: v }))} keyboardType="numeric" />
                  <LabeledInput label="Handicap máximo" value={tournamentForm.maxHandicap} onChangeText={(v) => setTournamentForm((f) => ({ ...f, maxHandicap: v }))} keyboardType="numeric" />
                  <LabeledInput label="Máx. equipos" value={tournamentForm.maxTeams} onChangeText={(v) => setTournamentForm((f) => ({ ...f, maxTeams: v }))} keyboardType="numeric" />
                  <LabeledInput label="Contacto" value={tournamentForm.contactName} onChangeText={(v) => setTournamentForm((f) => ({ ...f, contactName: v }))} />
                  <LabeledInput label="Teléfono contacto" value={tournamentForm.contactPhone} onChangeText={(v) => setTournamentForm((f) => ({ ...f, contactPhone: v }))} keyboardType="phone-pad" />
                </View>
                <Pressable style={styles.btnPrimary} onPress={() => { void saveTournament(); }} disabled={tournamentSaving}>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{tournamentSaving ? "Guardando..." : editingTournamentId ? "Guardar cambios" : "Guardar torneo"}</Text>
                </Pressable>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Torneos cargados ({tournaments.length})</Text>
                <Text style={styles.helperText}>Vista rápida de lo que ya está disponible en la app.</Text>
                <ScrollView style={{ maxHeight: 560 }}>
                  {tournaments.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Ionicons name="trophy-outline" size={22} color={colors.muted} />
                      <Text style={styles.emptyText}>Todavía no hay torneos. Creá el primero desde el formulario.</Text>
                    </View>
                  ) : null}
                  {tournaments.map((tournament) => (
                    <View key={tournament.id} style={styles.tournamentRow}>
                      <Text style={styles.tournamentName}>{tournament.name}</Text>
                      <Text style={styles.tournamentMeta}>Inicio: {new Date(tournament.startDate).toLocaleDateString("es-AR")}</Text>
                      {tournament.endDate ? <Text style={styles.tournamentMeta}>Fin: {new Date(tournament.endDate).toLocaleDateString("es-AR")}</Text> : null}
                      {tournament.levelLabel ? <Text style={styles.tournamentMeta}>Nivel: {tournament.levelLabel}</Text> : null}
                      {tournament.minHandicap !== null && tournament.minHandicap !== undefined && tournament.maxHandicap !== null && tournament.maxHandicap !== undefined ? (
                        <Text style={styles.tournamentMeta}>Handicap: {tournament.minHandicap} a {tournament.maxHandicap} goles</Text>
                      ) : null}
                      {tournament.maxTeams ? <Text style={styles.tournamentMeta}>Máx. equipos: {tournament.maxTeams}</Text> : null}
                      {tournament.contactName ? <Text style={styles.tournamentMeta}>Contacto: {tournament.contactName}</Text> : null}
                      {tournament.contactPhone ? <Text style={styles.tournamentMeta}>Teléfono: {tournament.contactPhone}</Text> : null}
                      <View style={styles.actionRow}>
                        <Pressable style={styles.btnSecondary} onPress={() => startEditTournament(tournament)}>
                          <Text style={styles.btnSecondaryText}>Editar</Text>
                        </Pressable>
                        <Pressable style={styles.btnDanger} onPress={() => { void removeTournament(tournament); }}>
                          <Text style={styles.btnDangerText}>Eliminar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {tournaments.length === 0 ? <Text style={styles.emptyText}>Todavía no hay torneos cargados desde admin.</Text> : null}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

        {/* ── MATCHES (live broadcast) ── */}
        {activeTab === "matches" && (
          <View style={styles.section}>
            <View style={styles.twoCol}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Crear equipo</Text>
                <Text style={styles.sectionLead}>Nombre y logo del equipo para usarlo en los partidos.</Text>
                <View style={styles.formGrid}>
                  <LabeledInput label="Nombre *" value={teamForm.name} onChangeText={(v) => setTeamForm((f) => ({ ...f, name: v }))} placeholder="Ej: La Dolfina" />
                </View>
                <View style={styles.uploadBox}>
                  {teamForm.logoUrl ? <Image source={resolveContentImageSource(teamForm.logoUrl)} style={styles.contentPreview} resizeMode="contain" /> : null}
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.primaryDark} />
                  <Text style={styles.uploadLabel}>Subí el logo del equipo.</Text>
                  <Pressable style={styles.btnPrimary} onPress={() => (document as any).getElementById("admin-team-logo-input")?.click()}>
                    <Text style={styles.btnPrimaryText}>{teamLogoUploading ? "Subiendo..." : "Elegir archivo"}</Text>
                  </Pressable>
                  <input type="file" accept="image/*" style={{ display: "none" }} id="admin-team-logo-input" onChange={async (e: any) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setTeamLogoUploading(true);
                    try { const u = await uploadAdminTeamLogo(file); setTeamForm((f) => ({ ...f, logoUrl: u.url })); }
                    finally { setTeamLogoUploading(false); }
                  }} />
                </View>
                <Pressable style={styles.btnPrimary} onPress={() => { void saveTeam(); }} disabled={teamSaving}>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{teamSaving ? "Guardando..." : "Guardar equipo"}</Text>
                </Pressable>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Equipos cargados ({teams.length})</Text>
                <LabeledInput label="Buscar equipo" value={teamSearchQuery} onChangeText={setTeamSearchQuery} placeholder="Escribí un nombre..." autoCapitalize="none" />
                <ScrollView style={{ maxHeight: 360, marginTop: 8 }}>
                  {filteredTeamsForSearch.map((team) => (
                    <View key={team.id} style={[styles.tournamentRow, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        {team.logoUrl ? <Image source={resolveContentImageSource(team.logoUrl)} style={{ width: 32, height: 32, borderRadius: 8 }} resizeMode="cover" /> : null}
                        <Text style={styles.tournamentName}>{team.name}</Text>
                      </View>
                      <Pressable onPress={() => { void removeTeam(team); }}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                  {filteredTeamsForSearch.length === 0 ? <Text style={styles.emptyText}>{teams.length === 0 ? "Todavía no hay equipos cargados." : "Ningún equipo coincide con la búsqueda."}</Text> : null}
                </ScrollView>
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>{editingMatchId ? "Editar / reprogramar partido" : "Programar partido en vivo"}</Text>
                <Text style={styles.sectionLead}>El estado (por disputarse / en vivo / finalizado) se calcula solo según la fecha, hora y duración; no se elige a mano. Para cancelar un partido, eliminalo de la lista. Para posponerlo, editalo y cambiá la fecha/hora.</Text>

                <Text style={styles.fieldLabel}>Buscar equipo</Text>
                <LabeledInput label="" value={teamSearchQuery} onChangeText={setTeamSearchQuery} placeholder="Escribí para filtrar los equipos..." autoCapitalize="none" />

                <Text style={styles.fieldLabel}>Equipo 1 *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopSelectorRow}>
                  {filteredTeamsForSearch.map((team) => (
                    <Pressable key={team.id} style={[styles.shopChip, matchForm.team1Id === team.id && styles.shopChipActive]} onPress={() => setMatchForm((f) => ({ ...f, team1Id: team.id }))}>
                      <Text style={[styles.shopChipText, matchForm.team1Id === team.id && styles.shopChipTextActive]} numberOfLines={1}>{team.name}</Text>
                    </Pressable>
                  ))}
                  {teams.length === 0 ? <Text style={styles.helperText}>Creá al menos dos equipos primero.</Text> : null}
                </ScrollView>

                <Text style={styles.fieldLabel}>Equipo 2 *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopSelectorRow}>
                  {filteredTeamsForSearch.map((team) => (
                    <Pressable key={team.id} style={[styles.shopChip, matchForm.team2Id === team.id && styles.shopChipActive]} onPress={() => setMatchForm((f) => ({ ...f, team2Id: team.id }))}>
                      <Text style={[styles.shopChipText, matchForm.team2Id === team.id && styles.shopChipTextActive]} numberOfLines={1}>{team.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Buscar torneo</Text>
                <LabeledInput label="" value={tournamentSearchQuery} onChangeText={setTournamentSearchQuery} placeholder="Escribí para filtrar los torneos..." autoCapitalize="none" />

                <Text style={styles.fieldLabel}>Torneo (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopSelectorRow}>
                  <Pressable style={[styles.shopChip, matchForm.tournamentId === "" && styles.shopChipActive]} onPress={() => setMatchForm((f) => ({ ...f, tournamentId: "" }))}>
                    <Text style={[styles.shopChipText, matchForm.tournamentId === "" && styles.shopChipTextActive]}>Ninguno</Text>
                  </Pressable>
                  {filteredTournamentsForSearch.map((tournament) => (
                    <Pressable key={tournament.id} style={[styles.shopChip, matchForm.tournamentId === tournament.id && styles.shopChipActive]} onPress={() => setMatchForm((f) => ({ ...f, tournamentId: tournament.id }))}>
                      <Text style={[styles.shopChipText, matchForm.tournamentId === tournament.id && styles.shopChipTextActive]} numberOfLines={1}>{tournament.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={styles.formGrid}>
                  <AdminDateTimeField
                    label="Fecha y hora"
                    date={matchForm.scheduledDate}
                    time={matchForm.scheduledTime}
                    timezone={matchForm.timeZone}
                    timezoneOptions={adminTimeZoneOptions}
                    onDateChange={(v) => setMatchForm((f) => ({ ...f, scheduledDate: v }))}
                    onTimeChange={(v) => setMatchForm((f) => ({ ...f, scheduledTime: v }))}
                    onTimezoneChange={(v) => setMatchForm((f) => ({ ...f, timeZone: v }))}
                    required
                  />
                  <LabeledInput label="Duración (minutos, opcional)" value={matchForm.durationMinutes} onChangeText={(v) => setMatchForm((f) => ({ ...f, durationMinutes: v }))} keyboardType="numeric" placeholder="120" />
                  <LabeledInput label="Nombre de competencia (opcional)" value={matchForm.competitionName} onChangeText={(v) => setMatchForm((f) => ({ ...f, competitionName: v }))} placeholder="129° Abierto Argentino de Polo" />
                  <LabeledInput label="Link de YouTube" value={matchForm.youtubeUrl} onChangeText={(v) => setMatchForm((f) => ({ ...f, youtubeUrl: v }))} placeholder="https://www.youtube.com/live/..." autoCapitalize="none" />
                </View>
                <Text style={styles.helperText}>Sin duración, el partido queda "en vivo" hasta que lo edites o lo elimines.</Text>

                <View style={styles.uploadBox}>
                  {matchForm.backgroundImageUrl ? <Image source={resolveContentImageSource(matchForm.backgroundImageUrl)} style={styles.contentPreview} resizeMode="cover" /> : null}
                  <Ionicons name="image-outline" size={22} color={colors.primaryDark} />
                  <Text style={styles.uploadLabel}>Imagen de fondo del slide (opcional; si no subís una, se usa la imagen genérica de partido en vivo).</Text>
                  <Pressable style={styles.btnPrimary} onPress={() => (document as any).getElementById("admin-match-bg-input")?.click()}>
                    <Text style={styles.btnPrimaryText}>{matchImageUploading ? "Subiendo..." : "Elegir archivo"}</Text>
                  </Pressable>
                  <input type="file" accept="image/*" style={{ display: "none" }} id="admin-match-bg-input" onChange={async (e: any) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setMatchImageUploading(true);
                    try { const u = await uploadAdminMatchImage(file); setMatchForm((f) => ({ ...f, backgroundImageUrl: u.url })); }
                    finally { setMatchImageUploading(false); }
                  }} />
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.btnPrimary} onPress={() => { void saveMatch(); }} disabled={matchSaving}>
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={styles.btnPrimaryText}>{matchSaving ? "Guardando..." : editingMatchId ? "Guardar cambios" : "Guardar partido"}</Text>
                  </Pressable>
                  {editingMatchId ? (
                    <Pressable style={styles.btnSecondary} onPress={cancelEditMatch}>
                      <Text style={styles.btnSecondaryText}>Cancelar edición</Text>
                    </Pressable>
                  ) : null}
                </View>

                {editingMatchId ? (
                  <View style={{ marginTop: 20 }}>
                    <Text style={styles.panelTitle}>Formación y árbitros</Text>
                    <Text style={styles.sectionLead}>Nombre completo y handicap de cada jugador (hasta 4 por equipo). Se crean como jugadores reales si no existían.</Text>
                    <View style={styles.formGrid}>
                      {(["team1", "team2"] as const).map((teamKey) => (
                        <View key={teamKey} style={{ width: "100%" }}>
                          <Text style={styles.fieldLabel}>{teamKey === "team1" ? "Local" : "Visitante"}</Text>
                          <View style={styles.formGrid}>
                            {lineupForm[teamKey].map((slot, index) => (
                              <View key={index} style={{ flexDirection: "row", gap: 8, width: "100%" }}>
                                <LabeledInput
                                  label={`Jugador ${index + 1}`}
                                  value={slot.name}
                                  onChangeText={(v) => setLineupForm((f) => { const next = { ...f, [teamKey]: [...f[teamKey]] }; next[teamKey][index] = { ...next[teamKey][index], name: v }; return next; })}
                                  placeholder="Nombre completo"
                                />
                                <LabeledInput
                                  label="Handicap"
                                  value={slot.handicap}
                                  onChangeText={(v) => setLineupForm((f) => { const next = { ...f, [teamKey]: [...f[teamKey]] }; next[teamKey][index] = { ...next[teamKey][index], handicap: v }; return next; })}
                                  keyboardType="numeric"
                                  placeholder="0-10"
                                />
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                    <View style={styles.formGrid}>
                      <LabeledInput label="Árbitro principal" value={lineupForm.refereeMain} onChangeText={(v) => setLineupForm((f) => ({ ...f, refereeMain: v }))} placeholder="Nombre completo" />
                      <LabeledInput label="Árbitro asistente" value={lineupForm.refereeAssistant} onChangeText={(v) => setLineupForm((f) => ({ ...f, refereeAssistant: v }))} placeholder="Nombre completo" />
                    </View>
                    <Pressable style={styles.btnPrimary} onPress={() => { void saveLineup(); }} disabled={lineupSaving}>
                      <Text style={styles.btnPrimaryText}>{lineupSaving ? "Guardando..." : "Guardar formación"}</Text>
                    </Pressable>

                    <Text style={[styles.panelTitle, { marginTop: 20 }]}>Agregar comentario</Text>
                    <View style={styles.formGrid}>
                      <LabeledInput label="Título" value={commentForm.title} onChangeText={(v) => setCommentForm((f) => ({ ...f, title: v }))} placeholder="Ej: Gol de La Dolfina" />
                      <LabeledInput label="Texto" value={commentForm.body} onChangeText={(v) => setCommentForm((f) => ({ ...f, body: v }))} placeholder="Detalle del comentario" />
                    </View>
                    <Pressable style={styles.btnPrimary} onPress={() => { void postComment(); }} disabled={commentSaving}>
                      <Text style={styles.btnPrimaryText}>{commentSaving ? "Guardando..." : "Agregar comentario"}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Partidos cargados ({matches.length})</Text>
                <Text style={styles.helperText}>Actualizá marcador y chukker mientras se juega. El estado se calcula solo.</Text>
                <ScrollView style={{ maxHeight: 700 }}>
                  {matches.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Ionicons name="football-outline" size={22} color={colors.muted} />
                      <Text style={styles.emptyText}>Todavía no hay partidos programados.</Text>
                    </View>
                  ) : null}
                  {matches.map((match) => {
                    const draft = getMatchScoreDraft(match);
                    return (
                      <View key={match.id} style={styles.tournamentRow}>
                        <Text style={styles.tournamentName}>{match.team1.name} vs {match.team2.name}</Text>
                        <Text style={styles.tournamentMeta}>{new Date(match.scheduledAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false })}{match.endsAt ? ` → ${new Date(match.endsAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false })}` : ""}</Text>
                        {match.tournament ? <Text style={styles.tournamentMeta}>Torneo: {match.tournament.name}</Text> : null}
                        <Text style={styles.tournamentMeta}>Estado: {matchStatusLabels[match.status]}</Text>
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                          <TextInput
                            value={draft.score1}
                            onChangeText={(v) => setMatchScoreDrafts((d) => ({ ...d, [match.id]: { ...getMatchScoreDraft(match), score1: v } }))}
                            keyboardType="numeric"
                            style={styles.scoreInput}
                          />
                          <Text style={styles.tournamentMeta}>-</Text>
                          <TextInput
                            value={draft.score2}
                            onChangeText={(v) => setMatchScoreDrafts((d) => ({ ...d, [match.id]: { ...getMatchScoreDraft(match), score2: v } }))}
                            keyboardType="numeric"
                            style={styles.scoreInput}
                          />
                          <TextInput
                            value={draft.currentChukker}
                            onChangeText={(v) => setMatchScoreDrafts((d) => ({ ...d, [match.id]: { ...getMatchScoreDraft(match), currentChukker: v } }))}
                            keyboardType="numeric"
                            placeholder="Chukker"
                            placeholderTextColor={colors.muted}
                            style={styles.scoreInput}
                          />
                        </View>
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          <Pressable style={styles.btnSecondary} onPress={() => { void saveMatchScore(match); }} disabled={matchScoreSavingId === match.id}>
                            <Text style={styles.btnSecondaryText}>{matchScoreSavingId === match.id ? "Guardando..." : "Actualizar marcador"}</Text>
                          </Pressable>
                          <Pressable style={styles.btnSecondary} onPress={() => startEditMatch(match)}>
                            <Text style={styles.btnSecondaryText}>Editar</Text>
                          </Pressable>
                          <Pressable style={styles.btnDanger} onPress={() => { void removeMatch(match); }}>
                            <Text style={styles.btnDangerText}>Eliminar</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                  {matches.length === 0 ? <Text style={styles.emptyText}>Todavía no hay partidos cargados.</Text> : null}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

        {/* ── SPOTLIGHT EVENTS (generic carousel highlight, not a match) ── */}
        {activeTab === "events" && (
          <View style={styles.section}>
            <View style={styles.twoCol}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>{editingEventId ? "Editar evento" : "Crear evento"}</Text>
                <Text style={styles.sectionLead}>Para cosas que no son un partido: entrevistas, previas, etc. Solo aparece en el carrusel del home mientras está en vivo; no figura en Torneos ni en la sección En vivo.</Text>
                <View style={styles.formGrid}>
                  <LabeledInput label="Título *" value={eventForm.title} onChangeText={(v) => setEventForm((f) => ({ ...f, title: v }))} placeholder="Ej: Entrevista con Adolfo Cambiaso" />
                  <LabeledInput label="Descripción breve" value={eventForm.description} onChangeText={(v) => setEventForm((f) => ({ ...f, description: v }))} placeholder="Una frase corta" />
                  <AdminDateTimeField
                    label="Fecha y hora"
                    date={eventForm.scheduledDate}
                    time={eventForm.scheduledTime}
                    timezone={eventForm.timeZone}
                    timezoneOptions={adminTimeZoneOptions}
                    onDateChange={(v) => setEventForm((f) => ({ ...f, scheduledDate: v }))}
                    onTimeChange={(v) => setEventForm((f) => ({ ...f, scheduledTime: v }))}
                    onTimezoneChange={(v) => setEventForm((f) => ({ ...f, timeZone: v }))}
                    required
                  />
                  <LabeledInput label="Duración (minutos, opcional)" value={eventForm.durationMinutes} onChangeText={(v) => setEventForm((f) => ({ ...f, durationMinutes: v }))} keyboardType="numeric" placeholder="30" />
                  <LabeledInput label="Link de YouTube" value={eventForm.youtubeUrl} onChangeText={(v) => setEventForm((f) => ({ ...f, youtubeUrl: v }))} placeholder="https://www.youtube.com/live/..." autoCapitalize="none" />
                </View>
                <Text style={styles.helperText}>Sin duración, el evento queda "en vivo" hasta que lo edites o lo elimines.</Text>

                <View style={styles.uploadBox}>
                  {eventForm.backgroundImageUrl ? <Image source={resolveContentImageSource(eventForm.backgroundImageUrl)} style={styles.contentPreview} resizeMode="cover" /> : null}
                  <Ionicons name="image-outline" size={22} color={colors.primaryDark} />
                  <Text style={styles.uploadLabel}>Imagen de fondo del slide (opcional).</Text>
                  <Pressable style={styles.btnPrimary} onPress={() => (document as any).getElementById("admin-event-bg-input")?.click()}>
                    <Text style={styles.btnPrimaryText}>{eventImageUploading ? "Subiendo..." : "Elegir archivo"}</Text>
                  </Pressable>
                  <input type="file" accept="image/*" style={{ display: "none" }} id="admin-event-bg-input" onChange={async (e: any) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setEventImageUploading(true);
                    try { const u = await uploadAdminSpotlightEventImage(file); setEventForm((f) => ({ ...f, backgroundImageUrl: u.url })); }
                    finally { setEventImageUploading(false); }
                  }} />
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.btnPrimary} onPress={() => { void saveEvent(); }} disabled={eventSaving}>
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={styles.btnPrimaryText}>{eventSaving ? "Guardando..." : editingEventId ? "Guardar cambios" : "Guardar evento"}</Text>
                  </Pressable>
                  {editingEventId ? (
                    <Pressable style={styles.btnSecondary} onPress={cancelEditEvent}>
                      <Text style={styles.btnSecondaryText}>Cancelar edición</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Eventos cargados ({spotlightEvents.length})</Text>
                <ScrollView style={{ maxHeight: 700 }}>
                  {spotlightEvents.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Ionicons name="sparkles-outline" size={22} color={colors.muted} />
                      <Text style={styles.emptyText}>Todavía no hay eventos destacados.</Text>
                    </View>
                  ) : null}
                  {spotlightEvents.map((event) => (
                    <View key={event.id} style={styles.tournamentRow}>
                      <Text style={styles.tournamentName}>{event.title}</Text>
                      {event.description ? <Text style={styles.tournamentMeta}>{event.description}</Text> : null}
                      <Text style={styles.tournamentMeta}>{new Date(event.scheduledAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false })}{event.endsAt ? ` → ${new Date(event.endsAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false })}` : ""}</Text>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <Pressable style={styles.btnSecondary} onPress={() => startEditEvent(event)}>
                          <Text style={styles.btnSecondaryText}>Editar</Text>
                        </Pressable>
                        <Pressable style={styles.btnDanger} onPress={() => { void removeEvent(event); }}>
                          <Text style={styles.btnDangerText}>Eliminar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {spotlightEvents.length === 0 ? <Text style={styles.emptyText}>Todavía no hay eventos cargados.</Text> : null}
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
  btnDanger: { minHeight: 40, borderRadius: 12, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: "#ffd0c9", flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingHorizontal: 14 },
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
  emptyStateBox: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
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
  readOnlyLocation: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  readOnlyLocationText: { color: colors.text, fontSize: 13, fontWeight: "800" },
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
  tournamentMeta: { color: colors.muted, fontSize: 12 },

  // Matches
  scoreInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 64, color: colors.text, backgroundColor: colors.surface }
});
