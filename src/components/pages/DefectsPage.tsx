import { DefectList } from "../DefectList";
import { DetectionResult } from "../DetectionResult";
import { DefectDistributionChart } from "../DefectDistributionChart";
import { DefectImageView } from "../DefectImageView";
import type {
  Defect,
  DetectionRecord,
  SteelPlate,
  SurfaceFilter,
  ImageViewMode,
  ManualConfirmStatus,
} from "../../types/app.types";
import type { SurfaceImageInfo } from "../../src/api/types";
import type {
  SearchCriteria,
  FilterCriteria,
} from "../SearchDialog";

interface DefectsPageProps {
  isMobileDevice: boolean;
  currentImage: string | null;
  isDetecting: boolean;
  detectionResult: DetectionRecord | null;
  history: DetectionRecord[];
  steelPlates: SteelPlate[];
  filteredSteelPlates: SteelPlate[];
  selectedPlateId: string | null;
  plateDefects: Defect[];
  surfaceImageInfo: SurfaceImageInfo[] | null;
  surfaceFilter: SurfaceFilter;
  setSurfaceFilter: (filter: SurfaceFilter) => void;
  availableDefectTypes: string[];
  selectedDefectTypes: string[];
  setSelectedDefectTypes: (types: string[]) => void;
  defectColors: {
    [key: string]: {
      bg: string;
      border: string;
      text: string;
      activeBg: string;
      activeBorder: string;
      activeText: string;
    };
  };
  defectAccentColors: Record<string, string>;
  imageViewMode: ImageViewMode;
  setImageViewMode: (mode: ImageViewMode) => void;
  manualConfirmStatus: ManualConfirmStatus;
  setManualConfirmStatus: (status: ManualConfirmStatus) => void;
  selectedDefectId: string | null;
  setSelectedDefectId: (id: string | null) => void;
  searchCriteria: SearchCriteria;
  filterCriteria: FilterCriteria;
}

