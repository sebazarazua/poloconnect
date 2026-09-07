import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const DEFAULT_BLOCKED_TERMS = ["cp", "gore", "zoofilia"];
const REJECTION_MESSAGE = "No podemos publicar este contenido porque podria infringir las normas de la comunidad.";

@Injectable()
export class ContentFilterService {
  constructor(private readonly config: ConfigService) {}

  assertAllowed(...values: Array<string | null | undefined>) {
    const terms = this.getBlockedTerms();
    if (terms.length === 0) return;

    const content = this.normalize(values.filter((value): value is string => typeof value === "string").join(" "));
    if (!content) return;

    if (terms.some((term) => this.matches(content, term))) {
      throw new BadRequestException(REJECTION_MESSAGE);
    }
  }

  private getBlockedTerms() {
    const configured = this.config.get<string>("UGC_BLOCKLIST", "");
    return [...DEFAULT_BLOCKED_TERMS, ...configured.split(",")]
      .map((term) => this.normalize(term))
      .filter((term, index, all) => term.length >= 2 && all.indexOf(term) === index);
  }

  private matches(content: string, term: string) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(content);
  }

  private normalize(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
}
