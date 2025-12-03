/**
 * Mock 数据生成器
 * 用于开发模式，模拟后端 API 响应
 */

import type { 
  SteelListResponse, 
  DefectResponse, 
  HealthResponse,
  DefectItemRaw,
  SteelItemRaw,
  Severity,
  Surface 
} from './types';

// 缺陷类型列表
const defectTypes = [
  '纵向裂纹',
  '横向裂纹',
  '异物压入',
  '孔洞',
  '辊印',
  '压氧',
  '边裂',
  '划伤'
];

// 钢种列表
const steelGrades = ['Q235B', 'Q345B', 'Q420C', '16MnR', '45#钢'];

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
function generateMockDefect(seqNo: number, index: number): DefectItemRaw {
  const severities: Severity[] = ['low', 'medium', 'high'];
  const surfaces: Surface[] = ['top', 'bottom'];
  
  return {
    defect_id: `D${seqNo}-${index}`,
    defect_type: defectTypes[Math.floor(Math.random() * defectTypes.length)],
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
  
  const defectCount = Math.floor(Math.random() * 12) + 3; // 3-14个缺陷
  const defects: DefectItemRaw[] = [];
  
  for (let i = 0; i < defectCount; i++) {
    defects.push(generateMockDefect(seqNo, i));
  }
  
  return {
    seq_no: seqNo,
    defects,
    total_count: defectCount,
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
