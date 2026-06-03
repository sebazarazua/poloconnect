export type MarketCategory = "todos" | "equipamiento" | "indumentaria" | "vehiculos" | "inmueble";
export type ProductStatus = "Nuevo" | "Usado" | "Reacondicionado";

export type Product = {
  id: string;
  ownerId?: string;
  name: string;
  price: number;
  category: Exclude<MarketCategory, "todos">;
  image: string;
  status: ProductStatus;
  description: string;
};

export const MARKET_PRODUCTS: Product[] = [
  {
    id: "1",
    ownerId: undefined,
    name: "Silla Butet\nUsada",
    price: 3200,
    category: "equipamiento",
    image: "https://via.placeholder.com/180x180/8B4513/FFFFFF?text=Silla+Butet",
    status: "Usado",
    description: "Silla profesional en buen estado, ideal para entrenamiento y torneos."
  },
  {
    id: "2",
    ownerId: undefined,
    name: "Casco Kep\nItalia",
    price: 980,
    category: "equipamiento",
    image: "https://via.placeholder.com/180x180/000000/FFFFFF?text=Casco+Kep",
    status: "Nuevo",
    description: "Casco liviano, ventilado y listo para usar en la temporada."
  },
  {
    id: "3",
    ownerId: undefined,
    name: "Camisa La Martina\nOficial",
    price: 120,
    category: "indumentaria",
    image: "https://via.placeholder.com/180x180/000000/FFFFFF?text=Camisa",
    status: "Nuevo",
    description: "Camisa oficial para presentación, práctica o competencia."
  },
  {
    id: "4",
    ownerId: undefined,
    name: "Botas de Polo\nPremium",
    price: 350,
    category: "equipamiento",
    image: "https://via.placeholder.com/180x180/654321/FFFFFF?text=Botas",
    status: "Nuevo",
    description: "Botas premium con terminaciones resistentes para uso intensivo."
  },
  {
    id: "5",
    ownerId: undefined,
    name: "Vehiculo Transporte",
    price: 15000,
    category: "vehiculos",
    image: "https://via.placeholder.com/180x180/CCCCCC/000000?text=Vehiculo",
    status: "Usado",
    description: "Vehículo de transporte adaptado para caballos y equipamiento."
  },
  {
    id: "6",
    ownerId: undefined,
    name: "Set de Tacos\nProfesional",
    price: 450,
    category: "equipamiento",
    image: "https://via.placeholder.com/180x180/C0C0C0/000000?text=Tacos",
    status: "Nuevo",
    description: "Set profesional para entrenamiento y competencia."
  }
];

export function getProductById(id?: string): Product | undefined {
  if (!id) return undefined;
  return MARKET_PRODUCTS.find((product) => product.id === id);
}