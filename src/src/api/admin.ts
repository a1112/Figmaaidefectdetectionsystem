import { env } from "../config/env";

export interface AuthUser {
  username: string;
  role: string;
  is_superuser: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  roles: string[];
  is_active: boolean;
  is_superuser: boolean;
  created_at: string | null;
}

export interface AdminRole {
  id: number;
  name: string;
  description: string | null;
  created_at: string | null;
}

export interface AdminPolicy {
  id: number;
  ptype: string;
  v0: string | null;
  v1: string | null;
  v2: string | null;
  v3: string | null;
  v4: string | null;
  v5: string | null;
}

export interface AdminUserPayload {
  username: string;
  password?: string;
  roles: string[];
  is_active: boolean;
  is_superuser: boolean;
}

export interface AdminRolePayload {
  name: string;
  description?: string | null;
}

export interface AdminPolicyPayload {
  ptype: string;
  v0?: string | null;
  v1?: string | null;
  v2?: string | null;
  v3?: string | null;
  v4?: string | null;
  v5?: string | null;
}

export interface LineConfigPayload {
  lines: Record<string, any>[];
  defaults?: Record<string, any>;
}

export interface ConfigApiNode {
  key: string;
  name?: string;
  host?: string;
  port?: number;
  small_port?: number;
  profile?: string;
  pid?: number | null;
  running?: boolean;
  online?: boolean;
  latest_timestamp?: string | null;
  latest_age_seconds?: number | null;
  latency_ms?: number | null;
  path?: string;
  small_path?: string;
}

export interface NginxConfigPayload {
  path: string;
  content: string;
}

export interface SystemInfoPayload {
  line_names: string[];
  database: {
    drive: string;
    host: string;
    port: number | null;
    database_type: string;
    management_database: string;
    test_mode: boolean;
    main_status: string;
    main_error?: string | null;
    management_status: string;
    management_error?: string | null;
  };
  server: {
    hostname: string;
    os_name: string;
    platform: string;
    platform_release: string;
    platform_version: string;
    cpu_count: number;
    cpu_model: string;
  };
  runtime: {
    python_version: string;
    python_executable: string;
  };
  resources: {
    cpu_percent: number | null;
    memory_percent: number | null;
    memory_total_bytes: number | null;
    memory_used_bytes: number | null;
    network_rx_bytes_per_sec: number | null;
    network_tx_bytes_per_sec: number | null;
    notes?: string[];
  };
  disks?: SystemDiskUsage[];
  network_interfaces?: NetworkInterfaceMetrics[];
}

export interface SystemDiskUsage {
  device: string;
  mountpoint: string;
  fstype: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  percent: number;
}

export interface NetworkInterfaceMetrics {
  name: string;
  is_up: boolean;
  speed_mbps: number | null;
  rx_bytes_per_sec: number | null;
  tx_bytes_per_sec: number | null;
}

export interface SystemMetricsPayload {
  timestamp: string;
  resources: SystemInfoPayload["resources"];
  disks: SystemDiskUsage[];
  network_interfaces: NetworkInterfaceMetrics[];
}

export interface ConfigMateMeta {
  connection_mode?: "development" | "production" | "cors" | string;
  api_base_url?: string;
  service_name?: string;
}

export interface ConfigMatePayload {
  meta?: ConfigMateMeta;
  defaults?: Record<string, any>;
  lines?: Record<string, any>[];
}

export interface ConfigMateResponse {
  path: string;
  payload: ConfigMatePayload | ConfigMatePayload[] | Record<string, any>;
}

const UI_SETTINGS_KEY = "admin_ui_settings";
const MOCK_DATA_KEY = "admin_mock_data";

const getAdminBaseUrl = (): string => {
  if (env.getMode() === "cors") {
    return `${env.getCorsBaseUrl().replace(/\/+$/, "")}/config`;
  }
  if (env.getMode() === "production") {
    return "/config";
  }
  return "";
};

