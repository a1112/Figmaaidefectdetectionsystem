import { useState, useEffect } from 'react';
import { env } from '../src/config/env';
import { getDefects } from '../src/api/client';
import type { DefectItem } from '../src/api/types';
import type { Defect, SteelPlate } from '../types/app.types';

/**
 * 缺陷数据管理 Hook
 */
export const useDefects = (selectedPlateId: string | null, steelPlates: SteelPlate[]) => {
  const [plateDefects, setPlateDefects] = useState<Defect[]>([]);
  const [isLoadingDefects, setIsLoadingDefects] = useState(false);

  // 当选中钢板时，加载该钢板的缺陷数据
  useEffect(() => {
    if (!selectedPlateId) {
      setPlateDefects([]);
      return;
    }

    const loadPlateDefects = async () => {
      setIsLoadingDefects(true);
      
      try {
        // 从 plateId 中提取 seq_no（去除前导零）
        const selectedPlate = steelPlates.find(p => p.plateId === selectedPlateId);
        if (!selectedPlate) {
          console.warn('未找到选中的钢板:', selectedPlateId);
          setPlateDefects([]);
          return;
        }

        const seqNo = parseInt(selectedPlate.serialNumber, 10);
        console.log(`🔍 加载钢板 ${selectedPlateId} (seq_no: ${seqNo}) 的缺陷数据...`);
        
        const defectItems: DefectItem[] = await getDefects(seqNo);
        
        // 将 DefectItem 转换为 Defect 格式
        const mapped: Defect[] = defectItems.map(item => ({
          id: item.id,
          type: item.type,
          severity: item.severity,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          confidence: item.confidence,
          surface: item.surface,
          imageIndex: item.imageIndex,
        }));
        
        setPlateDefects(mapped);
        console.log(`✅ 成功加载 ${mapped.length} 个缺陷 (${env.getMode()} 模式)`);
      } catch (error) {
        console.error('❌ 加载缺陷数据失败:', error);
        setPlateDefects([]);
      } finally {
        setIsLoadingDefects(false);
      }
    };

    loadPlateDefects();
  }, [selectedPlateId, steelPlates]);

  return {
    plateDefects,
    isLoadingDefects
  };
};
