import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  toggleFavorite: (productId: string) => void;
  clearFavorites: () => void;
  addProduct: (product: ProductPayload) => Promise<ProductPublicationResult>;
  updateProduct: (productId: string, product: ProductPayload) => void;
  deleteProduct: (productId: string) => void;
};

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);

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
    void refreshMarket();
  }, [refreshMarket]);

  const addProduct = useCallback(async (product: ProductPayload) => {
    const result = await createProduct(product);
    await refreshMarket();
    return result;
  }, [refreshMarket]);

  const updateProduct = useCallback((productId: string, product: ProductPayload) => {
    void updateProductApi(productId, product).then(refreshMarket);
  }, [refreshMarket]);

  const deleteProduct = useCallback((productId: string) => {
    setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
    setFavoriteProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
    setMyProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
    setFavoriteIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(productId);
      return nextIds;
    });
    void deleteProductApi(productId).then(refreshMarket);
  }, [refreshMarket]);

  const toggleFavorite = useCallback((productId: string) => {
    const wasFavorite = favoriteIds.has(productId);
    setFavoriteIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (wasFavorite) {
        nextIds.delete(productId);
      } else {
        nextIds.add(productId);
      }

      return nextIds;
    });
    void (wasFavorite ? removeFavoriteApi(productId) : addFavoriteApi(productId)).then(refreshMarket);
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
      deleteProduct
    }),
    [addProduct, deleteProduct, favoriteIds, favoriteProducts, myProducts, products, toggleFavorite, updateProduct]
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