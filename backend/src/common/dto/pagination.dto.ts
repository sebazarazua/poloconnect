import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export function page<T>(data: T[], limit: number) {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const last = items[items.length - 1] as { id?: string } | undefined;
  return { data: items, page: { limit, nextCursor: hasMore ? last?.id ?? null : null, hasMore } };
}
