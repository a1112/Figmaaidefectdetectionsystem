import { useMemo } from "react";
import { getDefectImageUrl } from "../api/client";
import type { Surface } from "../api/types";

interface HoverDefectInfo {
  id: string;
  type: string;
  surface: Surface;
  imageIndex?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  xMm?: number;
  yMm?: number;
}

interface DefectHoverTooltipProps {
  defect: HoverDefectInfo;
  screenX: number;
  screenY: number;
  offset?: number;
  plateSize?: { width: number; length: number };
}

export function DefectHoverTooltip({
  defect,
  screenX,
  screenY,
  offset = 4,
  plateSize,
}: DefectHoverTooltipProps) {
  const imageUrl = useMemo(
    () =>
      getDefectImageUrl({
        defectId: defect.id,
        surface: defect.surface,
      }),
    [defect.id, defect.surface],
  );

  const tooltipStyle = useMemo(() => {
    const maxWidth = 220;
    const maxHeight = 180;
    let left = screenX + offset;
    let top = screenY + offset;
    if (typeof window !== "undefined") {
      const maxLeft = Math.max(0, window.innerWidth - maxWidth - 12);
      const maxTop = Math.max(0, window.innerHeight - maxHeight - 12);
      left = Math.min(left, maxLeft);
      top = Math.min(top, maxTop);
    }
    return { left, top };
  }, [screenX, screenY, offset]);

  const displayX = Math.round(defect.xMm ?? defect.x);
  const displayY = Math.round(defect.yMm ?? defect.y);
  const defectWidth = defect.width ?? 0;
  const defectHeight = defect.height ?? 0;
  const distLeft = displayX;
  const distHead = displayY;
  const distRight =
    plateSize && plateSize.width > 0
      ? Math.max(0, plateSize.width - (displayX + defectWidth))
      : null;
  const distTail =
    plateSize && plateSize.length > 0
      ? Math.max(0, plateSize.length - (displayY + defectHeight))
      : null;

  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ left: tooltipStyle.left, top: tooltipStyle.top }}
    >
      <div className="w-[220px] bg-black/85 border border-[#30363d] rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-sm overflow-hidden">
        <div className="h-[120px] bg-[#0d1117] flex items-center justify-center overflow-hidden">
          <img
            src={imageUrl}
            alt="缺陷图像"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-2 text-[10px] text-[#c9d1d9] space-y-1">
          <div className="text-[11px] font-bold text-[#58a6ff]">
            {defect.type}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8b949e]">表面</span>
            <span>{defect.surface === "top" ? "上表" : "下表"}</span>
            {typeof defect.imageIndex === "number" && (
              <>
                <span className="text-[#8b949e]">图像</span>
                <span>{defect.imageIndex}</span>
              </>
            )}
          </div>
          <div className="text-[#8b949e]">
            缺陷ID: {defect.id}
          </div>
          <div className="text-[#8b949e]">
            位置: X {displayX}, Y {displayY}
          </div>
          <div className="text-[#8b949e] flex flex-wrap gap-x-2">
            <span>距头: {distHead}</span>
            <span>距尾: {distTail ?? "--"}</span>
            <span>距左: {distLeft}</span>
            <span>距右: {distRight ?? "--"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
