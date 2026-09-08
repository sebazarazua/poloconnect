import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Product } from "@/services/market";
import {
  addFavorite as addFavoriteApi,
  createProduct,
  deleteProduct as deleteProductApi,
  listFavorites,
  listMyProducts,
  listProducts,
  removeFavorite as removeFavoriteApi,
  updateProduct as updateProductApi,
  type ProductPublicationResult,
  type ProductPayload
} from "@/services/api/market";

type MarketContextValue = {
  products: Product[];
  favoriteIds: Set<string>;
  favoriteProducts: Product[];
  myProducts: Product[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  clearFavorites: () => void;
  addProduct: (product: ProductPayload) => Promise<ProductPublicationResult>;
  updateProduct: (productId: string, product: ProductPayload) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  refreshMarket: () => Promise<void>;
};

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const favoriteOperationIdsRef = useRef<Set<string>>(new Set());

  const refreshMarket = useCallback(async () => {
    if (!isAuthenticated) {
      setProducts([]);
      setFavoriteIds(new Set());
      setFavoriteProducts([]);
      setMyProducts([]);
      return;
    }

    const [nextProducts, nextFavorites, nextMyProducts] = await Promise.all([
      listProducts(),
      listFavorites(),
      listMyProducts()
    ]);

    setProducts(nextProducts);
    setFavoriteProducts(nextFavorites);
    setMyProducts(nextMyProducts);
    setFavoriteIds(new Set(nextFavorites.map((product) => product.id)));
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshMarket().catch(() => undefined);
  }, [refreshMarket]);

  const addProduct = useCallback(async (product: ProductPayload) => {
    const result = await createProduct(product);
    await refreshMarket();
    return result;
  }, [refreshMarket]);

  const updateProduct = useCallback(async (productId: string, product: ProductPayload) => {
    await updateProductApi(productId, product);
    await refreshMarket();
  }, [refreshMarket]);

  const deleteProduct = useCallback(async (productId: string) => {
    await deleteProductApi(productId);
    await refreshMarket();
  }, [refreshMarket]);

  const toggleFavorite = useCallback(async (productId: string) => {
    if (favoriteOperationIdsRef.current.has(productId)) {
      return;
    }

    favoriteOperationIdsRef.current.add(productId);
    const wasFavorite = favoriteIds.has(productId);

    try {
      await (wasFavorite ? removeFavoriteApi(productId) : addFavoriteApi(productId));
      await refreshMarket();
    } finally {
      favoriteOperationIdsRef.current.delete(productId);
    }
  }, [favoriteIds, refreshMarket]);

  const value = useMemo(
    () => ({
      products,
      favoriteIds,
      favoriteProducts,
      myProducts,
      isFavorite: (productId: string) => favoriteIds.has(productId),
      toggleFavorite,
      clearFavorites: () => {
        setFavoriteIds(new Set());
        setFavoriteProducts([]);
      },
      addProduct,
      updateProduct,
      deleteProduct,
      refreshMarket
    }),
    [addProduct, deleteProduct, favoriteIds, favoriteProducts, myProducts, products, toggleFavorite, updateProduct, refreshMarket]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const context = useContext(MarketContext);

  if (!context) {
    throw new Error("useMarket must be used within a MarketProvider");
  }

  return context;
}
