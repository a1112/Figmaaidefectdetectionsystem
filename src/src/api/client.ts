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
} from "./types";
import * as mock from "./mock";

// 导入映射函数
import { mapSteelItem as mapSteel, mapDefectItem as mapDefect } from "./types";

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
        errorMessage += "\n\n⚠️ 后端返回了 HTML 页面而不是 JSON 数据。\n";
        errorMessage += "可能的原因：\n";
        errorMessage += "1. 后端服务器没有运行（请执行: python run_server.bat）\n";
        errorMessage += "2. API 路径不正确\n";
        errorMessage += "3. Vite 代理配置有问题（请检查 vite.config.ts）\n";
        errorMessage += `\n请求的 URL: ${url}`;
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        `服务器返回了非 JSON 数据 (Content-Type: ${contentType})\n` +
        `这通常意味着后端没有正确运行或返回了错误页面。\n` +
        `请确保后端服务器正在运行在 http://localhost:8120`
      );
    }

    const data: SteelListResponse = await response.json();
    return data.steels.map(mapSteel);
  } catch (error) {
    console.error("❌ 加载钢板列表失败:", error);
    
    // 如果是 JSON 解析错误，提供更友好的提示
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      throw new Error(
        "后端返回了无效的响应（可能是 HTML 错误页面）\n\n" +
        "📋 请检查：\n" +
        "1. 后端是否正在运行？\n" +
        "   → 执行: python run_server.bat\n" +
        "   → 访问: http://localhost:8120/health\n\n" +
        "2. Vite 开发服务器是否正确配置了代理？\n" +
        "   → 检查: vite.config.ts\n\n" +
        "3. 如果以上都正常，请切换回开发模式继续开发\n" +
        "   → 在系统设置中切换到「开发模式」"
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
  const { limit = 20, serialNumber, plateId, dateFrom, dateTo } = params;

  // 开发模式：共用 mock
  if (env.isDevelopment()) {
    const response = await mock.mockListSteels(limit);
    return response.steels.map(mapSteel);
  }

  const query = new URLSearchParams();
  query.set('limit', limit.toString());
  if (serialNumber) query.set('seq_no', serialNumber);
  if (plateId) query.set('steel_no', plateId);
  if (dateFrom) query.set('date_from', dateFrom);
  if (dateTo) query.set('date_to', dateTo);

  const baseUrl = env.getApiBaseUrl();
  const url = `${baseUrl}/steels/search?${query.toString()}`;
  console.log(`🌐 [生产模式] 查询钢板: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`查询钢板失败: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`钢板查询接口返回非 JSON 数据 (Content-Type: ${contentType})`);
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
        errorMessage += "\n\n⚠️ 后端返回了 HTML 页面而不是 JSON 数据";
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        `服务器返回了非 JSON 数据 (Content-Type: ${contentType})`
      );
    }

    const data: DefectResponse = await response.json();
    return data;
  } catch (error) {
    console.error("❌ 加载缺陷数据失败:", error);
    
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      throw new Error("后端返回了无效的响应，请确保后端服务器正在运行");
    }

    throw error;
  }
}

/**
 * 获取缺陷图像 URL
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
  return `${baseUrl}/images/frame?surface=${surface}&seq_no=${seqNo}&image_index=${imageIndex}`;
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

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`加载钢板图像元信息失败: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`钢板图像元信息接口返回非 JSON 数据 (Content-Type: ${contentType})`);
  }

  return response.json() as Promise<SteelMetaResponse>;
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
}): string {
  const { surface, seqNo, level = 0, tileX, tileY, tileSize = 1024, fmt = "JPEG" } = params;
  const baseUrl = env.getApiBaseUrl();
  return (
    `${baseUrl}/images/tile` +
    `?surface=${surface}` +
    `&seq_no=${seqNo}` +
    `&level=${level}` +
    `&tile_x=${tileX}` +
    `&tile_y=${tileY}` +
    `&tile_size=${tileSize}` +
    `&fmt=${fmt}`
  );
}

/**
 * 获取全局 Meta 信息（缺陷字典 + 瓦片配置等）
 * 用于页面刷新时一次性加载全局配置，避免单独再调 defect-classes。
 */
export async function getGlobalMeta(): Promise<{
  defect_classes: any;
  tile: { max_level: number; min_level: number; default_tile_size: number };
  image: { frame_width: number; frame_height: number };
}> {
  if (env.isDevelopment()) {
    // 开发模式：沿用原有 mock 行为，这里简单返回空对象占位
    return {
      defect_classes: {},
      tile: { max_level: 2, min_level: 0, default_tile_size: 1024 },
    };
  }

  const baseUrl = env.getApiBaseUrl();
  const url = `${baseUrl}/meta`;
  console.log(`🌐 [生产模式] 请求全局 Meta: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`加载全局 Meta 失败: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`全局 Meta 接口返回非 JSON 数据 (Content-Type: ${contentType})`);
  }

  return response.json();
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
    const response = await fetch("/health");

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
  mode: "development" | "production";
  description: string;
  baseUrl: string;
} {
  const mode = env.getMode();
  return {
    mode,
    description:
      mode === "development"
        ? "开发模式 - 使用模拟数据"
        : "生产模式 - 连接真实后端",
    baseUrl: env.getApiBaseUrl() || "Mock Data",
  };
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
    throw new Error(`加载缺陷字典失败: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`缺陷字典接口返回非 JSON 数据 (Content-Type: ${contentType})`);
  }

  return response.json() as Promise<DefectClassesResponse>;
}
