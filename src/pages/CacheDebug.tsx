import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HardDrive, RefreshCcw, Settings, Trash2, RotateCw, FolderSync, Wrench } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { env } from "../config/env";
import {
  deleteCacheRecords,
  getCacheSettings,
  getCacheStatus,
  listCacheRecords,
  migrateCacheRoots,
  precacheRecord,
  rebuildCacheRecords,
  scanCacheRecord,
  updateCacheSettings,
  type CacheSettingsResponse,
  type CacheStatus,
  type CacheRecordItem,
} from "../api/cache";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const STATUS_META = {
  none: { label: "未缓存", color: "bg-muted-foreground/60" },
  partial: { label: "缓存中", color: "bg-amber-400" },
  complete: { label: "完成", color: "bg-emerald-500" },
};

const CACHE_FIELDS: Array<{
  key: string;
  label: string;
  hint?: string;
  type?: "number" | "boolean";
}> = [
  { key: "max_frames", label: "帧缓存上限", hint: "-1 表示全部", type: "number" },
  { key: "max_tiles", label: "瓦片缓存上限", hint: "-1 表示全部", type: "number" },
  { key: "max_mosaics", label: "拼图缓存上限", hint: "-1 表示全部", type: "number" },
  { key: "max_defect_crops", label: "缺陷裁剪缓存上限", hint: "-1 表示全部", type: "number" },
  { key: "ttl_seconds", label: "缓存有效期(秒)", type: "number" },
  { key: "defect_cache_enabled", label: "缺陷裁剪缓存", type: "boolean" },
  { key: "defect_cache_expand", label: "缺陷扩展像素", type: "number" },
  { key: "disk_cache_enabled", label: "磁盘缓存", type: "boolean" },
  { key: "disk_cache_max_records", label: "磁盘缓存记录上限", type: "number" },
  { key: "disk_cache_scan_interval_seconds", label: "磁盘扫描间隔(秒)", type: "number" },
  { key: "disk_cache_cleanup_interval_seconds", label: "磁盘清理间隔(秒)", type: "number" },
  { key: "disk_precache_enabled", label: "磁盘预热", type: "boolean" },
  { key: "disk_precache_levels", label: "预热层级", type: "number" },
  { key: "disk_precache_workers", label: "缓存线程数", type: "number" },
];

const formatTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(/\//g, "-");
};