export const DefectsPage: React.FC<DefectsPageProps> = ({
  isMobileDevice,
  currentImage,
  isDetecting,
  detectionResult,
  history,
  steelPlates,
  filteredSteelPlates,
  selectedPlateId,
  plateDefects,
  surfaceImageInfo,
  surfaceFilter,
  setSurfaceFilter,
  availableDefectTypes,
  selectedDefectTypes,
  setSelectedDefectTypes,
  defectColors,
  defectAccentColors,
  imageViewMode,
  setImageViewMode,
  manualConfirmStatus,
  setManualConfirmStatus,
  selectedDefectId,
  setSelectedDefectId,
  searchCriteria,
  filterCriteria,
}) => {
  const activeDefects: Defect[] =
    currentImage || detectionResult
      ? detectionResult?.defects || []
      : plateDefects;

  const filteredDefectsByControls = activeDefects.filter(
    (defect) =>
      (surfaceFilter === "all" ||
        defect.surface === surfaceFilter) &&
      selectedDefectTypes.includes(defect.type),
  );

  const selectedPlate: SteelPlate | undefined =
    filteredSteelPlates.find(
      (p) => p.plateId === selectedPlateId,
    ) || filteredSteelPlates[0];

  const defectsForImageView = plateDefects.filter(
    (d) =>
      surfaceFilter === "all" || d.surface === surfaceFilter,
  );

  const selectedDefect =
    selectedDefectId && filteredDefectsByControls.length > 0
      ? filteredDefectsByControls.find(
          (d) => d.id === selectedDefectId,
        ) || null
      : null;

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* 主区域：左侧图像 / 右侧列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">
        {/* 左侧：图像区域（仅保留主图，移除缺陷分布图） */}
        <div className="lg:col-span-2 flex flex-col gap-2 min-h-0">
          <div className="flex-1 bg-card border border-border p-1 relative min-h-[260px] flex flex-col">
            {/* 顶部标签栏：视图模式 + 人工确认状态 + 选中缺陷信息 */}
            <div className="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] font-bold z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 bg-black/20 rounded p-0.5 shrink-0">
                  <button
                    onClick={() => setImageViewMode("full")}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      imageViewMode === "full"
                        ? "bg-white text-primary"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    大图
                  </button>
                  <button
                    onClick={() => setImageViewMode("single")}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      imageViewMode === "single"
                        ? "bg-white text-primary"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    缺陷
                  </button>
                </div>
                {manualConfirmStatus && (
                  <div className="flex items-center gap-1 bg-black/30 rounded px-2 py-0.5 border border-white/20">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        manualConfirmStatus === "unprocessed"
                          ? "bg-gray-400"
                          : manualConfirmStatus === "ignore"
                            ? "bg-blue-400"
                            : manualConfirmStatus === "A"
                              ? "bg-green-500"
                              : manualConfirmStatus === "B"
                                ? "bg-blue-500"
                                : manualConfirmStatus === "C"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                      }`}
                    />
                    <span className="text-[10px] text-white/90">
                      {manualConfirmStatus === "unprocessed"
                        ? "未处理"
                        : manualConfirmStatus === "ignore"
                          ? "不处理"
                          : manualConfirmStatus === "A"
                            ? "一等品"
                            : manualConfirmStatus === "B"
                              ? "二等品"
                              : manualConfirmStatus === "C"
                                ? "三等品"
                                : "等外品"}
                    </span>
                  </div>
                )}

                {selectedDefect && (
                  <div className="hidden md:flex flex-col md:flex-row md:items-center gap-1 md:gap-2 bg-black/30 rounded px-2 py-0.5 border border-white/10 text-[10px] font-normal min-w-0">
                    <span className="font-semibold truncate">
                      {selectedDefect.type}
                    </span>
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-primary/90 text-primary-foreground">
                      {selectedDefect.severity}
                    </span>
                    <span className="opacity-80 whitespace-nowrap">
                      ({selectedDefect.x.toFixed(0)},{" "}
                      {selectedDefect.y.toFixed(0)})
                    </span>
                    <span className="opacity-80 whitespace-nowrap">
                      {selectedDefect.width.toFixed(0)}×
                      {selectedDefect.height.toFixed(0)}
                    </span>
                    <span className="opacity-80 whitespace-nowrap">
                      {Math.round(
                        selectedDefect.confidence * 100,
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>

              <span className="text-[10px] opacity-80 flex-1 text-center truncate">
                {selectedPlateId
                  ? `钢板: ${selectedPlateId}`
                  : "未选择"}
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center bg-black/40 mt-5">
              {currentImage || detectionResult ? (
                <DetectionResult
                  imageUrl={
                    currentImage ||
                    detectionResult!.fullImageUrl
                  }
                  defects={filteredDefectsByControls}
                  isDetecting={isDetecting}
                />
              ) : selectedPlate ? (
                <DefectImageView
                  selectedPlate={selectedPlate}
                  defects={defectsForImageView}
                  surface={surfaceFilter}
                  imageViewMode={imageViewMode}
                  selectedDefectId={selectedDefectId}
                  onDefectSelect={setSelectedDefectId}
                  surfaceImageInfo={surfaceImageInfo}
                />
              ) : (
                <div className="text-xs text-muted-foreground">
                  请上传图像或选择左侧钢板记录。
                </div>
              )}
            </div>
          </div>

          {/* 缺陷缩略分布图（小钢板示意） */}
          <div className="bg-card border border-border p-1.5">
            <DefectDistributionChart
              defects={filteredDefectsByControls}
              surface={surfaceFilter}
              defectColors={defectColors}
              surfaceImageInfo={surfaceImageInfo}
              selectedDefectId={selectedDefectId}
              onDefectSelect={setSelectedDefectId}
              seqNo={
                selectedPlate
                  ? parseInt(selectedPlate.serialNumber, 10)
                  : undefined
              }
            />
          </div>
        </div>

        {/* 右侧：缺陷列表 */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="bg-card border border-border p-1.5 flex flex-col min-h-[180px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                缺陷列表
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <DefectList
                defects={filteredDefectsByControls}
                isDetecting={isDetecting}
                surface={surfaceFilter}
                defectColors={defectColors}
                selectedDefectId={selectedDefectId}
                onDefectSelect={setSelectedDefectId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};