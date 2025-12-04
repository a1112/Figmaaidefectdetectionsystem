import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { env } from '../src/config/env';
import type { SteelPlate, Defect } from '../App';

interface DefectImageViewProps {
  selectedPlate: SteelPlate | undefined;
  defects: Defect[];
  surface: 'all' | 'top' | 'bottom';
  imageViewMode: 'full' | 'single';
  selectedDefectId: string | null;
  onDefectSelect: (id: string | null) => void;
}

export function DefectImageView({
  selectedPlate,
  defects,
  surface,
  imageViewMode,
  selectedDefectId,
  onDefectSelect,
}: DefectImageViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // 获取当前选中的缺陷
  const selectedDefect = selectedDefectId ? defects.find(d => d.id === selectedDefectId) : null;
  
  // 当显示单缺陷模式时，如果没有选中，自动选中第一个
  useEffect(() => {
    if (imageViewMode === 'single' && !selectedDefectId && defects.length > 0) {
      onDefectSelect(defects[0].id);
    }
  }, [imageViewMode, selectedDefectId, defects, onDefectSelect]);

  // 加载图像
  useEffect(() => {
    if (!selectedPlate) {
      setImageUrl(null);
      return;
    }

    const loadImage = async () => {
      setIsLoadingImage(true);
      setImageError(null);

      try {
        const baseUrl = env.getApiBaseUrl();
        const seqNo = parseInt(selectedPlate.serialNumber, 10);

        let url: string;
        if (imageViewMode === 'single' && selectedDefect) {
          // 单缺陷模式：使用缺陷裁剪接口
          url = `${baseUrl}/images/defect/${selectedDefect.id}?surface=${selectedDefect.surface}`;
        } else {
          // 大图模式：使用帧图像接口
          const actualSurface = surface === 'all' ? 'top' : surface;
          const imageIndex = defects.length > 0 ? (defects[0].imageIndex || 0) : 0;
          url = `${baseUrl}/images/frame?surface=${actualSurface}&seq_no=${seqNo}&image_index=${imageIndex}`;
        }

        console.log(`🖼️ 加载图像: ${url}`);
        setImageUrl(url);
      } catch (error) {
        console.error('❌ 加载图像失败:', error);
        setImageError(error instanceof Error ? error.message : '加载失败');
      } finally {
        setIsLoadingImage(false);
      }
    };

    loadImage();
  }, [selectedPlate, imageViewMode, selectedDefect, surface, defects]);

  if (isLoadingImage) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm">加载图像中...</p>
      </div>
    );
  }

  if (imageError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-destructive">
        <AlertCircle className="w-16 h-16 opacity-50" />
        <p className="text-sm">图像加载失败: {imageError}</p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="w-16 h-16 opacity-50" />
        <p className="text-sm">无可用图像</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {imageViewMode === 'full' ? (
        // 大图模式：显示完整图像并绘制缺陷框
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt="钢板缺陷图像"
            className="max-w-full max-h-full object-contain"
            onError={() => setImageError('图像加载失败')}
          />
          {/* TODO: 在图像上绘制缺陷框 */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ mixBlendMode: 'difference' }}
          >
            {defects.map((defect) => (
              <g key={defect.id}>
                <rect
                  x={`${defect.x}%`}
                  y={`${defect.y}%`}
                  width={`${defect.width}%`}
                  height={`${defect.height}%`}
                  fill="none"
                  stroke={
                    defect.severity === 'high' ? '#ef4444' :
                    defect.severity === 'medium' ? '#f59e0b' :
                    '#22c55e'
                  }
                  strokeWidth="2"
                  className={selectedDefectId === defect.id ? 'opacity-100' : 'opacity-60'}
                />
                <text
                  x={`${defect.x}%`}
                  y={`${defect.y - 1}%`}
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {defect.type}
                </text>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        // 单缺陷模式：显示裁剪后的缺陷图像
        <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 p-4">
          <img
            src={imageUrl}
            alt={`缺陷: ${selectedDefect?.type}`}
            className="max-w-full max-h-full object-contain border-2 border-primary/50 rounded"
            onError={() => setImageError('图像加载失败')}
          />
          {selectedDefect && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded border border-border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{selectedDefect.type}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedDefect.severity === 'high' ? 'bg-red-500 text-white' :
                      selectedDefect.severity === 'medium' ? 'bg-yellow-500 text-black' :
                      'bg-green-500 text-white'
                    }`}>
                      {selectedDefect.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    位置: ({selectedDefect.x.toFixed(1)}, {selectedDefect.y.toFixed(1)}) | 
                    尺寸: {selectedDefect.width.toFixed(1)} × {selectedDefect.height.toFixed(1)} | 
                    置信度: {(selectedDefect.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