const toWebSocketUrl = (base: string): string => {
  if (base.startsWith("wss://") || base.startsWith("ws://")) {
    return base;
  }
  if (base.startsWith("https://")) {
    return `wss://${base.slice(8)}`;
  }
  if (base.startsWith("http://")) {
    return `ws://${base.slice(7)}`;
  }
  return `ws://${base.replace(/^\/\//, "")}`;
};

const getAdminWsBaseUrl = (): string => {
  if (env.getMode() === "cors") {
    return `${toWebSocketUrl(env.getCorsBaseUrl().replace(/\/+$/, ""))}/config`;
  }
  return `${toWebSocketUrl(window.location.origin)}/config`;
};

const loadLocalJson = (key: string) => {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveLocalJson = (key: string, payload: unknown) => {
  window.localStorage.setItem(key, JSON.stringify(payload));
};

export async function login(username: string, password: string): Promise<AuthUser> {
  if (env.isDevelopment()) {
    if (username !== "admin" || password !== "Nercar701") {
      throw new Error("用户名或密码错误");
    }
    return { username, role: "admin", is_superuser: true };
  }

  const url = `${getAdminBaseUrl()}/auth/login`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error("用户名或密码错误");
  }
  const data = await response.json();
  return data.user as AuthUser;
}

export async function getUiSettings<T>(fallback: T): Promise<T> {
  if (env.isDevelopment()) {
    return loadLocalJson(UI_SETTINGS_KEY) ?? fallback;
  }
  const url = `${getAdminBaseUrl()}/config/ui-settings`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return fallback;
  }
  return (await response.json()) as T;
}

export async function saveUiSettings(payload: unknown): Promise<void> {
  if (env.isDevelopment()) {
    saveLocalJson(UI_SETTINGS_KEY, payload);
    return;
  }
  const url = `${getAdminBaseUrl()}/config/ui-settings`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("保存 UI 设置失败");
  }
}

export async function getMockDataConfig<T>(fallback: T): Promise<T> {
  if (env.isDevelopment()) {
    return loadLocalJson(MOCK_DATA_KEY) ?? fallback;
  }
  const url = `${getAdminBaseUrl()}/config/mock-data`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return fallback;
  }
  return (await response.json()) as T;
}

export async function saveMockDataConfig(payload: unknown): Promise<void> {
  if (env.isDevelopment()) {
    saveLocalJson(MOCK_DATA_KEY, payload);
    return;
  }
  const url = `${getAdminBaseUrl()}/config/mock-data`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("保存测试数据配置失败");
  }
}

export async function getUsers(): Promise<AdminUser[]> {
  if (env.isDevelopment()) {
    return [
      {
        id: 1,
        username: "admin",
        roles: ["admin"],
        is_active: true,
        is_superuser: true,
        created_at: new Date().toISOString(),
      },
    ];
  }
  const url = `${getAdminBaseUrl()}/admin/users`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("加载用户列表失败");
  }
  const data = await response.json();
  return (data.items ?? []) as AdminUser[];
}

export async function getRoles(): Promise<AdminRole[]> {
  if (env.isDevelopment()) {
    return [
      {
        id: 1,
        name: "admin",
        description: "System administrators",
        created_at: new Date().toISOString(),
      },
    ];
  }
  const url = `${getAdminBaseUrl()}/admin/roles`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("加载角色列表失败");
  }
  const data = await response.json();
  return (data.items ?? []) as AdminRole[];
}

export async function getPolicies(): Promise<AdminPolicy[]> {
  if (env.isDevelopment()) {
    return [
      {
        id: 1,
        ptype: "p",
        v0: "role_admin",
        v1: "*",
        v2: "*",
        v3: null,
        v4: null,
        v5: null,
      },
      {
        id: 2,
        ptype: "g",
        v0: "admin",
        v1: "role_admin",
        v2: null,
        v3: null,
        v4: null,
        v5: null,
      },
    ];
  }
  const url = `${getAdminBaseUrl()}/admin/policies`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("加载权限策略失败");
  }
  const data = await response.json();
  return (data.items ?? []) as AdminPolicy[];
}

