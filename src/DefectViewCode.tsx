// ========================================
// 这个文件包含需要替换到 App.tsx 中的缺陷界面代码
// 位置：约第 1179-1212 行
// ========================================

{
    /* Viewport 容器开始 */
}
<div className="flex-1 bg-card border border-border p-1 relative min-h-[300px] flex flex-col">
  {!isMobileDevice && (
    <div className="absolute top-0 left-0 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold z-10">
      {env.isProduction() ? "缺陷检测视图" : "CAM-01 LIVE FEED"}
    </div>
  )}

    {/* 大图/单缺陷切换按钮 - 仅生产模式显示 */}
  {!isMobileDevice && (
    <div className="absolute top-0 right-0 flex gap-1 p-1 z-10">
      <button
        onClick={() => setImageViewMode("full")}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          imageViewMode === "full"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent"
        }`}
      >
          大图
      </button>
      <button
        onClick={() => setImageViewMode("single")}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          imageViewMode === "single"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent"
        }`}
      >
        单缺陷
      </button>
    </div>
  )}

  {/* 主显示区域 */}
  <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden border border-border/20 relative">
    {isLoadingDefects ? (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm">加载缺陷数据中</p>
      </div>
    ) : !selectedPlateId || plateDefects.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="w-16 h-16 opacity-50" />
        <p className="text-sm">
          {selectedPlateId ? "无缺陷数据"
              : "请选择钢板查看缺陷"}
        </p>
      </div>
    ) : (
      <DefectImageView
        selectedPlate={steelPlates.find(
          (p) => p.plateId === selectedPlateId,
        )}
        defects={plateDefects.filter(
          (d) =>
            surfaceFilter === "all" ||
            d.surface === surfaceFilter,
        )}
        surface={surfaceFilter}
        imageViewMode={imageViewMode}
        selectedDefectId={selectedDefectId}
        onDefectSelect={setSelectedDefectId}
        imageOrientation={imageOrientation}
      />
    )}
  </div>
</div>;
{
  /*容器结束*/
}
