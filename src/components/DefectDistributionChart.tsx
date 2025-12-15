import React, { useMemo, useRef, useEffect, useState } from "react";
import type { Defect } from "../types/app.types";
import type {
  SurfaceImageInfo,
  Surface,
} from "../src/api/types";
import { getTileImageUrl } from "../src/api/client";

interface DefectDistributionChartProps {
  defects: Defect[];
  surface: "all" | "top" | "bottom";
  defectColors?: {
    [key: string]: { bg: string; border: string; text: string };
  };
  surfaceImageInfo?: SurfaceImageInfo[] | null;
  selectedDefectId?: string | null;
  onDefectSelect?: (id: string | null) => void;
  seqNo?: number;
  defaultTileSize?: number;
}

const MAX_DEFECTS_TO_DRAW = 1000;

// 模拟示例数据（用于没有真实数据时的占位展示）
const SAMPLE_DEFECTS: Defect[] = [
  {
    id: "sample-1",
    type: "纵向裂纹",
    severity: "high",
    confidence: 0.89,
    x: 120,
    y: 80,
    width: 25,
    height: 45,
    surface: "top",
  },
  {
    id: "sample-2",
    type: "划伤",
    severity: "medium",
    confidence: 0.76,
    x: 220,
    y: 160,
    width: 35,
    height: 12,
    surface: "top",
  },
  {
    id: "sample-3",
    type: "辊印",
    severity: "low",
    confidence: 0.82,
    x: 70,
    y: 220,
    width: 18,
    height: 28,
    surface: "bottom",
  },
  {
    id: "sample-4",
    type: "横向裂纹",
    severity: "high",
    confidence: 0.92,
    x: 280,
    y: 100,
    width: 40,
    height: 8,
    surface: "top",
  },
  {
    id: "sample-5",
    type: "孔洞",
    severity: "medium",
    confidence: 0.85,
    x: 150,
    y: 190,
    width: 15,
    height: 15,
    surface: "bottom",
  },
];