export default function CacheDebug() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CacheRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [scanTarget, setScanTarget] = useState<CacheRecordItem | null>(null);
  const [precacheTarget, setPrecacheTarget] = useState<CacheRecordItem | null>(null);
  const [precacheLevels, setPrecacheLevels] = useState(4);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRebuildOpen, setIsRebuildOpen] = useState(false);
  const [isMigrateOpen, setIsMigrateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"all" | "keep_last" | "range">("all");
  const [deleteKeepLast, setDeleteKeepLast] = useState(200);
  const [deleteStart, setDeleteStart] = useState(1);
  const [deleteEnd, setDeleteEnd] = useState(100);
  const [rebuildMode, setRebuildMode] = useState<"all" | "keep_last" | "range">("keep_last");
  const [rebuildKeepLast, setRebuildKeepLast] = useState(200);
  const [rebuildStart, setRebuildStart] = useState(1);
  const [rebuildEnd, setRebuildEnd] = useState(100);
  const [rebuildForce, setRebuildForce] = useState(false);
  const [migrateTopRoot, setMigrateTopRoot] = useState("");
  const [migrateBottomRoot, setMigrateBottomRoot] = useState("");
  const [cacheSettings, setCacheSettings] = useState<CacheSettingsResponse | null>(null);

  const lineKey = env.getLineName() || "未选择";
  const apiProfile = env.getApiProfile() === "small" ? "small" : "full";
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const resp = await listCacheRecords(page, pageSize);
      setItems(resp.items);
      setTotal(resp.total);
    } catch (error) {
      console.error("Load cache records failed", error);
      toast.error("加载缓存记录失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [page]);

  useEffect(() => {
    let timer: number | null = null;
    const loadStatus = async () => {
      try {
        const status = await getCacheStatus();
        setCacheStatus(status);
      } catch (error) {
        console.error("Load cache status failed", error);
      }
    };
    void loadStatus();
    timer = window.setInterval(loadStatus, 3000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, []);

  const handleScan = async () => {
    if (!scanTarget) return;
    try {
      await scanCacheRecord(scanTarget.seq_no);
      toast.success("缓存状态已刷新");
      setScanTarget(null);
      await loadData();
    } catch (error) {
      console.error("Scan cache failed", error);
      toast.error("缓存状态刷新失败");
    }
  };

  const handlePrecache = async () => {
    if (!precacheTarget) return;
    try {
      await precacheRecord(precacheTarget.seq_no, precacheLevels);
      toast.success("磁盘缓存已触发");
      setPrecacheTarget(null);
      await loadData();
    } catch (error) {
      console.error("Precache failed", error);
      toast.error("磁盘缓存触发失败");
    }
  };

  const handleDeleteCache = async () => {
    try {
      await deleteCacheRecords({
        mode: deleteMode,
        keep_last: deleteMode === "keep_last" ? deleteKeepLast : undefined,
        start_seq: deleteMode === "range" ? deleteStart : undefined,
        end_seq: deleteMode === "range" ? deleteEnd : undefined,
      });
      toast.success("缓存删除任务已提交");
      setIsDeleteOpen(false);
      await loadData();
    } catch (error) {
      console.error("Delete cache failed", error);
      toast.error("缓存删除失败");
    }
  };

  const handleRebuildCache = async () => {
    try {
      await rebuildCacheRecords({
        mode: rebuildMode,
        keep_last: rebuildMode === "keep_last" ? rebuildKeepLast : undefined,
        start_seq: rebuildMode === "range" ? rebuildStart : undefined,
        end_seq: rebuildMode === "range" ? rebuildEnd : undefined,
        force: rebuildForce,
      });
      toast.success("缓存重建任务已启动");
      setIsRebuildOpen(false);
    } catch (error) {
      console.error("Rebuild cache failed", error);
      toast.error("缓存重建失败");
    }
  };

  const handleMigrateCache = async () => {
    try {
      await migrateCacheRoots({
        top_root: migrateTopRoot.trim() || undefined,
        bottom_root: migrateBottomRoot.trim() || undefined,
      });
      toast.success("缓存迁移已完成");
      setIsMigrateOpen(false);
    } catch (error) {
      console.error("Migrate cache failed", error);
      toast.error("缓存迁移失败");
    }
  };

  const handleOpenSettings = async () => {
    try {
      const payload = await getCacheSettings();
      setCacheSettings(payload);
      setIsSettingsOpen(true);
    } catch (error) {
      console.error("Load cache settings failed", error);
      toast.error("加载缓存设置失败");
    }
  };

  const handleSaveSettings = async () => {
    if (!cacheSettings) return;
    try {
      const next = await updateCacheSettings(cacheSettings.cache || {});
      setCacheSettings(next);
      toast.success("缓存设置已更新");
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Update cache settings failed", error);
      toast.error("缓存设置更新失败");
    }
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group"
            title="返回主界面"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-tighter">返回</span>
          </button>
          <div className="h-6 w-[1px] bg-border mx-1" />
          <div className="flex flex-col justify-center">
            <span className="text-[13px] font-black tracking-tighter leading-none flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              缓存调试
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-70">
              Cache / Diagnostics
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2 px-2 py-1 border border-border rounded-sm bg-background/60">
            产线 <span className="font-mono text-foreground">{lineKey}</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 border border-border rounded-sm bg-background/60">
            模式 <span className="font-mono text-foreground">{apiProfile}</span>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/50 text-xs"
          >
            <RefreshCcw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1fr] gap-3 mb-3">
          <div className="border border-border rounded-sm p-3 bg-card/70 flex flex-col gap-2">
            <div className="text-xs font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-primary" />
              缓存运行状态
            </div>
            <div className="text-[12px] text-muted-foreground">
              {cacheStatus ? (
                <span className="text-foreground font-medium">{cacheStatus.message}</span>
              ) : (
                "状态获取中..."
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>状态：{cacheStatus?.state || "ready"}</span>
              {cacheStatus?.seq_no ? <span>流水号：{cacheStatus.seq_no}</span> : null}
              {cacheStatus?.surface ? <span>表面：{cacheStatus.surface}</span> : null}
            </div>
          </div>
          <div className="border border-border rounded-sm p-3 bg-card/70 flex items-center justify-between gap-3">
            <div className="text-xs font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              缓存操作
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                onClick={() => setIsDeleteOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
              >
                <Trash2 className="w-3 h-3" />
                缓存删除
              </button>
              <button
                onClick={() => setIsRebuildOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
              >
                <RotateCw className="w-3 h-3" />
                缓存重建
              </button>
              <button
                onClick={() => setIsMigrateOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-muted/60"
              >
                <FolderSync className="w-3 h-3" />
                缓存迁移
              </button>
              <button
                onClick={handleOpenSettings}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Settings className="w-3 h-3" />
                缓存设置
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 border border-border rounded-sm overflow-hidden flex flex-col">
          <div className="grid grid-cols-[0.8fr_1.1fr_1fr_1.4fr_1.2fr_1.3fr] gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/40">
            <span>流水号</span>
            <span>板号</span>
            <span>缓存状态</span>
            <span>磁盘缓存级别</span>
            <span>更新时间</span>
            <span className="text-right">操作</span>
          </div>
          <div className="flex-1 overflow-auto">
            {items.map((item) => {
              const status = STATUS_META[item.status];
              const top = item.surfaces.find((s) => s.surface === "top");
              const bottom = item.surfaces.find((s) => s.surface === "bottom");
              const lastUpdate = [top?.updated_at, bottom?.updated_at]
                .filter(Boolean)
                .sort()
                .pop();
              return (
                <div
                  key={item.seq_no}
                  className="grid grid-cols-[0.8fr_1.1fr_1fr_1.4fr_1.2fr_1.3fr] gap-2 px-3 py-2 text-[12px] border-b border-border/50 hover:bg-muted/30"
                >
                  <span className="font-mono font-semibold">{item.seq_no}</span>
                  <span className="font-mono">{item.steel_no || "--"}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.color}`} />
                    <span>{status.label}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    上表: {top?.tile_max_level ?? "--"}{" "}
                    {top?.tile_size ? `(${top.tile_size}px)` : ""}
                    <span className="mx-1">/</span>
                    下表: {bottom?.tile_max_level ?? "--"}{" "}
                    {bottom?.tile_size ? `(${bottom.tile_size}px)` : ""}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{formatTime(lastUpdate)}</span>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setScanTarget(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-[11px] hover:bg-muted/60"
                    >
                      更新状态
                    </button>
                    <button
                      onClick={() => setPrecacheTarget(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-primary/40 text-primary text-[11px] hover:bg-primary hover:text-primary-foreground"
                    >
                      <HardDrive className="w-3 h-3" />
                      磁盘缓存
                    </button>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                暂无钢板缓存记录
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            总计 {total} 条 / 当前 {page} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-sm border border-border hover:bg-muted/60 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-sm border border-border hover:bg-muted/60 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(scanTarget)} onOpenChange={(open) => !open && setScanTarget(null)}>
        <DialogContent className="max-w-[520px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存状态更新</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              重新扫描磁盘缓存数据并更新 CacheRecord 表。
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-muted-foreground">
            目标流水号：<span className="font-mono text-foreground">{scanTarget?.seq_no}</span>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setScanTarget(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleScan}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              确认
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(precacheTarget)} onOpenChange={(open) => !open && setPrecacheTarget(null)}>
        <DialogContent className="max-w-[560px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">磁盘缓存</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              触发指定钢板瓦片与缺陷小图的磁盘缓存预热。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="text-muted-foreground">
              目标流水号：<span className="font-mono text-foreground">{precacheTarget?.seq_no}</span>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">预热层级</span>
              <input
                type="number"
                value={precacheLevels}
                onChange={(e) => setPrecacheLevels(Number(e.target.value))}
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setPrecacheTarget(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handlePrecache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              确认
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-[620px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存删除</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              删除磁盘缓存，并清除对应缓存记录表数据。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={deleteMode === "all"}
                  onChange={() => setDeleteMode("all")}
                />
                删除全部
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={deleteMode === "keep_last"}
                  onChange={() => setDeleteMode("keep_last")}
                />
                只保留 N 条
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={deleteMode === "range"}
                  onChange={() => setDeleteMode("range")}
                />
                流水号区间
              </label>
            </div>
            {deleteMode === "keep_last" && (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">保留数量</span>
                <input
                  type="number"
                  value={deleteKeepLast}
                  onChange={(e) => setDeleteKeepLast(Number(e.target.value))}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
            )}
            {deleteMode === "range" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">起始流水号</span>
                  <input
                    type="number"
                    value={deleteStart}
                    onChange={(e) => setDeleteStart(Number(e.target.value))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">结束流水号</span>
                  <input
                    type="number"
                    value={deleteEnd}
                    onChange={(e) => setDeleteEnd(Number(e.target.value))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              原始图像目录不会被删除
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleDeleteCache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground text-[11px]"
            >
              确认删除
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRebuildOpen} onOpenChange={setIsRebuildOpen}>
        <DialogContent className="max-w-[620px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存重建</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              重新构建磁盘缓存，可选择覆盖已缓存数据。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={rebuildMode === "all"}
                  onChange={() => setRebuildMode("all")}
                />
                全部
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={rebuildMode === "keep_last"}
                  onChange={() => setRebuildMode("keep_last")}
                />
                最近 N 条
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={rebuildMode === "range"}
                  onChange={() => setRebuildMode("range")}
                />
                区间
              </label>
            </div>
            {rebuildMode === "keep_last" && (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">重建数量</span>
                <input
                  type="number"
                  value={rebuildKeepLast}
                  onChange={(e) => setRebuildKeepLast(Number(e.target.value))}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
            )}
            {rebuildMode === "range" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">起始流水号</span>
                  <input
                    type="number"
                    value={rebuildStart}
                    onChange={(e) => setRebuildStart(Number(e.target.value))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">结束流水号</span>
                  <input
                    type="number"
                    value={rebuildEnd}
                    onChange={(e) => setRebuildEnd(Number(e.target.value))}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
            )}
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={rebuildForce}
                onChange={(e) => setRebuildForce(e.target.checked)}
              />
              覆盖已缓存数据
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsRebuildOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleRebuildCache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              确认重建
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMigrateOpen} onOpenChange={setIsMigrateOpen}>
        <DialogContent className="max-w-[620px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存迁移</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改缓存存储位置，并迁移已有缓存数据。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">上表缓存目录</span>
              <input
                value={migrateTopRoot}
                onChange={(e) => setMigrateTopRoot(e.target.value)}
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                placeholder="例如：D:\\cache\\top"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">下表缓存目录</span>
              <input
                value={migrateBottomRoot}
                onChange={(e) => setMigrateBottomRoot(e.target.value)}
                className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                placeholder="例如：D:\\cache\\bottom"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsMigrateOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleMigrateCache}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              开始迁移
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[860px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">缓存设置</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改 server.json 中的 cache 配置。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {CACHE_FIELDS.map((field) => {
              const value = cacheSettings?.cache?.[field.key];
              return (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-muted-foreground">
                    {field.label}
                    {field.hint ? <span className="ml-1 opacity-70">{field.hint}</span> : null}
                  </span>
                  {field.type === "boolean" ? (
                    <select
                      value={String(Boolean(value))}
                      onChange={(e) =>
                        setCacheSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                cache: {
                                  ...prev.cache,
                                  [field.key]: e.target.value === "true",
                                },
                              }
                            : prev,
                        )
                      }
                      className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                    >
                      <option value="true">启用</option>
                      <option value="false">禁用</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={value ?? ""}
                      onChange={(e) =>
                        setCacheSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                cache: {
                                  ...prev.cache,
                                  [field.key]: Number(e.target.value),
                                },
                              }
                            : prev,
                        )
                      }
                      className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                    />
                  )}
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-border text-[11px] text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleSaveSettings}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-[11px]"
            >
              保存设置
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
