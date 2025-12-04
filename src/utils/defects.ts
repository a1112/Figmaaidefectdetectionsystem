// 缺陷相关工具函数

import type { Defect } from '../types/app.types';

// 缺陷类型列表
export const defectTypes = ['纵向裂纹', '横向裂纹', '异物压入', '孔洞', '辊印', '压氧', '边裂', '划伤'];

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
  const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  const numDefects = Math.floor(Math.random() * 8) + 4; // 4-11个缺陷，增加测试数据
  
  return Array.from({ length: numDefects }, (_, i) => ({
    id: `defect-${Date.now()}-${i}`,
    type: defectTypes[Math.floor(Math.random() * defectTypes.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    x: Math.random() * 80 + 5,  // 5-85范围，避免边缘
    y: Math.random() * 80 + 5,  // 5-85范围，避免边缘
    width: Math.random() * 8 + 3,  // 3-11大小
    height: Math.random() * 8 + 3, // 3-11大小
    confidence: Math.random() * 0.25 + 0.7, // 70-95%置信度
    surface: Math.random() < 0.5 ? 'top' : 'bottom'
  }));
};