export async function createUser(payload: AdminUserPayload): Promise<AdminUser> {
  if (env.isDevelopment()) {
    return {
      id: Date.now(),
      username: payload.username,
      roles: payload.roles,
      is_active: payload.is_active,
      is_superuser: payload.is_superuser,
      created_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/admin/users`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "创建用户失败");
  }
  const data = await response.json();
  return data.item as AdminUser;
}

export async function updateUser(id: number, payload: Partial<AdminUserPayload>): Promise<AdminUser> {
  if (env.isDevelopment()) {
    return {
      id,
      username: payload.username || "admin",
      roles: payload.roles || [],
      is_active: payload.is_active ?? true,
      is_superuser: payload.is_superuser ?? false,
      created_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/admin/users/${id}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "更新用户失败");
  }
  const data = await response.json();
  return data.item as AdminUser;
}

export async function deleteUser(id: number): Promise<void> {
  if (env.isDevelopment()) return;
  const url = `${getAdminBaseUrl()}/admin/users/${id}`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "删除用户失败");
  }
}

export async function createRole(payload: AdminRolePayload): Promise<AdminRole> {
  if (env.isDevelopment()) {
    return {
      id: Date.now(),
      name: payload.name,
      description: payload.description || "",
      created_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/admin/roles`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "创建角色失败");
  }
  const data = await response.json();
  return data.item as AdminRole;
}

export async function updateRole(id: number, payload: Partial<AdminRolePayload>): Promise<AdminRole> {
  if (env.isDevelopment()) {
    return {
      id,
      name: payload.name || "role",
      description: payload.description || "",
      created_at: new Date().toISOString(),
    };
  }
  const url = `${getAdminBaseUrl()}/admin/roles/${id}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "更新角色失败");
  }
  const data = await response.json();
  return data.item as AdminRole;
}

export async function deleteRole(id: number): Promise<void> {
  if (env.isDevelopment()) return;
  const url = `${getAdminBaseUrl()}/admin/roles/${id}`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "删除角色失败");
  }
}

export async function createPolicy(payload: AdminPolicyPayload): Promise<AdminPolicy> {
  if (env.isDevelopment()) {
    return {
      id: Date.now(),
      ptype: payload.ptype,
      v0: payload.v0 ?? null,
      v1: payload.v1 ?? null,
      v2: payload.v2 ?? null,
      v3: payload.v3 ?? null,
      v4: payload.v4 ?? null,
      v5: payload.v5 ?? null,
    };
  }
  const url = `${getAdminBaseUrl()}/admin/policies`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "创建策略失败");
  }
  const data = await response.json();
  return data.item as AdminPolicy;
}

export async function updatePolicy(
  id: number,
  payload: AdminPolicyPayload,
): Promise<AdminPolicy> {
  if (env.isDevelopment()) {
    return {
      id,
      ptype: payload.ptype,
      v0: payload.v0 ?? null,
      v1: payload.v1 ?? null,
      v2: payload.v2 ?? null,
      v3: payload.v3 ?? null,
      v4: payload.v4 ?? null,
      v5: payload.v5 ?? null,
    };
  }
  const url = `${getAdminBaseUrl()}/admin/policies/${id}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "更新策略失败");
  }
  const data = await response.json();
  return data.item as AdminPolicy;
}

export async function deletePolicy(id: number): Promise<void> {
  if (env.isDevelopment()) return;
  const url = `${getAdminBaseUrl()}/admin/policies/${id}`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "删除策略失败");
  }
}

export async function getLineConfig(): Promise<LineConfigPayload> {
  const url = `${getAdminBaseUrl()}/lines`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("加载产线配置失败");
  }
  const data = await response.json();
  return { lines: data.lines ?? [], defaults: data.defaults ?? {} };
}

export async function saveLineConfig(payload: LineConfigPayload): Promise<void> {
  const url = `${getAdminBaseUrl()}/lines`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "保存产线配置失败");
  }
}

