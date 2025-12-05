import { DetectionResult } from '../DetectionResult';
import { Database } from 'lucide-react';
import type { DetectionRecord, Defect, SteelPlate, SurfaceFilter } from '../../types/app.types';

interface ImagesPageProps {
  currentImage: string | null;
  isDetecting: boolean;
  detectionResult: DetectionRecord | null;
  history: DetectionRecord[];
  selectedPlateId: string | null;
  surfaceFilter: SurfaceFilter;
  selectedDefectTypes: string[];
}

export const ImagesPage: React.FC<ImagesPageProps> = ({
  currentImage,
  isDetecting,
  detectionResult,
  history,
  selectedPlateId,
  surfaceFilter,
  selectedDefectTypes,
}) => {
  const recordForSelectedPlate = selectedPlateId
    ? history.find(h => h.id.includes(selectedPlateId))
    : null;

  const activeRecord = currentImage
    ? null
    : recordForSelectedPlate || (history.length > 0 ? history[0] : null);

  const defectsForRecord: Defect[] =
    activeRecord?.defects.filter(
      d =>
        (surfaceFilter === 'all' || d.surface === surfaceFilter) &&
        selectedDefectTypes.includes(d.type),
    ) || [];

  return (
    <div className="h-full flex flex-col bg-card border border-border">
      <div className="flex-1 relative min-h-0 bg-black/40">
        {currentImage ? (
          <DetectionResult
            imageUrl={currentImage}
            defects={[]}
            isDetecting={isDetecting}
          />
        ) : activeRecord ? (
          <DetectionResult
            imageUrl={activeRecord.fullImageUrl}
            defects={defectsForRecord}
            isDetecting={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Database className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm mb-2">暂无图像数据</p>
            <p className="text-xs opacity-70">请上传图像或选择左侧的钢板记录</p>
          </div>
        )}
      </div>
    </div>
  );
};

