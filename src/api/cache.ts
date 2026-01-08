import { env } from "../config/env";

export type CacheSurfaceInfo = {
  surface: "top" | "bottom";
  view: string;
  tile_max_level?: number | null;
  tile_size?: number | null;
  defect_expand?: number | null;
  defect_cache_enabled?: boolean | null;
  disk_cache_enabled?: boolean | null;
  updated_at?: string | null;
};

export type CacheRecordItem = {
  seq_no: number;
  steel_no?: string | null;
  detect_time?: string | null;
  status: "none" | "partial" | "complete";
  surfaces: CacheSurfaceInfo[];
};

export type CacheRecordsResponse = {
  items: CacheRecordItem[];
  total: number;
};

export type CacheStatus = {
  state: string;
  message: string;
  seq_no?: number | null;
  surface?: string | null;
};

export type CacheSettingsResponse = {
  cache: Record<string, any>;
};

const mockItems: CacheRecordItem[] = Array.from({ length: 12 }).map((_, idx) => {
  const seq = 1200 - idx;
  const status = idx % 3 === 0 ? "complete" : idx % 3 === 1 ? "partial" : "none";
  return {
    seq_no: seq,
    steel_no: `S-${seq}`,
    detect_time: new Date(Date.now() - idx * 3600_000).toISOString(),
    status,
    surfaces:
      status === "none"
        ? []
        : [
            {
              surface: "top",
              view: "2D",
              tile_max_level: 4,
              tile_size: 1024,
              defect_expand: 100,
              defect_cache_enabled: true,
              disk_cache_enabled: true,
              updated_at: new Date().toISOString(),
            },
            ...(status === "complete"
              ? [
                  {
                    surface: "bottom",
                    view: "2D",
                    tile_max_level: 4,
                    tile_size: 1024,
                    defect_expand: 100,
                    defect_cache_enabled: true,
                    disk_cache_enabled: true,
                    updated_at: new Date().toISOString(),
                  },
                ]
              : []),
          ],
  };
});

const buildApiUrl = (path: string): string => {
  const base = env.getApiBaseUrl();
  return `${base}${path}`;
};

export async function listCacheRecords(
  page: number,
  pageSize: number,
): Promise<CacheRecordsResponse> {
  if (env.isDevelopment()) {
    const start = (page - 1) * pageSize;
    const items = mockItems.slice(start, start + pageSize);
    return { items, total: mockItems.length };
  }
  const url = `${buildApiUrl("/cache/records")}?page=${page}&page_size=${pageSize}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to load cache records: ${response.status}`);
  }
  return (await response.json()) as CacheRecordsResponse;
}

export async function scanCacheRecord(seqNo: number): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/scan");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seq_no: seqNo }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to scan cache: ${response.status}`);
  }
}

export async function precacheRecord(seqNo: number, levels?: number): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/precache");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seq_no: seqNo, levels }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to precache: ${response.status}`);
  }
}

export async function getCacheStatus(): Promise<CacheStatus> {
  if (env.isDevelopment()) {
    return { state: "ready", message: "就绪", seq_no: null, surface: null };
  }
  const url = buildApiUrl("/cache/status");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to load cache status: ${response.status}`);
  }
  return (await response.json()) as CacheStatus;
}

export async function getCacheSettings(): Promise<CacheSettingsResponse> {
  if (env.isDevelopment()) {
    return {
      cache: {
        max_frames: 64,
        max_tiles: 256,
        max_mosaics: 8,
        max_defect_crops: 256,
        ttl_seconds: 120,
        defect_cache_enabled: true,
        defect_cache_expand: 100,
        disk_cache_enabled: true,
        disk_cache_max_records: 20000,
        disk_cache_scan_interval_seconds: 5,
        disk_cache_cleanup_interval_seconds: 60,
        disk_precache_enabled: true,
        disk_precache_levels: 4,
        disk_precache_workers: 2,
      },
    };
  }
  const url = buildApiUrl("/cache/settings");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to load cache settings: ${response.status}`);
  }
  return (await response.json()) as CacheSettingsResponse;
}

export async function updateCacheSettings(payload: Record<string, any>): Promise<CacheSettingsResponse> {
  if (env.isDevelopment()) {
    return getCacheSettings();
  }
  const url = buildApiUrl("/cache/settings");
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cache: payload }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to update cache settings: ${response.status}`);
  }
  return (await response.json()) as CacheSettingsResponse;
}

export async function deleteCacheRecords(payload: {
  mode: "all" | "keep_last" | "range";
  keep_last?: number;
  start_seq?: number;
  end_seq?: number;
}): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/delete");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to delete cache: ${response.status}`);
  }
}

export async function rebuildCacheRecords(payload: {
  mode: "all" | "keep_last" | "range";
  keep_last?: number;
  start_seq?: number;
  end_seq?: number;
  force?: boolean;
}): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/rebuild");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to rebuild cache: ${response.status}`);
  }
}

export async function migrateCacheRoots(payload: {
  top_root?: string;
  bottom_root?: string;
}): Promise<void> {
  if (env.isDevelopment()) {
    return;
  }
  const url = buildApiUrl("/cache/migrate");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || `Failed to migrate cache: ${response.status}`);
  }
}
