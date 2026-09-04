import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, radius, useThemeColors } from "@/constants/theme";
import { useLocale, type Locale } from "@/contexts/LocaleContext";

type IconName = keyof typeof Ionicons.glyphMap;
type HelpCategoryId = "all" | "account" | "market" | "live" | "community" | "auctions" | "admin";

type HelpCategory = {
  id: HelpCategoryId;
  label: string;
  icon: IconName;
};

type HelpArticle = {
  id: string;
  category: Exclude<HelpCategoryId, "all">;
  title: string;
  summary: string;
  steps: string[];
  icon: IconName;
  badge?: string;
  route?: Href;
};

type HelpFaq = {
  id: string;
  question: string;
  answer: string;
};

type HelpContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  statusTitle: string;
  statusText: string;
  responseTitle: string;
  responseText: string;
  versionTitle: string;
  versionText: string;
  featuredTitle: string;
  searchResultsTitle: string;
  categories: HelpCategory[];
  emptyTitle: string;
  emptyText: string;
  guidesTitle: string;
  open: string;
  faqTitle: string;
  contactTitle: string;
  contactText: string;
  emailSupport: string;
  reportIssue: string;
  articles: HelpArticle[];
  faqs: HelpFaq[];
};

const helpContent: Record<Locale, HelpContent> = {
  "es-AR": {
    eyebrow: "Soporte",
    title: "Centro de ayuda",
    subtitle: "Guías claras para cuenta, mercado, remates, partidos, comunidad y administración.",
    searchPlaceholder: "Buscar por tema, pantalla o problema",
    statusTitle: "Servicios operativos",
    statusText: "App, API, imágenes y noticias disponibles.",
    responseTitle: "Respuesta prioritaria",
    responseText: "Consultas de cuenta y publicaciones primero.",
    versionTitle: "App actualizada",
    versionText: "Incluye mercado real, remates, noticias y perfil.",
    featuredTitle: "Atajos recomendados",
    searchResultsTitle: "Resultados posibles",
    categories: [
      { id: "all", label: "Todo", icon: "apps-outline" },
      { id: "account", label: "Cuenta", icon: "person-circle-outline" },
      { id: "market", label: "Mercado", icon: "pricetag-outline" },
      { id: "live", label: "Partidos", icon: "radio-outline" },
      { id: "community", label: "Comunidad", icon: "people-outline" },
      { id: "auctions", label: "Remates", icon: "trail-sign-outline" },
      { id: "admin", label: "Admin", icon: "shield-checkmark-outline" }
    ],
    emptyTitle: "No encontramos resultados",
    emptyText: "Probá con cuenta, producto, remate, noticia, contraseña o chat.",
    guidesTitle: "Guías de ayuda",
    open: "Abrir",
    faqTitle: "Preguntas frecuentes",
    contactTitle: "Necesitás más ayuda",
    contactText: "Mandanos el detalle del problema con tu usuario, pantalla y una captura si aplica.",
    emailSupport: "Escribir a soporte",
    reportIssue: "Reportar problema técnico",
    articles: [
      {
        id: "profile-name",
        category: "account",
        title: "Editar nombre, foto y datos de perfil",
        summary: "Actualizá nombre, apellido y avatar sin tocar tu contraseña.",
        steps: [
          "Entrá a Mi perfil desde el menú lateral.",
          "Tocá tu foto para sacar una imagen o elegirla desde la galería.",
          "Cambiá nombre o apellido y usá Guardar perfil. El cambio de contraseña queda separado."
        ],
        icon: "id-card-outline",
        route: "/profile"
      },
      {
        id: "password-reset",
        category: "account",
        title: "Recuperar o cambiar contraseña",
        summary: "Usá código por email si no recordás la clave, o cambiála desde perfil.",
        steps: [
          "Desde login tocá Olvidaste tu contraseña o desde perfil tocá Olvidé mi contraseña.",
          "Pedí el código, revisá tu email y cargá una contraseña nueva.",
          "Si recordás la clave actual, usá Cambiar contraseña dentro de Mi perfil."
        ],
        icon: "key-outline",
        route: { pathname: "/profile", params: { section: "password" } }
      },
      {
        id: "market-buy",
        category: "market",
        title: "Comprar y contactar vendedores",
        summary: "Abrí cualquier producto, revisá detalle y contactá por llamada o WhatsApp.",
        steps: [
          "Entrá a Mercado y filtrá por categoría o búsqueda.",
          "Tocá un producto para ver precio, estado, descripción y vendedor.",
          "Usá Contactar vendedor, Llamar o WhatsApp según el dato disponible."
        ],
        icon: "chatbubble-ellipses-outline",
        route: "/(tabs)/market"
      },
      {
        id: "market-favorites",
        category: "market",
        title: "Favoritos y productos guardados",
        summary: "Guardá productos con el corazón y abrilos después desde Favoritos.",
        steps: [
          "Tocá el corazón en una publicación de Mercado o en el detalle del producto.",
          "Abrí Favoritos desde el menú lateral o desde el botón del Mercado.",
          "Tocá la tarjeta para entrar al detalle, o el corazón para quitarla."
        ],
        icon: "heart-outline",
        route: "/favorites"
      },
      {
        id: "market-publish",
        category: "market",
        title: "Publicar productos con fotos reales",
        summary: "Creá publicaciones con cámara o galería y datos completos del producto.",
        steps: [
          "En Mercado tocá Publicar.",
          "Elegí foto desde cámara o galería, completá título, precio, estado y descripción.",
          "Si tu usuario no es admin, la publicación queda en revisión cuando corresponde."
        ],
        icon: "camera-outline",
        route: "/market-publish",
        badge: "Fotos reales"
      },
      {
        id: "live-matches",
        category: "live",
        title: "Partidos en vivo y emitidos",
        summary: "Seguí partidos activos primero y consultá transmisiones anteriores.",
        steps: [
          "Entrá a En vivo para ver partidos por fecha y estado.",
          "Abrí un partido para consultar marcador, formación, estadísticas y transmisión.",
          "En Partidos emitidos encontrás el historial con enlaces de video."
        ],
        icon: "radio-outline",
        route: "/(tabs)/live"
      },
      {
        id: "home-news",
        category: "live",
        title: "Noticias y portada de inicio",
        summary: "La portada prioriza vivos; si no hay partidos muestra noticias reales de Polohub.",
        steps: [
          "Abrí Inicio para ver el carrusel principal.",
          "Cuando hay partido en vivo, aparece primero con acceso directo.",
          "Si no hay vivo, la app levanta noticias e imágenes reales de Polohub."
        ],
        icon: "newspaper-outline",
        route: "/(tabs)"
      },
      {
        id: "community-chat",
        category: "community",
        title: "Chats de comunidad",
        summary: "Unite a salas, seguí conversaciones y mantené los mensajes ordenados.",
        steps: [
          "Entrá a Comunidad y revisá tus salas unidas y recomendadas.",
          "Tocá una sala para abrir el chat grupal.",
          "Los mensajes se sincronizan por usuario para que cada cliente vea correctamente los propios y ajenos."
        ],
        icon: "people-outline",
        route: "/(tabs)/community"
      },
      {
        id: "horse-auctions",
        category: "auctions",
        title: "Remates de caballos",
        summary: "Consultá eventos, lotes, caballos, precios base y datos de contacto.",
        steps: [
          "Entrá a Remates desde Inicio o el acceso correspondiente.",
          "Abrí un evento para ver caballos por lote con fotos reales cargadas desde dispositivo.",
          "Usá la información del evento para contactar al responsable del remate."
        ],
        icon: "trail-sign-outline",
        route: "/horse-auctions"
      },
      {
        id: "notifications-settings",
        category: "account",
        title: "Notificaciones, idioma y tema",
        summary: "Controlá avisos, idioma español/inglés y modo claro/oscuro.",
        steps: [
          "Abrí Configuración desde el menú lateral.",
          "Elegí tema claro u oscuro y cambiá el idioma de la app.",
          "Activá o apagá notificaciones de mensajes, partidos, torneos, mercado y sistema."
        ],
        icon: "settings-outline",
        route: "/settings"
      },
      {
        id: "admin-panel",
        category: "admin",
        title: "Panel admin y contenido",
        summary: "Gestioná contenido, publicaciones, remates y operaciones protegidas si tenés rol admin.",
        steps: [
          "Entrá con una cuenta autorizada al panel admin.",
          "Gestioná contenido público, remates y publicaciones según permisos.",
          "Las acciones sensibles requieren sesión iniciada y están protegidas contra accesos no autorizados."
        ],
        icon: "shield-checkmark-outline",
        route: "/admin-panel",
        badge: "Admin"
      }
    ],
    faqs: [
      {
        id: "no-products",
        question: "¿Por qué no veo productos en el mercado?",
        answer: "El mercado muestra publicaciones reales de la comunidad. Si todavía no hay ninguna, animáte a publicar la primera desde la app."
      },
      {
        id: "upload-image-fails",
        question: "¿Por qué no carga una foto que subí?",
        answer: "Si tenés conexión inestable la imagen puede tardar en mostrarse. Volvé a intentar o elegí otra foto desde tu galería o cámara."
      },
      {
        id: "news-order",
        question: "¿Qué aparece primero en Inicio?",
        answer: "Primero los partidos en vivo. Si no hay vivos, se priorizan noticias reales con imagen y enlace de lectura."
      },
      {
        id: "publish-review",
        question: "¿Mi publicación aparece al instante?",
        answer: "Depende del rol y de las reglas de publicación. Algunas publicaciones pueden quedar en revisión antes de mostrarse activas."
      }
    ]
  },
  "en-US": {
    eyebrow: "Support",
    title: "Help center",
    subtitle: "Clear guides for account, market, auctions, matches, community, and admin flows.",
    searchPlaceholder: "Search by topic, screen, or issue",
    statusTitle: "Services operational",
    statusText: "App, API, images, and news are available.",
    responseTitle: "Priority response",
    responseText: "Account and listing issues first.",
    versionTitle: "App updated",
    versionText: "Includes market, auctions, news, and profile.",
    featuredTitle: "Recommended shortcuts",
    searchResultsTitle: "Possible results",
    categories: [
      { id: "all", label: "All", icon: "apps-outline" },
      { id: "account", label: "Account", icon: "person-circle-outline" },
      { id: "market", label: "Market", icon: "pricetag-outline" },
      { id: "live", label: "Matches", icon: "radio-outline" },
      { id: "community", label: "Community", icon: "people-outline" },
      { id: "auctions", label: "Auctions", icon: "trail-sign-outline" },
      { id: "admin", label: "Admin", icon: "shield-checkmark-outline" }
    ],
    emptyTitle: "No results found",
    emptyText: "Try account, product, auction, news, password, or chat.",
    guidesTitle: "Help guides",
    open: "Open",
    faqTitle: "Frequently asked questions",
    contactTitle: "Need more help",
    contactText: "Send the issue details with your username, screen, and a screenshot if useful.",
    emailSupport: "Email support",
    reportIssue: "Report technical issue",
    articles: [
      {
        id: "profile-name",
        category: "account",
        title: "Edit name, photo, and profile data",
        summary: "Update first name, last name, and avatar without touching your password.",
        steps: ["Open My profile from the side menu.", "Tap your photo to use camera or gallery.", "Edit name fields and tap Save profile. Password changes stay separate."],
        icon: "id-card-outline",
        route: "/profile"
      },
      {
        id: "password-reset",
        category: "account",
        title: "Recover or change password",
        summary: "Use email code if you forgot it, or change it from profile.",
        steps: ["Tap Forgot password from login or profile.", "Request the code, check your email, and set a new password.", "If you know your current password, use Change password in My profile."],
        icon: "key-outline",
        route: { pathname: "/profile", params: { section: "password" } }
      },
      {
        id: "market-buy",
        category: "market",
        title: "Buy and contact sellers",
        summary: "Open any product, review details, and contact by phone or WhatsApp.",
        steps: ["Open Market and filter by category or search.", "Tap a product for price, condition, description, and seller.", "Use Contact seller, Call, or WhatsApp when available."],
        icon: "chatbubble-ellipses-outline",
        route: "/(tabs)/market"
      },
      {
        id: "market-favorites",
        category: "market",
        title: "Favorites and saved products",
        summary: "Save products with the heart and reopen them later from Favorites.",
        steps: ["Tap the heart on a market listing or product detail.", "Open Favorites from the side menu or Market header.", "Tap the card to open detail, or the heart to remove it."],
        icon: "heart-outline",
        route: "/favorites"
      },
      {
        id: "market-publish",
        category: "market",
        title: "Publish products with real photos",
        summary: "Create listings with camera or gallery and complete product data.",
        steps: ["Tap Publish in Market.", "Choose a photo, fill title, price, condition, and description.", "Some non-admin listings may remain under review."],
        icon: "camera-outline",
        route: "/market-publish",
        badge: "Real photos"
      },
      {
        id: "live-matches",
        category: "live",
        title: "Live and broadcast matches",
        summary: "Follow active matches first and review previous broadcasts.",
        steps: ["Open Live to see matches by date and status.", "Open a match for score, lineup, stats, and stream.", "Broadcast matches keeps the video archive."],
        icon: "radio-outline",
        route: "/(tabs)/live"
      },
      {
        id: "home-news",
        category: "live",
        title: "Home news and cover",
        summary: "Home prioritizes live matches; otherwise it shows real Polohub news.",
        steps: ["Open Home to see the main carousel.", "Live matches appear first when available.", "When there is no live match, news with real image and link is shown."],
        icon: "newspaper-outline",
        route: "/(tabs)"
      },
      {
        id: "community-chat",
        category: "community",
        title: "Community chats",
        summary: "Join rooms, follow conversations, and keep messages organized.",
        steps: ["Open Community and review joined and recommended rooms.", "Tap a room to open group chat.", "Messages are scoped by user so each client sees ownership correctly."],
        icon: "people-outline",
        route: "/(tabs)/community"
      },
      {
        id: "horse-auctions",
        category: "auctions",
        title: "Horse auctions",
        summary: "Browse events, lots, horses, base prices, and contact data.",
        steps: ["Open Auctions from Home or its shortcut.", "Open an event to see lots and real device-uploaded horse photos.", "Use event contact data to reach the auction owner."],
        icon: "trail-sign-outline",
        route: "/horse-auctions"
      },
      {
        id: "notifications-settings",
        category: "account",
        title: "Notifications, language, and theme",
        summary: "Control alerts, Spanish/English, and light/dark mode.",
        steps: ["Open Settings from the side menu.", "Choose light or dark mode and change app language.", "Enable or disable alerts for messages, matches, tournaments, market, and system."],
        icon: "settings-outline",
        route: "/settings"
      },
      {
        id: "admin-panel",
        category: "admin",
        title: "Admin panel and content",
        summary: "Manage content, listings, auctions, and protected operations with admin role.",
        steps: ["Sign in with an authorized admin account.", "Manage public content, auctions, and listings according to permissions.", "Sensitive operations require an active session and are protected against unauthorized access."],
        icon: "shield-checkmark-outline",
        route: "/admin-panel",
        badge: "Admin"
      }
    ],
    faqs: [
      { id: "no-products", question: "Why don't I see any products in the market?", answer: "The market shows real listings from the community. If there aren't any yet, be the first to publish one from the app." },
      { id: "upload-image-fails", question: "Why doesn't a photo I uploaded load?", answer: "With an unstable connection the image can take a moment to appear. Try again or pick another photo from your gallery or camera." },
      { id: "news-order", question: "What appears first on Home?", answer: "Live matches first. If there are no live matches, real news with image and read link is prioritized." },
      { id: "publish-review", question: "Does my listing appear instantly?", answer: "It depends on role and publication rules. Some listings may stay under review before becoming active." }
    ]
  }
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { locale } = useLocale();
  const baseCopy = helpContent[locale];
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HelpCategoryId>("all");
  const copy = useMemo(() => {
    if (Platform.OS === "web") {
      return baseCopy;
    }

    return {
      ...baseCopy,
      categories: baseCopy.categories.filter((category) => category.id !== "admin"),
      articles: baseCopy.articles.filter((article) => article.category !== "admin")
    };
  }, [baseCopy]);
  const [expandedArticleId, setExpandedArticleId] = useState(copy.articles[0]?.id ?? "");
  const [expandedFaqId, setExpandedFaqId] = useState(copy.faqs[0]?.id ?? "");
  const normalizedQuery = normalizeText(query.trim());
  const isSearching = normalizedQuery.length > 0;

  const filteredArticles = useMemo(() => {
    return copy.articles.filter((article) => {
      const matchesCategory = isSearching || selectedCategory === "all" || article.category === selectedCategory;
      const searchableText = normalizeText(`${article.title} ${article.summary} ${article.steps.join(" ")}`);
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [copy.articles, isSearching, normalizedQuery, selectedCategory]);

  const filteredFaqs = useMemo(() => {
    if (!isSearching) return copy.faqs;

    return copy.faqs.filter((faq) => {
      const searchableText = normalizeText(`${faq.question} ${faq.answer}`);
      return searchableText.includes(normalizedQuery);
    });
  }, [copy.faqs, isSearching, normalizedQuery]);

  const featuredArticles = copy.articles.filter((article) => ["market-favorites", "password-reset", "horse-auctions"].includes(article.id));
  const totalResults = filteredArticles.length + (isSearching ? filteredFaqs.length : 0);

  const openRoute = (route?: Href) => {
    if (route) {
      router.push(route);
    }
  };

  const openSupportEmail = (subject: string) => {
    const mailUrl = `mailto:soporte@poloconnect.app?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(mailUrl).catch(() => Alert.alert(copy.contactTitle, copy.contactText));
  };

  return (
    <Screen
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      showBackButton
      onBackPress={() => router.back()}
    >
      <View style={styles.pageContent}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable style={styles.clearButton} onPress={() => setQuery("")}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {!isSearching ? (
          <>
            <View style={styles.statusGrid}>
              <StatusTile colors={colors} icon="checkmark-circle-outline" title={copy.statusTitle} text={copy.statusText} />
              <StatusTile colors={colors} icon="timer-outline" title={copy.responseTitle} text={copy.responseText} />
              <StatusTile colors={colors} icon="sparkles-outline" title={copy.versionTitle} text={copy.versionText} />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{copy.featuredTitle}</Text>
            </View>

            <View style={styles.featuredList}>
              {featuredArticles.map((article) => (
                <Pressable key={article.id} style={styles.featuredItem} onPress={() => openRoute(article.route)}>
                  <View style={styles.featuredIcon}>
                    <Ionicons name={article.icon} size={20} color={colors.primaryDark} />
                  </View>
                  <View style={styles.featuredCopy}>
                    <Text style={styles.featuredTitle}>{article.title}</Text>
                    <Text style={styles.featuredText}>{article.summary}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>

            <View style={styles.categoryWrap}>
              {copy.categories.map((category) => {
                const selected = selectedCategory === category.id;

                return (
                  <Pressable
                    key={category.id}
                    style={[styles.categoryChip, selected && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Ionicons name={category.icon} size={15} color={selected ? "#ffffff" : colors.primaryDark} />
                    <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{category.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{isSearching ? copy.searchResultsTitle : copy.guidesTitle}</Text>
          <Text style={styles.countText}>{isSearching ? totalResults : filteredArticles.length}</Text>
        </View>

        {filteredArticles.length > 0 ? (
          <View style={styles.articleList}>
            {filteredArticles.map((article) => {
              const expanded = expandedArticleId === article.id;

              return (
                <View key={article.id} style={styles.articleCard}>
                  <Pressable style={styles.articleHeader} onPress={() => setExpandedArticleId(expanded ? "" : article.id)}>
                    <View style={styles.articleIcon}>
                      <Ionicons name={article.icon} size={21} color={colors.primaryDark} />
                    </View>
                    <View style={styles.articleCopy}>
                      <View style={styles.articleTitleRow}>
                        <Text style={styles.articleTitle}>{article.title}</Text>
                        {article.badge ? <Text style={styles.badge}>{article.badge}</Text> : null}
                      </View>
                      <Text style={styles.articleSummary}>{article.summary}</Text>
                    </View>
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
                  </Pressable>

                  {expanded ? (
                    <View style={styles.articleBody}>
                      {article.steps.map((step, index) => (
                        <View key={step} style={styles.stepRow}>
                          <View style={styles.stepIndex}>
                            <Text style={styles.stepIndexText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.stepText}>{step}</Text>
                        </View>
                      ))}

                      {article.route ? (
                        <Pressable style={styles.openButton} onPress={() => openRoute(article.route)}>
                          <Text style={styles.openButtonText}>{copy.open}</Text>
                          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : totalResults === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="help-buoy-outline" size={42} color={colors.muted} />
            <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
            <Text style={styles.emptyText}>{copy.emptyText}</Text>
          </View>
        ) : null}

        {filteredFaqs.length > 0 ? (
          <>
            {!isSearching ? (
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{copy.faqTitle}</Text>
              </View>
            ) : null}

            <View style={styles.faqList}>
              {filteredFaqs.map((faq) => {
                const expanded = expandedFaqId === faq.id;

                return (
                  <Pressable key={faq.id} style={styles.faqItem} onPress={() => setExpandedFaqId(expanded ? "" : faq.id)}>
                    <View style={styles.faqHeader}>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons name={expanded ? "remove" : "add"} size={18} color={colors.primaryDark} />
                    </View>
                    {expanded ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {!isSearching ? (
          <View style={styles.contactPanel}>
            <View style={styles.contactIcon}>
              <Ionicons name="headset-outline" size={24} color={colors.primaryDark} />
            </View>
            <View style={styles.contactCopy}>
              <Text style={styles.contactTitle}>{copy.contactTitle}</Text>
              <Text style={styles.contactText}>{copy.contactText}</Text>
            </View>
            <View style={styles.contactActions}>
              <Pressable style={styles.supportButton} onPress={() => openSupportEmail("Soporte Polo Connect") }>
                <Ionicons name="mail-outline" size={17} color="#ffffff" />
                <Text style={styles.supportButtonText}>{copy.emailSupport}</Text>
              </Pressable>
              <Pressable style={styles.issueButton} onPress={() => openSupportEmail("Reporte tecnico Polo Connect") }>
                <Ionicons name="bug-outline" size={17} color={colors.primaryDark} />
                <Text style={styles.issueButtonText}>{copy.reportIssue}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function StatusTile({ colors, icon, title, text }: { colors: AppColors; icon: IconName; title: string; text: string }) {
  const styles = createStyles(colors);

  return (
    <View style={styles.statusTile}>
      <Ionicons name={icon} size={19} color={colors.primaryDark} />
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  pageContent: {
    paddingBottom: 18
  },
  searchBox: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 14
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    minHeight: 48
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong
  },
  statusGrid: {
    gap: 10,
    marginBottom: 18
  },
  statusTile: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 5
  },
  statusTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  statusText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600"
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  countText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  featuredList: {
    gap: 10,
    marginBottom: 16
  },
  featuredItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 13
  },
  featuredIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  featuredCopy: {
    flex: 1,
    gap: 3
  },
  featuredTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  featuredText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600"
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  categoryChip: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  categoryText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800"
  },
  categoryTextActive: {
    color: "#ffffff"
  },
  articleList: {
    gap: 10,
    marginBottom: 18
  },
  articleCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  articleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14
  },
  articleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  articleCopy: {
    flex: 1,
    gap: 5
  },
  articleTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap"
  },
  articleTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  badge: {
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "900"
  },
  articleSummary: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600"
  },
  articleBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 14,
    gap: 12,
    backgroundColor: colors.background
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  stepIndexText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "900"
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600"
  },
  openButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 2
  },
  openButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 28,
    marginBottom: 18
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6
  },
  faqList: {
    gap: 10,
    marginBottom: 18
  },
  faqItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  faqQuestion: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900"
  },
  faqAnswer: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600"
  },
  contactPanel: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  contactCopy: {
    gap: 5
  },
  contactTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  contactText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600"
  },
  contactActions: {
    gap: 10
  },
  supportButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  supportButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  issueButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  issueButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  }
});
