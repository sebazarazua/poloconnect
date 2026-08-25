import { PrismaClient } from "@prisma/client";
import { assertDemoSeedAllowed } from "./seed-guard";

const prisma = new PrismaClient();

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const showcaseBrands = [
  {
    name: "Roda Polo Gear",
    description: "Equipamiento tecnico para entrenamiento y alta competencia.",
    logoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    whatsapp: "+54 9 11 4588 0101",
    phone: "+54 11 4588 0101",
    email: "contacto@rodapolo.com",
    website: "https://www.rodapolo.com",
    products: [
      { name: "Silla Carbon Pro", description: "Silla liviana de alto rendimiento para polo.", price: 4600, imageUrl: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=1200&q=80" },
      { name: "Casco Aero Shield", description: "Casco ventilado con proteccion reforzada.", price: 980, imageUrl: "https://images.unsplash.com/photo-1571019613914-85f342c1d4b5?auto=format&fit=crop&w=1200&q=80" },
      { name: "Rodilleras Flex Match", description: "Set de rodilleras para impacto y estabilidad.", price: 180, imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80" },
      { name: "Botas Campo Elite", description: "Botas de cuero con agarre premium en estribo.", price: 740, imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80" },
      { name: "Guantes Grip One", description: "Guantes antideslizantes para control fino del taco.", price: 95, imageUrl: "https://images.unsplash.com/photo-1528701800489-20be3c76d576?auto=format&fit=crop&w=1200&q=80" }
    ]
  },
  {
    name: "La Martina Heritage",
    description: "Indumentaria oficial para club y competencia.",
    logoUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
    whatsapp: "+54 9 11 4588 0202",
    phone: "+54 11 4588 0202",
    email: "ventas@lamartinaheritage.com",
    website: "https://www.lamartinaheritage.com",
    products: [
      { name: "Camisa Match Oficial", description: "Camisa tecnica transpirable para torneo.", price: 150, imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80" },
      { name: "Chaleco Team Warm", description: "Chaleco termico ligero para pre-partido.", price: 210, imageUrl: "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?auto=format&fit=crop&w=1200&q=80" },
      { name: "Pantalon Rider Pro", description: "Pantalon elastico reforzado para jinete.", price: 190, imageUrl: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=80" },
      { name: "Buzo Club Navy", description: "Buzo premium para uso diario y staff.", price: 130, imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80" },
      { name: "Remera Training Dry", description: "Remera de secado rapido para practica.", price: 85, imageUrl: "https://images.unsplash.com/photo-1484516758160-69878111a911?auto=format&fit=crop&w=1200&q=80" }
    ]
  },
  {
    name: "Pilar Saddlery",
    description: "Artesania en talabarteria para polo argentino.",
    logoUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80",
    whatsapp: "+54 9 11 4588 0303",
    phone: "+54 11 4588 0303",
    email: "info@pilarsaddlery.com",
    website: "https://www.pilarsaddlery.com",
    products: [
      { name: "Montura Artisan Polo", description: "Montura de cuero plena flor cosida a mano.", price: 3900, imageUrl: "https://images.unsplash.com/photo-1531327431456-837da4b1d562?auto=format&fit=crop&w=1200&q=80" },
      { name: "Estribos Balance X", description: "Estribos de aluminio con anti-deslizante.", price: 310, imageUrl: "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=1200&q=80" },
      { name: "Cincha Comfort Fit", description: "Cincha anatomica para mayor comodidad.", price: 160, imageUrl: "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?auto=format&fit=crop&w=1200&q=80" },
      { name: "Riendas Pro Grip", description: "Riendas con agarre reforzado para lluvia.", price: 140, imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80" },
      { name: "Pechera Stable Line", description: "Pechera regulable para entrenamiento intenso.", price: 220, imageUrl: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80" }
    ]
  },
  {
    name: "Santa Maria Nutrition",
    description: "Suplementos y nutricion para caballos de competencia.",
    logoUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80",
    whatsapp: "+54 9 11 4588 0404",
    phone: "+54 11 4588 0404",
    email: "asesoria@santamarianutrition.com",
    website: "https://www.santamarianutrition.com",
    products: [
      { name: "Electrolitos Endurance", description: "Recuperacion rapida post chukker.", price: 72, imageUrl: "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=1200&q=80" },
      { name: "Omega Coat Plus", description: "Mejora de pelaje y salud articular.", price: 58, imageUrl: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80" },
      { name: "Energy Mix Race Day", description: "Formula energetica para dia de partido.", price: 95, imageUrl: "https://images.unsplash.com/photo-1505253716362-afaea6d3d1af?auto=format&fit=crop&w=1200&q=80" },
      { name: "Joint Care Advanced", description: "Soporte de articulaciones para alto rendimiento.", price: 88, imageUrl: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80" },
      { name: "Hydration Booster", description: "Hidratacion sostenida en jornadas largas.", price: 47, imageUrl: "https://images.unsplash.com/photo-1517860389284-d3aa4f9bf47b?auto=format&fit=crop&w=1200&q=80" }
    ]
  },
  {
    name: "Campo Argentino Transport",
    description: "Movilidad premium para caballos y equipamiento.",
    logoUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=400&q=80",
    whatsapp: "+54 9 11 4588 0505",
    phone: "+54 11 4588 0505",
    email: "operaciones@campoargentinotransport.com",
    website: "https://www.campoargentinotransport.com",
    products: [
      { name: "Trailer 2 Caballos Pro", description: "Trailer de aluminio con suspension reforzada.", price: 22500, imageUrl: "https://images.unsplash.com/photo-1549921296-3a6b6f56d60f?auto=format&fit=crop&w=1200&q=80" },
      { name: "Rampa Quick Load", description: "Rampa plegable antideslizante.", price: 1200, imageUrl: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=1200&q=80" },
      { name: "Kit Seguridad Ruta", description: "Kit integral para traslado seguro.", price: 330, imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80" },
      { name: "Cobertor Viaje Deluxe", description: "Cobertor termico para trayectos extensos.", price: 260, imageUrl: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=1200&q=80" },
      { name: "Monitoreo GPS Stable", description: "Sensor de ruta y estado para traslados.", price: 410, imageUrl: "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=80" }
    ]
  }
] as const;

async function main() {
  assertDemoSeedAllowed("prisma/seed-brands-showcase.ts");

  for (let brandIndex = 0; brandIndex < showcaseBrands.length; brandIndex += 1) {
    const brandData = showcaseBrands[brandIndex];
    const brandSlug = slug(brandData.name);

    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      update: {
        name: brandData.name,
        logoUrl: brandData.logoUrl,
        description: brandData.description,
        whatsapp: brandData.whatsapp,
        phone: brandData.phone,
        email: brandData.email,
        website: brandData.website,
        isActive: true,
        sortOrder: brandIndex + 1,
        deletedAt: null
      },
      create: {
        name: brandData.name,
        slug: brandSlug,
        logoUrl: brandData.logoUrl,
        description: brandData.description,
        whatsapp: brandData.whatsapp,
        phone: brandData.phone,
        email: brandData.email,
        website: brandData.website,
        isActive: true,
        sortOrder: brandIndex + 1
      }
    });

    for (let productIndex = 0; productIndex < brandData.products.length; productIndex += 1) {
      const product = brandData.products[productIndex];
      const existing = await prisma.brandProduct.findFirst({
        where: { brandId: brand.id, name: product.name }
      });

      if (existing) {
        await prisma.brandProduct.update({
          where: { id: existing.id },
          data: {
            description: product.description,
            priceCents: Math.round(product.price * 100),
            currency: "USD",
            imageUrl: product.imageUrl,
            isActive: true,
            sortOrder: productIndex + 1,
            deletedAt: null
          }
        });
      } else {
        await prisma.brandProduct.create({
          data: {
            brandId: brand.id,
            name: product.name,
            description: product.description,
            priceCents: Math.round(product.price * 100),
            currency: "USD",
            imageUrl: product.imageUrl,
            isActive: true,
            sortOrder: productIndex + 1
          }
        });
      }
    }
  }

  const brandCount = await prisma.brand.count({ where: { deletedAt: null } });
  const productCount = await prisma.brandProduct.count({ where: { deletedAt: null } });
  console.log(`Showcase brands seeded: ${brandCount} marcas, ${productCount} productos de marca.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