export function DefectDistributionChart({
  defects,
  surface,
  defectColors,
  surfaceImageInfo,
  selectedDefectId,
  onDefectSelect,
  seqNo,
  defaultTileSize,
}: DefectDistributionChartProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-muted-foreground";
    }
  };

  const getDefectBorderColor = (type: string) => {
    if (defectColors && defectColors[type]) {
      // 从Tailwind类名中提取颜色
      const colorMatch = defectColors[type].border.match(
        /border-(\w+)-(\d+)/,
      );
      if (colorMatch) {
        return `border-${colorMatch[1]}-${colorMatch[2]}`;
      }
    }
    return "border-primary";
  };

  const getDefectTextColor = (type: string) => {
    if (defectColors && defectColors[type]) {
      return defectColors[type].text;
    }
    return "text-primary";
  };

  // 钢板缩略显示尺寸
  // 横向布局：宽度 = 高度 × 单图比例 × 图像数量
  const plateHeight = 120; // 固定高度

  const chooseTileLevel = (
    worldHeight: number,
    targetDisplayHeight: number,
  ): number => {
    if (worldHeight <= 0 || targetDisplayHeight <= 0) {
      return 0;
    }
    const ratio = worldHeight / (targetDisplayHeight * 4);
    const raw = Math.log2(Math.max(1, ratio));
    const level = Math.ceil(raw);
    return Math.min(8, Math.max(0, level));
  };

  const hasMeta =
    !!surfaceImageInfo &&
    surfaceImageInfo.length > 0 &&
    defects.some((d) => typeof d.imageIndex === "number");

  // 开发/无真实数据时才使用示例数据：存在 surfaceImageInfo 说明是后端真实数据场景
  const showSampleData = defects.length === 0 && !hasMeta;

  // Use useMemo to prevent creating new array reference on every render
  const displayDefects = useMemo(() => 
    showSampleData ? SAMPLE_DEFECTS : defects,
    [showSampleData, defects]
  );
  
  // Use useMemo to prevent filteredDefects from creating new array reference on every render
  const filteredDefects = useMemo(() => 
    displayDefects.filter(
      (d) => surface === "all" || d.surface === surface,
    ),
    [displayDefects, surface]
  );

  // 在缺陷数过多时限制绘制数量，避免阻塞渲染。
  const visibleDefects = useMemo(() => {
    if (filteredDefects.length <= MAX_DEFECTS_TO_DRAW) {
      return filteredDefects;
    }
    // 仅在超过上限时启用：简单取前 MAX_DEFECTS_TO_DRAW 个，
    // 后续如需按视图窗口动态裁剪，可在这里加入视图相关逻辑。
    return filteredDefects.slice(0, MAX_DEFECTS_TO_DRAW);
  }, [filteredDefects]);

  const findMetaForSurface = (
    surf: "top" | "bottom",
  ): SurfaceImageInfo | undefined =>
    surfaceImageInfo?.find((info) => info.surface === surf);
  
  // 容器引用，用于获取宽度
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // 监听容器宽度变化
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // 计算横向布局的宽度
  const calculatePlateWidth = (meta: SurfaceImageInfo | undefined): number => {
    if (!meta) return 360; // 默认宽度
    const frameCount = meta.frame_count || 1;
    const imageWidth = meta.image_width || 1;
    const imageHeight = meta.image_height || 1;
    
    // 正确的映射关系：
    // 原图：宽度 imageWidth × 总长度 (imageHeight × frameCount)
    // 显示旋转90度：原图宽度 → 显示高度，原图长度 → 显示宽度
    // plateHeight / plateWidth = imageWidth / (imageHeight × frameCount)
    // plateWidth = plateHeight × (imageHeight × frameCount) / imageWidth
    const totalLength = imageHeight * frameCount;
    return plateHeight * totalLength / imageWidth;
  };

  // 计算最终显示高度和宽度（包括拉伸逻辑）
  const calculateFinalDimensions = useMemo(() => {
    const topMeta = findMetaForSurface("top");
    const bottomMeta = findMetaForSurface("bottom");
    
    const topWidth = calculatePlateWidth(topMeta);
    const bottomWidth = calculatePlateWidth(bottomMeta);
    
    // 默认总高度为 plateHeight * 2（适配双表面显示）
    let finalHeight = plateHeight * 2;
    let finalTopWidth = topWidth;
    let finalBottomWidth = bottomWidth;
    let scale = 1; // 统一的缩放比例
    
    // 注意：surface === "all" 时显示两个表面，每个占 finalHeight/2
    // surface !== "all" 时显示单个表面，占 finalHeight 全部
    // 因此两种情况下 finalHeight 都应该是 plateHeight * 2
    
    // 如果宽度不足容器宽度的75%，进行拉伸
    if (containerWidth > 0) {
      const targetWidth = containerWidth * 0.75;
      
      if (surface === "all") {
        // 两个表面都显示：使用较长的那个来计算统一缩放比例
        const maxWidth = Math.max(topWidth, bottomWidth);
        if (maxWidth < targetWidth) {
          scale = targetWidth / maxWidth;
          // 两个表面都应用相同的缩放比例
          finalTopWidth = topWidth * scale;
          finalBottomWidth = bottomWidth * scale;
        }
      } else {
        // 单表面显示：只拉伸当前表面
        const currentWidth = surface === "top" ? topWidth : bottomWidth;
        if (currentWidth < targetWidth) {
          scale = targetWidth / currentWidth;
          if (surface === "top") {
            finalTopWidth = topWidth * scale;
          } else {
            finalBottomWidth = bottomWidth * scale;
          }
        }
      }
    }
    
    return {
      height: finalHeight,
      topWidth: finalTopWidth,
      bottomWidth: finalBottomWidth,
      scale, // 统一的缩放比例
    };
  }, [surface, containerWidth, surfaceImageInfo]);

  const computeDisplayRect = (
    defect: Defect,
    meta: SurfaceImageInfo | undefined,
    perSurfaceHeight: number,
    plateWidth: number,
  ) => {
    if (!meta || typeof defect.imageIndex !== "number") {
      // 无元数据时退回到“单帧 400x300” 的近似映射
      const displayX = (defect.x / 400) * plateWidth;
      const displayY = (defect.y / 300) * perSurfaceHeight;
      const displayWidth = (defect.width / 400) * plateWidth;
      const displayHeight =
        (defect.height / 300) * perSurfaceHeight;
      return {
        x: displayX,
        y: displayY,
        w: displayWidth,
        h: displayHeight,
      };
    }

    const frameCount = meta.frame_count || 1;
    const imageWidth = meta.image_width || 1;
    const imageHeight = meta.image_height || 1;

    // 数据库存储：沿长度方向按帧逐个向“下”堆叠
    const rawIndex =
      typeof defect.imageIndex === "number"
        ? defect.imageIndex
        : 0;
    // 防止索引越界（兼容 0/1-based）
    const frameIndex = Math.min(
      Math.max(rawIndex, 0),
      frameCount - 1,
    );

    const totalLength = frameCount * imageHeight;

    // 这里使用“帧索引 + 单帧内坐标”来近似 topInSrcImg / bottomInSrcImg
    const y1Global = frameIndex * imageHeight + defect.y;
    const y2Global =
      frameIndex * imageHeight + defect.y + defect.height;

    const x1 = defect.x;
    const x2 = defect.x + defect.width;

    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    // 长度方向：0~1 映射到钢板缩略图宽度，从左往右
    let lengthStart =
      totalLength > 0 ? y1Global / totalLength : 0;
    let lengthEnd =
      totalLength > 0 ? y2Global / totalLength : 0;
    lengthStart = clamp01(lengthStart);
    lengthEnd = clamp01(lengthEnd);
    if (lengthEnd < lengthStart) {
      const tmp = lengthStart;
      lengthStart = lengthEnd;
      lengthEnd = tmp;
    }

    // 宽度方向：0~1 映射到钢板缩略图高度，从下往上（0 点在左下角）
    let widthStart = imageWidth > 0 ? x1 / imageWidth : 0;
    let widthEnd = imageWidth > 0 ? x2 / imageWidth : 0;
    widthStart = clamp01(widthStart);
    widthEnd = clamp01(widthEnd);
    if (widthEnd < widthStart) {
      const tmp = widthStart;
      widthStart = widthEnd;
      widthEnd = tmp;
    }

    const lengthWidth = Math.max(
      lengthEnd - lengthStart,
      0.002,
    );
    const widthHeight = Math.max(widthEnd - widthStart, 0.002);

    const displayX = lengthStart * plateWidth;
    const displayWidth = lengthWidth * plateWidth;
    // 0 点在左下角：把 0 映射到 bottom
    const displayY = (1 - widthEnd) * perSurfaceHeight;
    const displayHeight = widthHeight * perSurfaceHeight;

    return {
      x: displayX,
      y: displayY,
      w: displayWidth,
      h: displayHeight,
    };
  };

  const renderPlate = (
    surf: Surface,
    containerHeight: number,
  ) => {
    const perSurfaceHeight = containerHeight;
    const title =
      surf === "top"
        ? "TOP SURFACE"
        : surf === "bottom"
          ? "BOTTOM SURFACE"
          : "SURFACE";
    const meta = findMetaForSurface(surf);
    const plateDefects = visibleDefects.filter(
      (d) => d.surface === surf,
    );
    
    // 使用计算后的宽度（包括拉伸）
    const plateWidth = surf === "top" 
      ? calculateFinalDimensions.topWidth 
      : calculateFinalDimensions.bottomWidth;
    const frameCount = meta?.frame_count || 1;

    const tileImages: JSX.Element[] = [];

    if (
      meta &&
      typeof (seqNo as number | undefined) === "number"
    ) {
      const worldWidth = meta.image_width;
      const worldHeight = meta.frame_count * meta.image_height;
      const level = chooseTileLevel(
        worldHeight,
        perSurfaceHeight,
      );
      const scaledWidth = worldWidth / 2 ** level;
      const scaledHeight = worldHeight / 2 ** level;
      const tileSize = Math.max(
        defaultTileSize ?? 0,
        meta.image_height ?? 0,
        512,
      );
      const tilesX = Math.max(
        1,
        Math.ceil(scaledWidth / tileSize),
      );
      const tilesY = Math.max(
        1,
        Math.ceil(scaledHeight / tileSize),
      );

      const scaleX = plateWidth / scaledWidth;
      const scaleY = perSurfaceHeight / scaledHeight;

      for (let tileY = 0; tileY < tilesY; tileY += 1) {
        for (let tileX = 0; tileX < tilesX; tileX += 1) {
          const url = getTileImageUrl({
            surface: surf,
            seqNo: seqNo as number,
            level,
            tileX,
            tileY,
            tileSize,
          });

          const left = tileX * tileSize * scaleX;
          const top = tileY * tileSize * scaleY;
          const width = tileSize * scaleX;
          const height = tileSize * scaleY;

          tileImages.push(
            <img
              key={`tile-${surf}-${tileX}-${tileY}`}
              src={url}
              alt="mosaic-tile"
              className="absolute"
              style={{
                left,
                top,
                width,
                height,
                objectFit: "fill",
              }}
            />,
          );
        }
      }
    }

    // 生成刻度尺
    const renderRuler = (position: "top" | "bottom") => (
      <div 
        className="relative w-full h-4 bg-muted/20 border-x-2 border-foreground/60"
        style={{ width: plateWidth }}
      >
        {/* 刻度线和标签 */}
        {Array.from({ length: frameCount + 1 }).map((_, i) => {
          const positionPercent = (i / frameCount) * 100;
          return (
            <div
              key={`ruler-${position}-${surf}-${i}`}
              className="absolute h-full border-l border-muted-foreground/40"
              style={{ left: `${positionPercent}%` }}
            >
              {/* 刻度数字 */}
              <div className={`absolute text-[9px] text-muted-foreground font-mono ${
                position === "top" ? "bottom-0" : "top-0"
              } left-0 transform -translate-x-1/2`}>
                {i}
              </div>
            </div>
          );
        })}
      </div>
    );

    return (
      <div key={surf} className="flex flex-col gap-0">
        {/* 上刻度尺 - 仅在上表面显示 */}
        {surf === "top" && renderRuler("top")}
        
        <div
          className="relative border-2 border-foreground/60 bg-muted/5 overflow-hidden"
          style={{ width: plateWidth, height: perSurfaceHeight }}
        >
          <div className="absolute -top-4 left-0 right-0 text-center text-[10px] text-muted-foreground/50 font-mono">
            {title}
          </div>

          {/* 右上角：图像数量标签 */}
          <div className="absolute -top-4 right-0 text-[10px] text-primary/80 font-mono bg-background/80 px-1.5 py-0.5 rounded">
            {frameCount} frames
          </div>

          {/* 瓦片背景 */}
          {tileImages}

          {/* 帧刻度线（替换原有网格） */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            {Array.from({ length: frameCount + 1 }).map((_, i) => {
              const position = (i / frameCount) * 100;
              return (
                <div
                  key={`frame-${surf}-${i}`}
                  className="absolute h-full border-l border-muted-foreground"
                  style={{ left: `${position}%` }}
                />
              );
            })}
          </div>

          {/* 坐标原点调试点：表示旋转后 (0,0) 期望位置 */}
          <div
            className="absolute w-2 h-2 bg-red-500/60 rounded-full"
            style={{ left: 0, bottom: 0 }}
            title="Origin debug point (0,0)"
          />

          {/* 缺陷矩形 */}
          {plateDefects.map((defect) => {
            const { x, y, w, h } = computeDisplayRect(
              defect,
              hasMeta ? meta : undefined,
              perSurfaceHeight,
              plateWidth,
            );
            const borderColor = getDefectBorderColor(defect.type);
            const isSelected = selectedDefectId === defect.id;

            return (
              <div
                key={defect.id}
                onClick={() => onDefectSelect?.(defect.id)}
                className={`absolute border-2 ${borderColor} ${showSampleData ? "opacity-40" : "opacity-30"} ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-primary/80 ring-offset-background"
                    : ""
                } cursor-pointer`}
                style={{
                  left: x,
                  top: y,
                  width: Math.max(w, 3),
                  height: Math.max(h, 3),
                }}
                title={`${defect.type} - ${defect.severity} (${Math.round(defect.confidence * 100)}%)`}
              />
            );
          })}
        </div>

        {/* 下刻度尺 - 仅在下表面显示 */}
        {surf === "bottom" && renderRuler("bottom")}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col" ref={containerRef}>
      {defects.length === 0 && (
        <div className="text-center text-[10px] text-muted-foreground/50 mb-2 py-1 border-b border-border/30">
          SHOWING SAMPLE DATA
        </div>
      )}

      {/* 横向滚动容器 - 支持横向滚动查看长钢板 */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex flex-col gap-0 h-full">
          {surface === "all" ? (
            <>
              {renderPlate("top", calculateFinalDimensions.height / 2)}
              {renderPlate("bottom", calculateFinalDimensions.height / 2)}
            </>
          ) : (
            renderPlate(
              surface === "top" ? "top" : "bottom",
              calculateFinalDimensions.height,
            )
          )}
        </div>
      </div>
    </div>
  );
}
