import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { env } from '../src/config/env';
import type { SteelPlate, Defect } from '../types/app.types';
import type { SurfaceImageInfo, Surface } from '../src/api/types';
import { getTileImageUrl } from '../src/api/client';

interface DefectImageViewProps {
  selectedPlate: SteelPlate | undefined;
  defects: Defect[];
  surface: 'all' | 'top' | 'bottom';
  imageViewMode: 'full' | 'single';
  selectedDefectId: string | null;
  onDefectSelect: (id: string | null) => void;
  surfaceImageInfo?: SurfaceImageInfo[] | null;
}

export function DefectImageView({
  selectedPlate,
  defects,
  surface,
  imageViewMode,
  selectedDefectId,
  onDefectSelect,
  surfaceImageInfo,
}: DefectImageViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // 瓦片视图的缩放和拖动状态（仅大图模式使用）
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const actualSurface: Surface = useMemo(
    () => (surface === 'all' ? 'top' : surface) as Surface,
    [surface],
  );

  const surfaceMeta: SurfaceImageInfo | undefined = useMemo(
    () => surfaceImageInfo?.find(info => info.surface === actualSurface),
    [surfaceImageInfo, actualSurface],
  );

  const seqNo = useMemo(
    () => (selectedPlate ? parseInt(selectedPlate.serialNumber, 10) : null),
    [selectedPlate],
  );

  const chooseTileLevel = (worldHeight: number, targetDisplayHeight: number): number => {
    if (worldHeight <= 0 || targetDisplayHeight <= 0) {
      return 0;
    }
    const ratio = worldHeight / (targetDisplayHeight * 4);
    const raw = Math.log2(Math.max(1, ratio));
    const level = Math.ceil(raw);
    return Math.min(8, Math.max(0, level));
  };

  // 获取当前选中的缺陷
  const selectedDefect = selectedDefectId ? defects.find(d => d.id === selectedDefectId) : null;
  
  // 当显示单缺陷模式时，如果没有选中，自动选中第一个
  useEffect(() => {
    if (imageViewMode === 'single' && !selectedDefectId && defects.length > 0) {
      onDefectSelect(defects[0].id);
    }
  }, [imageViewMode, selectedDefectId, defects, onDefectSelect]);

  // 加载图像（单缺陷模式仍然用裁剪接口；大图模式在生产环境下优先使用瓦片视图）
  useEffect(() => {
    if (!selectedPlate) {
      setImageUrl(null);
      return;
    }

    // 如果是大图模式但还没有任何缺陷（不知道有效的 imageIndex），先不要请求 image_index=0，避免 404
    if (imageViewMode === 'full' && defects.length === 0) {
      setImageUrl(null);
      return;
    }

    const loadImage = async () => {
      setIsLoadingImage(true);
      setImageError(null);

      try {
        const baseUrl = env.getApiBaseUrl();

        // 单缺陷模式：使用缺陷裁剪接口
        if (imageViewMode === 'single' && selectedDefect) {
          const url = `${baseUrl}/images/defect/${selectedDefect.id}?surface=${selectedDefect.surface}`;
          console.log(`🖼️ 加载单缺陷图像: ${url}`);
          setImageUrl(url);
          return;
        }

        // 大图模式：如果有 surfaceMeta 和 seqNo，则使用瓦片视图，不再单独加载整帧
        if (imageViewMode === 'full' && surfaceMeta && seqNo != null) {
          // 瓦片由下方 JSX 动态加载，这里只需清空单帧 URL
          setImageUrl(null);
          setImageError(null);
          return;
        }

        // 回退：没有元数据时仍使用单帧图像接口
        if (imageViewMode === 'full') {
          const firstWithIndex = defects.find(d => typeof d.imageIndex === 'number');
          if (!firstWithIndex || typeof firstWithIndex.imageIndex !== 'number') {
            setImageUrl(null);
            return;
          }
          const imageIndex = firstWithIndex.imageIndex;
          const url = `${baseUrl}/images/frame?surface=${actualSurface}&seq_no=${seqNo}&image_index=${imageIndex}`;
          console.log(`🖼️ 加载回退大图帧: ${url}`);
          setImageUrl(url);
        }
      } catch (error) {
        console.error('❌ 加载图像失败:', error);
        setImageError(error instanceof Error ? error.message : '加载失败');
      } finally {
        setIsLoadingImage(false);
      }
    };

    loadImage();
  }, [selectedPlate, imageViewMode, selectedDefect, defects, actualSurface, surfaceMeta, seqNo]);

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

  return (
    <div className="relative w-full h-full">
      {imageViewMode === 'full' ? (
        // 大图模式：使用瓦片视图 + 简单缩放/拖动，类似地图
        <div
          className="relative w-full h-full overflow-hidden bg-black"
          onWheel={event => {
            event.preventDefault();
            const delta = event.deltaY < 0 ? 0.1 : -0.1;
            setZoom(prev => {
              const next = Math.min(4, Math.max(0.5, prev + delta));
              return Number(next.toFixed(2));
            });
          }}
          onMouseDown={event => {
            isPanningRef.current = true;
            lastPosRef.current = { x: event.clientX, y: event.clientY };
          }}
          onMouseMove={event => {
            if (!isPanningRef.current || !lastPosRef.current) return;
            const dx = event.clientX - lastPosRef.current.x;
            const dy = event.clientY - lastPosRef.current.y;
            lastPosRef.current = { x: event.clientX, y: event.clientY };
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          }}
          onMouseUp={() => {
            isPanningRef.current = false;
            lastPosRef.current = null;
          }}
          onMouseLeave={() => {
            isPanningRef.current = false;
            lastPosRef.current = null;
          }}
        >
          {surfaceMeta && seqNo != null ? (
            (() => {
              const worldWidth = surfaceMeta.image_width;
              const worldHeight = surfaceMeta.frame_count * surfaceMeta.image_height;
              const baseLevel = chooseTileLevel(worldHeight, 600);
              const level = baseLevel;
              const tileSize = 512;
              const scaledWidth = worldWidth / (2 ** level);
              const scaledHeight = worldHeight / (2 ** level);
              const tilesX = Math.max(1, Math.ceil(scaledWidth / tileSize));
              const tilesY = Math.max(1, Math.ceil(scaledHeight / tileSize));

              const containerStyle: React.CSSProperties = {
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: scaledWidth,
                height: scaledHeight,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              };

              const tiles: JSX.Element[] = [];
              for (let tileY = 0; tileY < tilesY; tileY += 1) {
                for (let tileX = 0; tileX < tilesX; tileX += 1) {
                  const url = getTileImageUrl({
                    surface: actualSurface,
                    seqNo,
                    level,
                    tileX,
                    tileY,
                    tileSize,
                  });

                  const left = tileX * tileSize;
                  const top = tileY * tileSize;
                  const width = tileSize;
                  const height = tileSize;

                  tiles.push(
                    <img
                      key={`tile-${tileX}-${tileY}`}
                      src={url}
                      alt="mosaic-tile"
                      className="absolute"
                      style={{
                        left,
                        top,
                        width,
                        height,
                        objectFit: 'fill',
                      }}
                    />,
                  );
                }
              }

              return (
                <div style={containerStyle}>
                  {tiles}
                </div>
              );
            })()
          ) : imageUrl ? (
            // 回退：仍然显示单帧大图
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={imageUrl}
                alt="钢板缺陷图像"
                className="max-w-full max-h-full object-contain"
                onError={() => setImageError('图像加载失败')}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground h-full">
              <AlertCircle className="w-16 h-16 opacity-50" />
              <p className="text-sm">无可用大图</p>
            </div>
          )}
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
