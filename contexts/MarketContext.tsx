import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MARKET_PRODUCTS, type Product } from "@/services/market";

type MarketContextValue = {
  products: Product[];
  favoriteIds: Set<string>;
  favoriteProducts: Product[];
  myProducts: Product[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  clearFavorites: () => void;
  addProduct: (product: Omit<Product, "id" | "ownerId">) => void;
  updateProduct: (productId: string, product: Omit<Product, "id" | "ownerId">) => void;
  deleteProduct: (productId: string) => void;
};

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<Product[]>(MARKET_PRODUCTS);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
    }
  }, [isAuthenticated]);

  const addProduct = (product: Omit<Product, "id">) => {
    setProducts((currentProducts) => [
      {
        ...product,
        id: Date.now().toString(),
        ownerId: user?.id
      },
      ...currentProducts
    ]);
  };

  const updateProduct = (productId: string, product: Omit<Product, "id" | "ownerId">) => {
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === productId
          ? {
              ...currentProduct,
              ...product,
              id: productId,
              ownerId: currentProduct.ownerId ?? user?.id
            }
          : currentProduct
      )
    );
  };

  const deleteProduct = (productId: string) => {
    setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
    setFavoriteIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(productId);
      return nextIds;
    });
  };

  const toggleFavorite = (productId: string) => {
    setFavoriteIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(productId)) {
        nextIds.delete(productId);
      } else {
        nextIds.add(productId);
      }

      return nextIds;
    });
  };

  const favoriteProducts = useMemo(
    () => products.filter((product) => favoriteIds.has(product.id)),
    [favoriteIds, products]
  );

  const myProducts = useMemo(
    () => products.filter((product) => product.ownerId === user?.id),
    [products, user?.id]
  );

  const value = useMemo(
    () => ({
      products,
      favoriteIds,
      favoriteProducts,
      myProducts,
      isFavorite: (productId: string) => favoriteIds.has(productId),
      toggleFavorite,
      clearFavorites: () => setFavoriteIds(new Set()),
      addProduct,
      updateProduct,
      deleteProduct
    }),
    [addProduct, deleteProduct, favoriteIds, favoriteProducts, myProducts, products, updateProduct]
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