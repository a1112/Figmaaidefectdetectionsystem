/**
 * API 客户端
 * 根据环境模式自动切换 Mock 数据或真实 API
 */

import { env } from "../config/env";
import type {
  SteelListResponse,
  DefectResponse,
  HealthResponse,
  SteelItem,
  DefectItem,
  Surface,
  SteelMetaResponse,
  ApiListResponse,
  ApiNode,
  DefectClassesResponse,
  DefectAnnotationListResponse,
  DefectAnnotationCreate,
  DefectAnnotationItem,
} from "./types";
import * as mock from "./mock";

// 导入映射函数
import {
  mapSteelItem as mapSteel,
  mapDefectItem as mapDefect,
} from "./types";

const mockAnnotations: DefectAnnotationItem[] = [];

export interface SteelSearchParams {
  limit?: number;
  serialNumber?: string;
  plateId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * 获取钢板列表
 */
export async function listSteels(
  limit: number = 20,
): Promise<SteelItem[]> {
  // 开发模式：使用 Mock 数据
  if (env.isDevelopment()) {
    const response = await mock.mockListSteels(limit);
    return response.steels.map(mapSteel);
  }

  // 生产模式：调用真实 API
  try {
    const baseUrl = env.getApiBaseUrl();
    const url = `${baseUrl}/steels?limit=${limit}`;
    console.log(`🌐 [生产模式] 请求钢板列表: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;

      // 检查是否返回了 HTML 而不是 JSON（通常是 404 页面）
      if (contentType && contentType.includes("text/html")) {
        errorMessage +=
          "\n\n⚠️ 后端返回了 HTML 页面而不是 JSON 数据。\n";
        errorMessage += "可能的原因：\n";
        errorMessage +=
          "1. 后端服务器没有运行（请执行: python run_server.bat）\n";
        errorMessage += "2. API 路径不正确\n";
        errorMessage +=
          "3. Vite 代理配置有问题（请检查 vite.config.ts）\n";
        errorMessage += `\n请求的 URL: ${url}`;
      }

      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (
      !contentType ||
      !contentType.includes("application/json")
    ) {
      throw new Error(
        `服务器返回了非 JSON 数据 (Content-Type: ${contentType})\n` +
          `这通常意味着后端没有正确运行或返回了错误页面。\n` +
          `请确保后端服务器正在运行在 http://localhost:8120`,
      );
    }

    const data: SteelListResponse = await response.json();
    return data.steels.map(mapSteel);
  } catch (error) {
    console.error("❌ 加载钢板列表失败:", error);

    // 针对跨域模式下的连接错误（通常是证书问题）
    if (env.getMode() === "cors" && error instanceof TypeError && error.message === "Failed to fetch") {
      const baseUrl = env.getApiBaseUrl();
      const rootUrl = baseUrl.replace(/\/api$/, "");
      throw new Error(
        `无法连接到远程服务器。\n\n` +
        `可能原因：\n` +
        `1. 自签名证书未被信任。请在新标签页访问 ${rootUrl}/api/health 并点击“高级->继续访问”。\n` +
        `2. 网络不通或被防火墙拦截。`
      );
    }

    // 如果是 JSON 解析错误，提供更友好的提示
    if (
      error instanceof SyntaxError &&
      error.message.includes("JSON")
    ) {
      throw new Error(
        "后端返回了无效的响应（可能是 HTML 错误页面）\n\n" +
          "📋 请检查：\n" +
          "1. 后端是否正在运行？\n" +
          "   → 执行: python run_server.bat\n" +
          "   → 访问: http://localhost:8120/api/health\n\n" +
          "2. Vite 开发服务器是否正确配置了代理？\n" +
          "   → 检查: vite.config.ts\n\n" +
          "3. 如果以上都正常，请切换回开发模式继续开发\n" +
          "   → 在系统设置中切换到「开发模式」",
      );
    }

    throw error;
  }
}

/**
 * 查询钢板
 * 路径: /api/steels/search
 */
