// 缺陷相关工具函数

import type { Defect } from '../types/app.types';
import { DEFECT_TYPES } from '../src/api/types';
import { generateMockDefects } from '../src/api/mock';

// 缺陷类型列表（统一从 API 类型导出）
export const defectTypes = [...DEFECT_TYPES];

// 缺陷类型对应的强调色（用于复选框等组件）
export const defectAccentColors: Record<string, string> = {
  '纵向裂纹': '#ef4444',
  '横向裂纹': '#f97316',
  '异物压入': '#eab308',
  '孔洞': '#22c55e',
  '辊印': '#06b6d4',
  '压氧': '#3b82f6',
  '边裂': '#a855f7',
  '划伤': '#ec4899',
};

// 缺陷类型颜色映射
export const defectColors: { 
  [key: string]: { 
    bg: string; 
    border: string; 
    text: string; 
    activeBg: string; 
    activeBorder: string; 
    activeText: string 
  } 
} = {
  '纵向裂纹': { 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/40', 
    text: 'text-red-400', 
    activeBg: 'bg-red-500', 
    activeBorder: 'border-red-500', 
    activeText: 'text-white' 
  },
  '横向裂纹': { 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/40', 
    text: 'text-orange-400', 
    activeBg: 'bg-orange-500', 
    activeBorder: 'border-orange-500', 
    activeText: 'text-white' 
  },
  '异物压入': { 
    bg: 'bg-yellow-500/10', 
    border: 'border-yellow-500/40', 
    text: 'text-yellow-400', 
    activeBg: 'bg-yellow-500', 
    activeBorder: 'border-yellow-500', 
    activeText: 'text-white' 
  },
  '孔洞': { 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/40', 
    text: 'text-green-400', 
    activeBg: 'bg-green-500', 
    activeBorder: 'border-green-500', 
    activeText: 'text-white' 
  },
  '辊印': { 
    bg: 'bg-cyan-500/10', 
    border: 'border-cyan-500/40', 
    text: 'text-cyan-400', 
    activeBg: 'bg-cyan-500', 
    activeBorder: 'border-cyan-500', 
    activeText: 'text-white' 
  },
  '压氧': { 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/40', 
    text: 'text-blue-400', 
    activeBg: 'bg-blue-500', 
    activeBorder: 'border-blue-500', 
    activeText: 'text-white' 
  },
  '边裂': { 
    bg: 'bg-purple-500/10', 
    border: 'border-purple-500/40', 
    text: 'text-purple-400', 
    activeBg: 'bg-purple-500', 
    activeBorder: 'border-purple-500', 
    activeText: 'text-white' 
  },
  '划伤': { 
    bg: 'bg-pink-500/10', 
    border: 'border-pink-500/40', 
    text: 'text-pink-400', 
    activeBg: 'bg-pink-500', 
    activeBorder: 'border-pink-500', 
    activeText: 'text-white' 
  }
};

// 生成随机缺陷数据（用于开发模式）
export const generateRandomDefects = (): Defect[] => {
  // 使用 API 层的 mock 生成逻辑，确保字段与接口保持一致
  return generateMockDefects(Date.now()).map(defect => ({
    ...defect,
    imageIndex: defect.imageIndex ?? 0,
  }));
};
