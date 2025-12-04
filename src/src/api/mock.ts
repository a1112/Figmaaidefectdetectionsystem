/**
 * Mock 数据生成器
 * 用于开发模式，模拟后端 API 响应
 */

import type { 
  SteelListResponse, 
  DefectResponse, 
  HealthResponse,
  DefectItemRaw,
  DefectItem,
  SteelItemRaw,
  Severity,
  Surface,
  DefectClassesResponse,
  DefectClassItem,
} from './types';
import { DEFECT_TYPES, mapDefectItem } from './types';

// 钢种列表
const steelGrades = ['Q235B', 'Q345B', 'Q420C', '16MnR', '45#钢'];

const defectClassItems: DefectClassItem[] = [
  { class: 0, name: 'noclass', tag: 'N0', color: { red: 0, green: 255, blue: 64 }, desc: '未命名', parent: [] },
  { class: 1, name: 'verCrack', tag: 'L0', color: { red: 174, green: 0, blue: 0 }, desc: '纵向裂纹', parent: [] },
  { class: 2, name: 'horCrack', tag: 'L1', color: { red: 128, green: 64, blue: 64 }, desc: '横向裂纹', parent: [] },
  { class: 3, name: 'foreignPress', tag: 'F0', color: { red: 204, green: 102, blue: 0 }, desc: '异物压入', parent: [] },
  { class: 4, name: 'hole', tag: 'H0', color: { red: 0, green: 128, blue: 255 }, desc: '孔洞', parent: [] },
  { class: 5, name: 'roller', tag: 'R0', color: { red: 0, green: 204, blue: 255 }, desc: '辊印', parent: [] },
  { class: 6, name: 'oxygen', tag: 'O0', color: { red: 32, green: 64, blue: 192 }, desc: '压氧', parent: [] },
  { class: 7, name: 'edgeCrack', tag: 'E0', color: { red: 128, green: 0, blue: 128 }, desc: '边裂', parent: [] },
  { class: 8, name: 'scratch', tag: 'S0', color: { red: 255, green: 64, blue: 160 }, desc: '划伤', parent: [] },
];

/**
 * 生成随机钢板数据
 */
function generateMockSteel(seqNo: number): SteelItemRaw {
  const now = new Date();
  const timestamp = new Date(now.getTime() - seqNo * 60000); // 每个钢板间隔1分钟
  
  return {
    seq_no: seqNo,
    steel_no: `SP${String(seqNo).padStart(6, '0')}`,
    steel_type: steelGrades[Math.floor(Math.random() * steelGrades.length)],
    length: Math.floor(Math.random() * 3000) + 6000,  // 6000-9000mm
    width: Math.floor(Math.random() * 1000) + 1500,   // 1500-2500mm
    thickness: Math.floor(Math.random() * 30) + 10,   // 10-40mm
    timestamp: timestamp.toISOString(),
    level: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)] as 'A' | 'B' | 'C' | 'D',
    defect_count: Math.floor(Math.random() * 15),
  };
}

/**
 * 生成随机缺陷数据
 */
export function generateMockDefect(seqNo: number, index: number): DefectItemRaw {
  const severities: Severity[] = ['low', 'medium', 'high'];
  const surfaces: Surface[] = ['top', 'bottom'];
  
  return {
    defect_id: `D${seqNo}-${index}`,
    defect_type: DEFECT_TYPES[Math.floor(Math.random() * DEFECT_TYPES.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    x: Math.random() * 80 + 5,  // 5-85%
    y: Math.random() * 80 + 5,  // 5-85%
    width: Math.random() * 8 + 3,  // 3-11%
    height: Math.random() * 8 + 3, // 3-11%
    confidence: Math.random() * 0.25 + 0.7, // 70-95%
    surface: surfaces[Math.floor(Math.random() * surfaces.length)],
    image_index: Math.floor(Math.random() * 5), // 0-4
  };
}

function generateMockDefectList(seqNo: number, defectCount?: number): DefectItemRaw[] {
  const count = defectCount ?? Math.floor(Math.random() * 12) + 3;
  const defects: DefectItemRaw[] = [];

  for (let i = 0; i < count; i++) {
    defects.push(generateMockDefect(seqNo, i));
  }

  return defects;
}

/**
 * 生成缺陷列表（前端映射格式）
 */
export function generateMockDefects(seqNo: number, defectCount?: number): DefectItem[] {
  return generateMockDefectList(seqNo, defectCount).map(mapDefectItem);
}

/**
 * Mock: 获取钢板列表
 */
export async function mockListSteels(limit: number = 20): Promise<SteelListResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  const steels: SteelItemRaw[] = [];
  for (let i = 1; i <= limit; i++) {
    steels.push(generateMockSteel(1000 + i));
  }
  
  return {
    steels: steels.reverse(), // 最新的在前面
    total: limit,
  };
}

/**
 * Mock: 获取指定钢板的缺陷列表
 */
export async function mockGetDefects(seqNo: number): Promise<DefectResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 150));
  
  const defects: DefectItemRaw[] = generateMockDefectList(seqNo);
  
  return {
    seq_no: seqNo,
    defects,
    total_count: defects.length,
  };
}

/**
 * Mock: 获取缺陷图像 URL
 */
export async function mockGetFrameImage(
  surface: Surface,
  seqNo: number,
  imageIndex: number
): Promise<string> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 返回 placeholder 图像
  const width = 800;
  const height = 600;
  const seed = `${seqNo}-${surface}-${imageIndex}`;
  
  // 使用 picsum.photos 作为占位图
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/**
 * Mock: 健康检查
 */
export async function mockHealthCheck(): Promise<HealthResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'v2.0.1-mock',
    database: {
      connected: true,
      latency_ms: Math.random() * 10 + 5,
    },
  };
}

/**
 * Mock: 缺陷字典
 */
export async function mockGetDefectClasses(): Promise<DefectClassesResponse> {
  await new Promise(resolve => setTimeout(resolve, 120));
  return {
    num: defectClassItems.length,
    items: defectClassItems,
  };
}
