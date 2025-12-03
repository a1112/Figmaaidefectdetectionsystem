/**
 * API 客户端
 * 根据环境模式自动切换 Mock 数据或真实 API
 */

import { env } from '../config/env';
import type {
  SteelListResponse,
  DefectResponse,
  HealthResponse,
  SteelItem,
  DefectItem,
  Surface,
  mapSteelItem,
  mapDefectItem,
} from './types';
import * as mock from './mock';

// 导入映射函数
import { mapSteelItem as mapSteel, mapDefectItem as mapDefect } from './types';

/**
 * 获取钢板列表
 */
export async function listSteels(limit: number = 20): Promise<SteelItem[]> {
  // 开发模式：使用 Mock 数据
  if (env.isDevelopment()) {
    const response = await mock.mockListSteels(limit);
    return response.steels.map(mapSteel);
  }

  // 生产模式：调用真实 API
  try {
    const baseUrl = env.getApiBaseUrl();
    const response = await fetch(`${baseUrl}/steels?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data: SteelListResponse = await response.json();
    return data.steels.map(mapSteel);
  } catch (error) {
    console.error('Failed to fetch steels:', error);
    throw error;
  }
}

/**
 * 获取指定钢板的缺陷列表
 */
export async function getDefects(seqNo: number): Promise<DefectItem[]> {
  // 开发模式：使用 Mock 数据
  if (env.isDevelopment()) {
    const response = await mock.mockGetDefects(seqNo);
    return response.defects.map(mapDefect);
  }

  // 生产模式：调用真实 API
  try {
    const baseUrl = env.getApiBaseUrl();
    const response = await fetch(`${baseUrl}/defects/${seqNo}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data: DefectResponse = await response.json();
    return data.defects.map(mapDefect);
  } catch (error) {
    console.error('Failed to fetch defects:', error);
    throw error;
  }
}

/**
 * 获取缺陷图像 URL
 */
export async function getFrameImage(
  surface: Surface,
  seqNo: number,
  imageIndex: number
): Promise<string> {
  // 开发模式：使用 Mock 图像
  if (env.isDevelopment()) {
    return await mock.mockGetFrameImage(surface, seqNo, imageIndex);
  }

  // 生产模式：返回真实 API 图像 URL
  const baseUrl = env.getApiBaseUrl();
  return `${baseUrl}/images/frame?surface=${surface}&seq_no=${seqNo}&image_index=${imageIndex}`;
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
    const response = await fetch('/health');
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 获取当前 API 模式的状态信息
 */
export function getApiStatus(): {
  mode: 'development' | 'production';
  description: string;
  baseUrl: string;
} {
  const mode = env.getMode();
  return {
    mode,
    description: mode === 'development' 
      ? '开发模式 - 使用模拟数据' 
      : '生产模式 - 连接真实后端',
    baseUrl: env.getApiBaseUrl() || 'Mock Data',
  };
}
