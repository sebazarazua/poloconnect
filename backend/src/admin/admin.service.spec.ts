import { AdminService } from "./admin.service";

describe("AdminService PoloHUB parser", () => {
  const service = new AdminService({} as never, {} as never, {} as never, {} as never);

  it("maps the current PoloHUB article markup to the existing content contract", () => {
    const html = `
      <ul>
        <li><article class="flex flex-col">
          <a href="/es/noticias/titulo-de-prueba">
            <img src="/_next/image?url=%2Fapi%2Fmedios%2Ffoto.jpg&amp;w=3840&amp;q=75" />
          </a>
          <a href="/es/noticias/titulo-de-prueba"><h3>T&#237;tulo de prueba &#x27;Polo&#x27;</h3></a>
          <p>Resumen de la noticia de prueba.</p>
          <div><p><time>15 de septiembre de 2026</time><span class="ml-3 text-tinta">Resultados</span></p></div>
        </article></li>
      </ul>`;

    const items = (service as any).parsePolohubNewsPage(html, 12);

    expect(items).toEqual([
      expect.objectContaining({
        id: "polohub-0-titulo-de-prueba-polo",
        type: "news",
        section: "home",
        slot: "main_news",
        title: "Título de prueba 'Polo'",
        subtitle: "Resultados",
        body: "Resumen de la noticia de prueba.",
        imageUrl: "https://polohub.net/api/medios/foto.jpg",
        targetUrl: "https://polohub.net/es/noticias/titulo-de-prueba",
        priority: 100,
        sortOrder: 1,
        isActive: true
      })
    ]);
  });
});