export async function getConfigApiList(): Promise<ConfigApiNode[]> {
  const url = `${getAdminBaseUrl()}/api_list`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("加载产线状态失败");
  }
  const data = await response.json();
  return (data.items ?? []) as ConfigApiNode[];
}

export const getConfigSpeedTestUrl = (options?: {
  chunkKb?: number;
  totalMb?: number;
}): string => {
  const base = getAdminBaseUrl() || "/config";
  const params = new URLSearchParams();
  if (options?.chunkKb) params.set("chunk_kb", String(options.chunkKb));
  if (options?.totalMb) params.set("total_mb", String(options.totalMb));
  const query = params.toString();
  return query ? `${base}/speed_test?${query}` : `${base}/speed_test`;
};

export async function getNginxConfig(): Promise<NginxConfigPayload> {
  if (env.isDevelopment()) {
    return {
      path: "../plugins/platforms/windows/nginx/conf/nginx.conf",
      content: "# Start backend to load nginx.conf\n",
    };
  }
  const url = `${getAdminBaseUrl()}/config/nginx`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "Failed to load nginx config");
  }
  return (await response.json()) as NginxConfigPayload;
}

export async function getSystemInfo(): Promise<SystemInfoPayload> {
  if (env.isDevelopment()) {
    return {
      line_names: ["Line-A", "Line-B"],
      database: {
        drive: "mysql",
        host: "127.0.0.1",
        port: 3306,
        database_type: "ncdplate",
        management_database: "DefectDetectionDatabBase",
        test_mode: false,
        main_status: "ok",
        main_error: null,
        management_status: "ok",
        management_error: null,
      },
      server: {
        hostname: "local-dev",
        os_name: "Windows",
        platform: "Windows-10.0.19045",
        platform_release: "10",
        platform_version: "10.0",
        cpu_count: 8,
        cpu_model: "Generic CPU",
      },
      runtime: {
        python_version: "3.11.0",
        python_executable: "C:\\Python\\python.exe",
      },
      resources: {
        cpu_percent: 28.5,
        memory_percent: 62.1,
        memory_total_bytes: 16 * 1024 * 1024 * 1024,
        memory_used_bytes: 9.9 * 1024 * 1024 * 1024,
        network_rx_bytes_per_sec: 1200,
        network_tx_bytes_per_sec: 800,
        notes: [],
      },
      disks: [
        {
          device: "C:",
          mountpoint: "C:\\",
          fstype: "NTFS",
          total_bytes: 512 * 1024 * 1024 * 1024,
          used_bytes: 245 * 1024 * 1024 * 1024,
          free_bytes: 267 * 1024 * 1024 * 1024,
          percent: 47.8,
        },
      ],
      network_interfaces: [
        {
          name: "Ethernet",
          is_up: true,
          speed_mbps: 1000,
          rx_bytes_per_sec: 2.1 * 1024 * 1024,
          tx_bytes_per_sec: 1.6 * 1024 * 1024,
        },
      ],
    };
  }
  const url = `${getAdminBaseUrl()}/system-info`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "Failed to load system info");
  }
  return (await response.json()) as SystemInfoPayload;
}

export const getSystemMetricsWsUrl = (): string => {
  return `${getAdminWsBaseUrl()}/ws/system-metrics`;
};

export async function getConfigMate(): Promise<ConfigMatePayload> {
  if (env.isDevelopment()) {
    return {
      meta: {
        connection_mode: "development",
        api_base_url: "http://127.0.0.1:8120/api",
        service_name: "Defect Detection",
      },
      lines: [],
      defaults: {},
    };
  }
  const url = `${getAdminBaseUrl()}/mate`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load config mate");
  }
  const data = (await response.json()) as ConfigMateResponse;
  const payload = data.payload;
  if (Array.isArray(payload)) {
    return { lines: payload };
  }
  return payload as ConfigMatePayload;
}

export async function restartLine(lineKey: string): Promise<void> {
  const url = `${getAdminBaseUrl()}/restart/${encodeURIComponent(lineKey)}`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "重启产线失败");
  }
}
