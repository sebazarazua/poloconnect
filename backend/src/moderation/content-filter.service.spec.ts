import { BadRequestException } from "@nestjs/common";
import { ContentFilterService } from "./content-filter.service";

describe("ContentFilterService", () => {
  it("blocks default terms after normalizing punctuation and accents", () => {
    const service = new ContentFilterService({ get: jest.fn().mockReturnValue("") } as any);
    expect(() => service.assertAllowed("Esto contiene zoofilia.")).toThrow(BadRequestException);
  });

  it("accepts normal content and honors configured terms", () => {
    const service = new ContentFilterService({ get: jest.fn().mockReturnValue("fraude local") } as any);
    expect(() => service.assertAllowed("Vendo casco de polo usado")).not.toThrow();
    expect(() => service.assertAllowed("Posible fraude, local")).toThrow(BadRequestException);
  });
});