export async function searchSteels(
  params: SteelSearchParams,
): Promise<SteelItem[]> {
  const {
    limit = 20,
    serialNumber,
    plateId,
    dateFrom,
    dateTo,
  } = params;

  // 开发模式：共用 mock
  if (env.isDevelopment()) {
    const response = await mock.mockListSteels(limit);
    return response.steels.map(mapSteel);
  }

  const query = new URLSearchParams();
  query.set("limit", limit.toString());
  if (serialNumber) query.set("seq_no", serialNumber);
  if (plateId) query.set("steel_no", plateId);
  if (dateFrom) query.set("date_from", dateFrom);
  if (dateTo) query.set("date_to", dateTo);

  const baseUrl = env.getApiBaseUrl();
  const url = `${baseUrl}/steels/search?${query.toString()}`;
  console.log(`🌐 [生产模式] 查询钢板: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `查询钢板失败: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type");
  if (
    !contentType ||
    !contentType.includes("application/json")
  ) {
    throw new Error(
      `钢板查询接口返回非 JSON 数据 (Content-Type: ${contentType})`,
    );
  }

  const data: SteelListResponse = await response.json();
  return data.steels.map(mapSteel);
}

/**
 * 获取指定钢板的缺陷列表（仅缺陷数据，前端 DefectItem）
 */
export async function getDefects(
  seqNo: number,
): Promise<DefectItem[]> {
  const data = await getDefectsRaw(seqNo);
  return data.defects.map(mapDefect);
}

/**
 * 获取指定钢板的缺陷列表（保留后端原始字段）
 * 对应后端 /api/defects/{seq_no} 响应。
 */
export async function getDefectsRaw(
  seqNo: number,
): Promise<DefectResponse> {
  // 开发模式：使用 Mock 数据
  if (env.isDevelopment()) {
    const response = await mock.mockGetDefects(seqNo);
    return response;
  }

  // 生产模式：调用真实 API
  try {
    const baseUrl = env.getApiBaseUrl();
    const url = `${baseUrl}/defects/${seqNo}`;
    console.log(`🌐 [生产模式] 请求缺陷数据: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;

      if (contentType && contentType.includes("text/html")) {
        errorMessage +=
          "\n\n⚠️ 后端返回了 HTML 页面而不是 JSON 数据";
      }

      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (
      !contentType ||
      !contentType.includes("application/json")
    ) {
      throw new Error(
        `服务器返回了非 JSON 数据 (Content-Type: ${contentType})`,
      );
    }

    const data: DefectResponse = await response.json();
    return data;
  } catch (error) {
    console.error("❌ 加载缺陷数据失败:", error);

    if (env.getMode() === "cors" && error instanceof TypeError && error.message === "Failed to fetch") {
      const baseUrl = env.getApiBaseUrl();
      const rootUrl = baseUrl.replace(/\/api$/, "");
      throw new Error(
        `无法连接到远程服务器。请尝试在新标签页访问 ${rootUrl}/api/health 并接受证书。`
      );
    }

    if (
      error instanceof SyntaxError &&
      error.message.includes("JSON")
    ) {
      throw new Error(
        "后端返回了无效的响应，请确保后端服务器正在运行",
      );
    }

    throw error;
  }
}

/**
 * 获取帧图像 URL
 */
export async function getFrameImage(
  surface: Surface,
  seqNo: number,
  imageIndex: number,
): Promise<string> {
  // 开发模式：使用 Mock 图像
  if (env.isDevelopment()) {
    return await mock.mockGetFrameImage(
      surface,
      seqNo,
      imageIndex,
    );
  }

  // 生产模式：返回真实 API 图像 URL
  const baseUrl = env.getApiBaseUrl();
  const search = new URLSearchParams({
    surface,
    seq_no: seqNo.toString(),
    image_index: imageIndex.toString(),
    scale: env.getImageScale().toString(),
  });
  return `${baseUrl}/images/frame?${search.toString()}`;
}

/**
 * 获取缺陷小图 URL
 * 对应后端 /api/images/defect/{defect_id}，内部已实现：
 *  - 内存缓存 → 磁盘缓存 → 原图裁剪 的优先级。
 */
export function getDefectImageUrl(params: {
  defectId: string | number;
  surface: Surface;
  expand?: number;
  width?: number;
  height?: number;
  fmt?: string;
}): string {
  const {
    defectId,
    surface,
    expand,
    width,
    height,
    fmt = "JPEG",
  } = params;

  // 开发模式：直接返回占位图，避免依赖真实后端
  if (env.isDevelopment()) {
    const seed = `${defectId}-${surface}`;
    return `https://picsum.photos/seed/${encodeURIComponent(
      seed,
    )}/800/600`;
  }

  const baseUrl = env.getApiBaseUrl();
  const search = new URLSearchParams();
  search.set("surface", surface);
  if (typeof expand === "number") {
    search.set("expand", expand.toString());
  }
  if (typeof width === "number") {
    search.set("width", width.toString());
  }
  if (typeof height === "number") {
    search.set("height", height.toString());
  }
  if (fmt) {
    search.set("fmt", fmt);
  }
  search.set("scale", env.getImageScale().toString());

  search.set("defect_id", String(defectId));
  return `${baseUrl}/images/crop?${search.toString()}`;
}

/**
 * 获取指定钢板的图像元信息（帧数 + 尺寸）
 * 对应后端 /api/steel-meta/{seq_no} 响应。
 */
export async function getSteelMeta(
  seqNo: number,
): Promise<SteelMetaResponse> {
  // 开发模式：使用 mock 缺陷接口中的 surface_images 生成占位元信息
  if (env.isDevelopment()) {
    const mockResponse = await mock.mockGetDefects(seqNo);
    return {
      seq_no: mockResponse.seq_no,
      surface_images: mockResponse.surface_images ?? [],
    };
  }

  const baseUrl = env.getApiBaseUrl();
  const url = `${baseUrl}/steel-meta/${seqNo}`;
  console.log(`🌐 [生产模式] 请求钢板图像元信息: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `加载钢板图像元信息失败: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (
      !contentType ||
      !contentType.includes("application/json")
    ) {
      throw new Error(
        `钢板图像元信息接口返回非 JSON 数据 (Content-Type: ${contentType})`,
      );
    }

    return await response.json() as Promise<SteelMetaResponse>;
  } catch (error) {
    if (env.getMode() === "cors" && error instanceof TypeError && error.message === "Failed to fetch") {
       throw new Error("无法连接到远程服务器（可能是证书或网络问题）。");
    }
    throw error;
  }
}

/**
 * 获取瓦片图像 URL（用于长带拼接图的分块加载）
 */
export function getTileImageUrl(params: {
  surface: Surface;
  seqNo: number;
  level?: number;
  tileX: number;
  tileY: number;
  tileSize?: number;
  fmt?: string;
  view?: string;
  prefetch?: {
    mode: "defect";
    x: number;
    y: number;
    imageIndex?: number;
  };
}): string {
  const {
    surface,
    seqNo,
    level = 0,
    tileX,
    tileY,
    fmt = "JPEG",
    view,
    prefetch,
  } = params;

  // 在生产/跨域模式下，如果还未选择产线（line_name 为空），
  // 避免访问不可用的 /api/images 路径，直接返回空字符串。
  // 这样调用方会拿到空 src，不会发起错误请求。
  const lineName = (env as any).getLineName
    ? (env as any).getLineName()
    : "";
  if (env.isProduction() && !lineName) {
    return "";
  }

  const baseUrl = env.getApiBaseUrl();
  const search = new URLSearchParams({
    surface,
    seq_no: seqNo.toString(),
    level: level.toString(),
    tile_x: tileX.toString(),
    tile_y: tileY.toString(),
    fmt,
  });
  if (view) {
    search.set("view", view);
  }
  if (typeof tileSize === "number") {
    search.set("tile_size", tileSize.toString());
  }
  search.set("scale", env.getImageScale().toString());
  if (prefetch?.mode === "defect") {
    search.set("prefetch", "defect");
    search.set("prefetch_x", Math.round(prefetch.x).toString());
    search.set("prefetch_y", Math.round(prefetch.y).toString());
    if (typeof prefetch.imageIndex === "number") {
      search.set("prefetch_image_index", prefetch.imageIndex.toString());
    }
  }
  return `${baseUrl}/images/tile?${search.toString()}`;
}

/**
 * 获取全局 Meta 信息（缺陷字典 + 瓦片配置等）
 * 用于页面刷新时一次性加载全局配置，避免单独再调 defect-classes。
 */
export async function getGlobalMeta(): Promise<{
  defect_classes: any;
  tile: {
    max_level: number;
    min_level: number;
    default_tile_size: number;
  };
  image: { frame_width: number; frame_height: number };
  defect_cache_expand?: number;
}> {
  if (env.isDevelopment()) {
    // 开发模式：沿用原有 mock 行为，这里简单返回空对象占位
    return {
      defect_classes: {},
      tile: {
        max_level: 2,
        min_level: 0,
        default_tile_size: 1024,
      },
      image: { frame_width: 16384, frame_height: 1024 },
    };
  }

  const baseUrl = env.getApiBaseUrl();
  const url = `${baseUrl}/meta`;
  console.log(`🌐 [生产模式] 请求全局 Meta: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `加载全局 Meta 失败: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (
      !contentType ||
      !contentType.includes("application/json")
    ) {
      throw new Error(
        `全局 Meta 接口返回非 JSON 数据 (Content-Type: ${contentType})`,
      );
    }

    return await response.json();
  } catch (error) {
    if (env.getMode() === "cors" && error instanceof TypeError && error.message === "Failed to fetch") {
      const rootUrl = baseUrl.replace(/\/api$/, "");
      throw new Error(
        `无法连接到远程服务器。\n` +
        `请尝试在新标签页访问 ${rootUrl}/api/health 并接受自签名证书。`
      );
    }
    throw error;
  }
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<HealthResponse> {
  // 开发模式：使用 Mock 数据
  if (env.isDevelopment()) {
    return await mock.mockHealthCheck();
  }

  // 生产模式：调用真实 API
  try {
    let url = "/api/health";
    // 跨域模式下，需要使用完整的远程 URL
    if (env.getMode() === "cors") {
      // 假设 health 接口位于服务器根路径 /api/health
      // BaseUrl 是 .../api，所以我们需要截取 root
      const baseUrl = env.getApiBaseUrl(); // https://111.230.72.96:8230/api
      const rootUrl = baseUrl.replace(/\/api$/, "");
      url = `${rootUrl}/api/health`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Health check failed: ${response.status}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Health check failed:", error);
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 获取当前 API 模式的状态信息
 */
export function getApiStatus(): {
  mode: "development" | "production" | "cors";
  description: string;
  baseUrl: string;
} {
  const mode = env.getMode();
  let description = "开发模式 - 使用模拟数据";
  
  if (mode === "production") {
    description = "生产模式 - 连接真实后端";
  } else if (mode === "cors") {
    description = "跨域模式 - 连接远程后端";
  }

  return {
    mode,
    description,
    baseUrl: env.getApiBaseUrl() || "Mock Data",
  };
}

/**
 * 获取可用产线/节点列表
 */
export async function getApiList(): Promise<ApiNode[]> {
  if (env.isDevelopment()) {
    return mock.mockGetApiList();
  }
  const configBase = env.getConfigBaseUrl();
  const url = configBase ? `${configBase}/config/api_list` : "/config/api_list";
  
  try {
    console.log(`📡 getApiList: ${url}`);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`加载 API 列表失败: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("⚠️ getApiList: Received non-JSON response (likely HTML index). Falling back to empty list.");
      return [];
    }
    
    const data: ApiListResponse = await response.json();
    return data.items ?? [];
  } catch (error) {
    console.warn("⚠️ getApiList failed:", error);
    return []; // Return empty list instead of crashing
  }
}

