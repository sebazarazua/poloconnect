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