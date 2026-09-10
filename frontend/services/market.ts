export type MarketCategory = "todos" | "equipamiento" | "indumentaria" | "vehiculos" | "inmueble";
export type ProductStatus = "Nuevo" | "Usado" | "Reacondicionado";

export type Product = {
  id: string;
  ownerId?: string;
  name: string;
  price: number;
  priceCents?: number;
  currency?: string;
  category: Exclude<MarketCategory, "todos">;
  image: string;
  images?: string[];
  status: ProductStatus;
  publicationStatus?: string;
  refundStatus?: "none" | "pending" | "failed" | "refunded";
  payment?: {
    required: boolean;
    provider: "mercado_pago" | null;
    status: "pending" | "approved" | "rejected" | "cancelled" | "refunded" | null;
    canResume: boolean;
  };
  description: string;
  contactPhone?: string;
  seller?: {
    id: string;
    name: string;
    location?: string;
    rating?: number;
    reviews?: number;
    phone?: string;
    email?: string;
  };
  isFavorite?: boolean;
  createdAt?: string;
};