/**
 * 获取缺陷字典
 */
export async function getDefectClasses(): Promise<DefectClassesResponse> {
  if (env.isDevelopment()) {
    return mock.mockGetDefectClasses();
  }

  const baseUrl = env.getApiBaseUrl();
  const url = `${baseUrl}/defect-classes`;
  console.log(`🌐 [生产模式] 请求缺陷字典: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `加载缺陷字典失败: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type");
  if (
    !contentType ||
    !contentType.includes("application/json")
  ) {
    throw new Error(
      `缺陷字典接口返回非 JSON 数据 (Content-Type: ${contentType})`,
    );
  }

  return response.json() as Promise<DefectClassesResponse>;
}

export async function getDefectAnnotations(params: {
  lineKey?: string;
  seqNo?: number;
  surface?: "top" | "bottom";
  view?: string;
}): Promise<DefectAnnotationListResponse> {
  if (env.isDevelopment()) {
    let items = [...mockAnnotations];
    if (params.lineKey) {
      items = items.filter((item) => item.line_key === params.lineKey);
    }
    if (typeof params.seqNo === "number") {
      items = items.filter((item) => item.seq_no === params.seqNo);
    }
    if (params.surface) {
      items = items.filter((item) => item.surface === params.surface);
    }
    if (params.view) {
      items = items.filter((item) => item.view === params.view);
    }
    return { items };
  }

  const baseUrl = env.getApiBaseUrl();
  const url = new URL(`${baseUrl}/annotations`, window.location.origin);
  if (params.lineKey) url.searchParams.set("line_key", params.lineKey);
  if (typeof params.seqNo === "number") url.searchParams.set("seq_no", String(params.seqNo));
  if (params.surface) url.searchParams.set("surface", params.surface);
  if (params.view) url.searchParams.set("view", params.view);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `加载缺陷标注失败: ${response.status} ${response.statusText}`,
    );
  }
  return response.json() as Promise<DefectAnnotationListResponse>;
}

