import { useMemo } from "react";
import type { MouseEvent } from "react";
import type { Defect, ImageOrientation } from "../types/app.types";
import type { SurfaceImageInfo, Surface } from "../api/types";
import type { ViewportInfo } from "./DefectImageView";

interface DefectDistributionChartProps {
  defects: Defect[];
  surface: "all" | "top" | "bottom";
  defectColors?: {
    [key: string]: { bg: string; border: string; text: string };
  };
  surfaceImageInfo?: SurfaceImageInfo[] | null;
  selectedDefectId?: string | null;
  onDefectSelect?: (id: string | null) => void;
  onDefectHover?: (defect: Defect, position: { screenX: number; screenY: number }) => void;
  onDefectHoverEnd?: () => void;
  seqNo?: number;
  defaultTileSize?: number;
  maxTileLevel?: number;
  viewportInfo?: ViewportInfo | null;
  viewportSurface?: Surface | null;
  imageOrientation?: ImageOrientation;
  showDistributionImages?: boolean;
  showTileBorders?: boolean;
  onViewportCenterChange?: (center: { x: number; y: number } | null) => void;
}

const MAX_DEFECTS_TO_DRAW = 1000;

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

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function DefectDistributionChart({
  defects,
  surface,
  defectColors,
  surfaceImageInfo,
  selectedDefectId,
  onDefectSelect,
  onDefectHover,
  onDefectHoverEnd,
  viewportInfo,
  viewportSurface,
  imageOrientation,
  showDistributionImages = true,
  showTileBorders = false,
  onViewportCenterChange,
}: DefectDistributionChartProps) {
  const getDefectBorderColor = (type: string) => {
    if (defectColors && defectColors[type] && typeof defectColors[type].border === "string") {
      const colorMatch = defectColors[type].border.match(/border-(\w+)-(\d+)/);
      if (colorMatch) {
        return `border-${colorMatch[1]}-${colorMatch[2]}`;
      }
    }
    return "border-primary";
  };

  const getSeverityRing = (severity: Defect["severity"]) => {
    switch (severity) {
      case "high":
        return "ring-red-400/50";
      case "medium":
        return "ring-amber-400/50";
      default:
        return "ring-emerald-400/40";
    }
  };

  const findMetaForSurface = (surf: "top" | "bottom") =>
    surfaceImageInfo?.find((info) => info.surface === surf);

  const hasMeta =
    !!surfaceImageInfo &&
    surfaceImageInfo.length > 0 &&
    defects.some((d) => typeof d.imageIndex === "number");

  const showSampleData = defects.length === 0 && !hasMeta;

  const displayDefects = useMemo(
    () => (showSampleData ? SAMPLE_DEFECTS : defects),
    [showSampleData, defects],
  );

  const filteredDefects = useMemo(
    () =>
      displayDefects.filter(
        (d) => surface === "all" || d.surface === surface,
      ),
    [displayDefects, surface],
  );

  const visibleDefects = useMemo(() => {
    if (filteredDefects.length <= MAX_DEFECTS_TO_DRAW) {
      return filteredDefects;
    }
    return filteredDefects.slice(0, MAX_DEFECTS_TO_DRAW);
  }, [filteredDefects]);

  const computeVerticalRect = (
    defect: Defect,
    meta: SurfaceImageInfo | undefined,
  ) => {
    if (!meta || typeof defect.imageIndex !== "number") {
      const x = clamp01(defect.x / 400);
      const y = clamp01(defect.y / 300);
      const w = Math.max(0.01, clamp01(defect.width / 400));
      const h = Math.max(0.01, clamp01(defect.height / 300));
      return { x, y, w, h };
    }

    const frameCount = meta.frame_count || 1;
    const imageWidth = meta.image_width || 1;
    const imageHeight = meta.image_height || 1;
    const rawIndex = typeof defect.imageIndex === "number" ? defect.imageIndex : 0;
    const frameIndex = Math.min(Math.max(rawIndex, 0), frameCount - 1);
    const totalLength = frameCount * imageHeight;

    const y1Global = frameIndex * imageHeight + defect.y;
    const y2Global = frameIndex * imageHeight + defect.y + defect.height;
    const x1 = defect.x;
    const x2 = defect.x + defect.width;

    let lengthStart = totalLength > 0 ? y1Global / totalLength : 0;
    let lengthEnd = totalLength > 0 ? y2Global / totalLength : 0;
    lengthStart = clamp01(lengthStart);
    lengthEnd = clamp01(lengthEnd);
    if (lengthEnd < lengthStart) {
      const temp = lengthStart;
      lengthStart = lengthEnd;
      lengthEnd = temp;
    }

    let widthStart = imageWidth > 0 ? x1 / imageWidth : 0;
    let widthEnd = imageWidth > 0 ? x2 / imageWidth : 0;
    widthStart = clamp01(widthStart);
    widthEnd = clamp01(widthEnd);
    if (widthEnd < widthStart) {
      const temp = widthStart;
      widthStart = widthEnd;
      widthEnd = temp;
    }

    const x = widthStart;
    const y = lengthStart;
    const w = Math.max(0.002, widthEnd - widthStart);
    const h = Math.max(0.002, lengthEnd - lengthStart);

    return { x, y, w, h };
  };

  const computeViewportRect = (
    meta: SurfaceImageInfo | undefined,
    surf: Surface,
  ) => {
    if (!meta || !viewportInfo || !viewportSurface || viewportSurface !== surf) {
      return null;
    }

    const mosaicWidth = meta.image_width ?? 0;
    const mosaicHeight = (meta.frame_count ?? 0) * (meta.image_height ?? 0);
    if (mosaicWidth <= 0 || mosaicHeight <= 0) {
      return null;
    }

    const mosaicRect =
      imageOrientation === "horizontal"
        ? {
            x: viewportInfo.y,
            y: viewportInfo.x,
            width: viewportInfo.height,
            height: viewportInfo.width,
          }
        : {
            x: viewportInfo.x,
            y: viewportInfo.y,
            width: viewportInfo.width,
            height: viewportInfo.height,
          };

    const lengthStart = clamp01(mosaicRect.y / mosaicHeight);
    const lengthEnd = clamp01((mosaicRect.y + mosaicRect.height) / mosaicHeight);
    const widthStart = clamp01(mosaicRect.x / mosaicWidth);
    const widthEnd = clamp01((mosaicRect.x + mosaicRect.width) / mosaicWidth);

    const x = Math.min(widthStart, widthEnd);
    const y = Math.min(lengthStart, lengthEnd);
    const w = Math.max(0.002, Math.abs(widthEnd - widthStart));
    const h = Math.max(0.002, Math.abs(lengthEnd - lengthStart));

    return { x, y, w, h };
  };

  const handlePanelClick = (
    event: MouseEvent<HTMLDivElement>,
    meta: SurfaceImageInfo | undefined,
  ) => {
    if (!meta || !onViewportCenterChange) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const relX = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
    const relY = clamp01((event.clientY - rect.top) / Math.max(1, rect.height));

    const mosaicWidth = meta.image_width ?? 0;
    const mosaicHeight = (meta.frame_count ?? 0) * (meta.image_height ?? 0);
    if (mosaicWidth <= 0 || mosaicHeight <= 0) {
      return;
    }

    const mosaicX = relX * mosaicWidth;
    const mosaicY = relY * mosaicHeight;

    const imageWorldWidth =
      imageOrientation === "horizontal" ? mosaicHeight : mosaicWidth;
    const imageWorldHeight =
      imageOrientation === "horizontal" ? mosaicWidth : mosaicHeight;

    let centerX = imageOrientation === "horizontal" ? mosaicY : mosaicX;
    let centerY = imageOrientation === "horizontal" ? mosaicX : mosaicY;

    if (viewportInfo) {
      const halfW = viewportInfo.width / 2;
      const halfH = viewportInfo.height / 2;
      if (halfW * 2 <= imageWorldWidth) {
        centerX = Math.min(imageWorldWidth - halfW, Math.max(halfW, centerX));
      } else {
        centerX = imageWorldWidth / 2;
      }
      if (halfH * 2 <= imageWorldHeight) {
        centerY = Math.min(imageWorldHeight - halfH, Math.max(halfH, centerY));
      } else {
        centerY = imageWorldHeight / 2;
      }
    } else {
      centerX = Math.min(imageWorldWidth, Math.max(0, centerX));
      centerY = Math.min(imageWorldHeight, Math.max(0, centerY));
    }

    onViewportCenterChange({ x: centerX, y: centerY });
  };

  const renderPanel = (surf: "top" | "bottom") => {
    const meta = findMetaForSurface(surf);
    const frameCount = meta?.frame_count || 1;
    const panelDefects = visibleDefects.filter((item) => item.surface === surf);
    const isFiltered = surface !== "all" && surface !== surf;
    const viewportRect = computeViewportRect(meta, surf);

    return (
      <div
        key={surf}
        className={`flex flex-col rounded-lg border border-border bg-gradient-to-b from-slate-950/50 via-slate-900/40 to-slate-800/20 ${
          isFiltered ? "opacity-40" : "opacity-100"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${surf === "top" ? "bg-sky-400" : "bg-amber-400"}`} />
            <span className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
              {surf === "top" ? "TOP" : "BOTTOM"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{panelDefects.length} 缺陷</span>
            <span className="text-muted-foreground/60">{frameCount} 帧</span>
          </div>
        </div>

        <div
          className={`relative flex-1 min-h-[190px] overflow-hidden ${
            showDistributionImages
              ? "bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.15),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(251,191,36,0.18),transparent_60%)]"
              : "bg-muted/20"
          }`}
          onMouseLeave={() => onDefectHoverEnd?.()}
          onClick={(event) => {
            if (!isFiltered) {
              handlePanelClick(event, meta);
            }
          }}
        >
          {showTileBorders && (
            <div className="absolute inset-0 border border-dashed border-primary/40 pointer-events-none" />
          )}

          {Array.from({ length: frameCount + 1 }).map((_, index) => {
            const position = (index / frameCount) * 100;
            return (
              <div
                key={`frame-${surf}-${index}`}
                className="absolute left-0 right-0 border-t border-white/10"
                style={{ top: `${position}%` }}
              />
            );
          })}

          {viewportRect && (
            <div
              className="absolute border-2 border-sky-400/80 bg-sky-500/10 pointer-events-none"
              style={{
                left: `${viewportRect.x * 100}%`,
                top: `${viewportRect.y * 100}%`,
                width: `${viewportRect.w * 100}%`,
                height: `${viewportRect.h * 100}%`,
              }}
            />
          )}

          {panelDefects.map((defect) => {
            const { x, y, w, h } = computeVerticalRect(defect, meta);
            const isSelected = selectedDefectId === defect.id;
            return (
              <div
                key={defect.id}
                onClick={(event) => {
                  event.stopPropagation();
                  if (isFiltered) {
                    return;
                  }
                  onDefectSelect?.(defect.id);
                }}
                onMouseEnter={(event) =>
                  onDefectHover?.(defect, { screenX: event.clientX, screenY: event.clientY })
                }
                onMouseMove={(event) =>
                  onDefectHover?.(defect, { screenX: event.clientX, screenY: event.clientY })
                }
                onMouseLeave={() => onDefectHoverEnd?.()}
                className={`absolute border ${getDefectBorderColor(defect.type)} ${getSeverityRing(defect.severity)} ${
                  isSelected ? "ring-2" : "ring-1"
                } cursor-pointer transition-transform duration-150 ${showSampleData ? "opacity-60" : "opacity-80"}`}
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  width: `${w * 100}%`,
                  height: `${h * 100}%`,
                  minWidth: "3px",
                  minHeight: "3px",
                }}
              />
            );
          })}

          {isFiltered && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/70">
              已过滤
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full px-2 py-2">
      <div className="grid grid-cols-2 gap-2 h-full">
        {renderPanel("top")}
        {renderPanel("bottom")}
      </div>
    </div>
  );
}
