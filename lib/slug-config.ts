// The redirect config cached per slug in KV (Appendix F). Everything the edge
// needs to resolve a scan in one read. NOTE: never includes the password hash —
// only whether a password is required; verification happens server-side (node).
export type AbDestination = { url: string; weight: number };

export type SlugConfig = {
  destination_url: string;
  is_active: boolean;
  active_from: string | null;
  active_until: string | null;
  has_password: boolean;
  ab: AbDestination[] | null;
};

type QrRow = {
  destination_url: string;
  is_active: boolean;
  active_from?: string | null;
  active_until?: string | null;
  password_hash?: string | null;
  ab_destinations?: AbDestination[] | null;
};

export function buildConfig(row: QrRow): SlugConfig {
  return {
    destination_url: row.destination_url,
    is_active: row.is_active,
    active_from: row.active_from ?? null,
    active_until: row.active_until ?? null,
    has_password: !!row.password_hash,
    ab: row.ab_destinations ?? null,
  };
}

// Resolution helpers shared by the edge redirect.
export function scheduleState(
  config: SlugConfig,
  now = Date.now(),
): "ok" | "paused" | "not_started" | "expired" {
  if (!config.is_active) return "paused";
  if (config.active_from && now < new Date(config.active_from).getTime()) return "not_started";
  if (config.active_until && now >= new Date(config.active_until).getTime()) return "expired";
  return "ok";
}

// Weighted pick across A/B destinations; falls back to the primary destination.
export function pickDestination(config: SlugConfig): string {
  if (!config.ab || config.ab.length === 0) return config.destination_url;
  const total = config.ab.reduce((s, d) => s + d.weight, 0);
  if (total <= 0) return config.destination_url;
  let r = Math.random() * total;
  for (const d of config.ab) {
    r -= d.weight;
    if (r < 0) return d.url;
  }
  return config.ab[config.ab.length - 1].url;
}