export async function createDefectAnnotationsBulk(
  payload: DefectAnnotationCreate[],
): Promise<DefectAnnotationListResponse> {
  if (env.isDevelopment()) {
    const now = Date.now();
    const created = payload.map((item, index) => ({
      id: now + index,
      line_key: item.line_key,
      seq_no: item.seq_no,
      surface: item.surface,
      view: item.view,
      user: item.user ?? null,
      method: item.method,
      bbox: item.bbox,
      class_id: item.class_id ?? null,
      class_name: item.class_name ?? null,
      mark: item.mark ?? null,
      export_payload: item.export_payload ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    mockAnnotations.push(...created);
    return { items: created };
  }

  const baseUrl = env.getApiBaseUrl();
  const response = await fetch(`${baseUrl}/annotations/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      `提交缺陷标注失败: ${response.status} ${response.statusText}`,
    );
  }
  return response.json() as Promise<DefectAnnotationListResponse>;
}

export async function updateDefectAnnotation(
  annotationId: number,
  payload: Partial<DefectAnnotationCreate>,
): Promise<DefectAnnotationItem> {
  if (env.isDevelopment()) {
    const index = mockAnnotations.findIndex((item) => item.id === annotationId);
    if (index === -1) {
      throw new Error("Annotation not found");
    }
    const existing = mockAnnotations[index];
    const updated = {
      ...existing,
      ...payload,
      bbox: payload.bbox ?? existing.bbox,
      updated_at: new Date().toISOString(),
    } as DefectAnnotationItem;
    mockAnnotations[index] = updated;
    return updated;
  }

  const baseUrl = env.getApiBaseUrl();
  const response = await fetch(`${baseUrl}/annotations/${annotationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      `更新缺陷标注失败: ${response.status} ${response.statusText}`,
    );
  }
  return response.json() as Promise<DefectAnnotationItem>;
}

export async function deleteDefectAnnotation(
  annotationId: number,
): Promise<void> {
  if (env.isDevelopment()) {
    const index = mockAnnotations.findIndex((item) => item.id === annotationId);
    if (index >= 0) {
      mockAnnotations.splice(index, 1);
    }
    return;
  }

  const baseUrl = env.getApiBaseUrl();
  const response = await fetch(`${baseUrl}/annotations/${annotationId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(
      `删除缺陷标注失败: ${response.status} ${response.statusText}`,
    );
  }
}
