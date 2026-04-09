import { distributionPlatformSchema } from "@/lib/validations/distribution";
import type { DistributionPlatform } from "@/types/momentum";

export type ParsedDistributionQuery = {
  projectId?: string;
  platform?: DistributionPlatform;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

/** Map URL search params → filters (safe for DB; invalid values are dropped). */
export function parseDistributionPageQuery(
  raw: Record<string, string | string[] | undefined>
): ParsedDistributionQuery {
  const projectRaw = pickString(raw.project);
  const platformRaw = pickString(raw.platform);
  const qRaw = pickString(raw.q);
  const fromRaw = pickString(raw.from);
  const toRaw = pickString(raw.to);

  let projectId: string | undefined;
  if (projectRaw && /^[0-9a-f-]{36}$/i.test(projectRaw)) {
    projectId = projectRaw;
  }

  let platform: DistributionPlatform | undefined;
  if (platformRaw) {
    const p = distributionPlatformSchema.safeParse(platformRaw);
    if (p.success) platform = p.data;
  }

  const search =
    qRaw && qRaw.length > 200 ? qRaw.slice(0, 200) : qRaw || undefined;

  const dateFrom =
    fromRaw && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : undefined;
  const dateTo =
    toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : undefined;

  return { projectId, platform, search, dateFrom, dateTo };
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s === "" ? undefined : s;
}
