import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  HardDrive,
  Layers,
  RefreshCcw,
  Plus,
  Pencil,
  Trash2,
  Power,
  RotateCw,
  Activity,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import {
  getCacheConfig,
  getConfigApiList,
  getLineConfig,
  restartLine,
  saveLineConfig,
  updateCacheConfig,
  type CacheConfig,
  type CacheConfigUpdatePayload,
  type ConfigApiNode,
} from "../../api/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export const ServiceSettings: React.FC = () => {
  const [config, setConfig] = useState<CacheConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lineDefaults, setLineDefaults] = useState<Record<string, any>>({});
  const [lines, setLines] = useState<Record<string, any>[]>([]);
  const [apiStatus, setApiStatus] = useState<Record<string, ConfigApiNode>>({});
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [isLineEditOpen, setIsLineEditOpen] = useState(false);
  const [isSavingLines, setIsSavingLines] = useState(false);
  const [isRefreshingLines, setIsRefreshingLines] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCacheConfig()
      .then((payload) => {
        if (mounted) setConfig(payload);
      })
      .catch((err) => {
        console.error("Failed to load cache config", err);
        toast.error("加载缓存配置失败");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const refreshLineConfig = async () => {
    setIsRefreshingLines(true);
    try {
      const [payload, status] = await Promise.all([
        getLineConfig(),
        getConfigApiList(),
      ]);
      setLines(payload.lines ?? []);
      setLineDefaults(payload.defaults ?? {});
      const statusMap: Record<string, ConfigApiNode> = {};
      status.forEach((item) => {
        if (item.key) statusMap[item.key] = item;
      });
      setApiStatus(statusMap);
    } catch (err) {
      console.error("Failed to load line config", err);
      toast.error("加载产线配置失败");
    } finally {
      setIsRefreshingLines(false);
    }
  };

  const handleTemplateChange = (key: string, value: any) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev, templates: { ...prev.templates } };
      const current = { ...(next.templates.default || {}) };
      (current as any)[key] = value;
      next.templates.default = current;
      return next;
    });
  };

  const handleSaveTemplates = async () => {
    if (!config) return;
    const payload: CacheConfigUpdatePayload = {
      templates: {
        default: config.templates.default,
      },
    };
    setIsSaving(true);
    try {
      const next = await updateCacheConfig(payload);
      setConfig(next);
      toast.success("缓存模板已保存");
    } catch (err) {
      console.error("Failed to save cache templates", err);
      toast.error("保存缓存模板失败");
    } finally {
      setIsSaving(false);
    };
  };

  const handleSaveLines = async () => {
    setIsSavingLines(true);
    try {
      await saveLineConfig({ lines, defaults: lineDefaults });
      toast.success("产线配置已保存");
      await refreshLineConfig();
    } catch (err) {
      console.error("Failed to save line config", err);
      toast.error("保存产线配置失败");
    } finally {
      setIsSavingLines(false);
    }
  };

  const openEditLine = (index: number) => {
    setEditingLineIndex(index);
    setIsLineEditOpen(true);
  };

  const handleLineChange = (key: string, value: any) => {
    if (editingLineIndex === null) return;
    setLines((prev) =>
      prev.map((item, idx) =>
        idx === editingLineIndex ? { ...item, [key]: value } : item,
      ),
    );
  };

  const handleAddLine = () => {
    const next = {
      name: "",
      key: "",
      mode: "direct",
      ip: "",
      port: 8200,
      profile: "default",
    };
    setLines((prev) => [next, ...prev]);
    setEditingLineIndex(0);
    setIsLineEditOpen(true);
  };

  const handleDeleteLine = (index: number) => {
    if (!confirm("确定要删除该产线吗？")) return;
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleLineEnabled = (index: number) => {
    setLines((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const mode = String(item.mode || "direct");
        return {
          ...item,
          mode: mode === "disabled" ? "direct" : "disabled",
        };
      }),
    );
  };

  const handleRestartLine = async (key: string, name?: string) => {
    if (!key) {
      toast.error("缺少产线 key");
      return;
    }
    try {
      await restartLine(key);
      toast.success(`产线 ${name || key} 已重启`);
      await refreshLineConfig();
    } catch (err) {
      console.error("Failed to restart line", err);
      toast.error(`产线 ${name || key} 重启失败`);
    }
  };

  const lineStatus = useMemo(() => {
    const map: Record<string, { online: boolean; age?: number | null }> = {};
    Object.keys(apiStatus).forEach((key) => {
      const status = apiStatus[key];
      map[key] = {
        online: Boolean(status?.online),
        age: status?.latest_age_seconds ?? null,
      };
    });
    return map;
  }, [apiStatus]);

  const formatAge = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return "--";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const remaining = minutes % 60;
      return `${hours}h${remaining}m`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-xs">
        <LoaderSpinner />
        <span>正在加载服务设置...</span>
      </div>
    );
  }

  const defaultImages = config.templates.default || {};

  const renderTemplateCard = (label: string, images: Record<string, any>) => {
    const diskCacheEnabled = Boolean(images.disk_cache_enabled);
    const defectCacheEnabled = images.defect_cache_enabled !== false;
    const defectExpand = images.defect_cache_expand ?? 100;
    const maxDefects = images.disk_cache_max_defects ?? 1000;
    const maxTiles = images.disk_cache_max_tiles ?? 2000;

    return (
      <div className="border border-border rounded-md p-3 bg-card flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                Server Template
              </span>
            </div>
          </div>
          <button
            onClick={handleSaveTemplates}
            disabled={isSaving}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <RefreshCcw className={`w-3 h-3 ${isSaving ? "animate-spin" : ""}`} />
            <span>保存</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1 text-[11px]">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">磁盘缓存</span>
            <select
              value={diskCacheEnabled ? "true" : "false"}
              onChange={(e) => handleTemplateChange("disk_cache_enabled", e.target.value === "true")}
              className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
            >
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">缺陷缓存</span>
            <select
              value={defectCacheEnabled ? "true" : "false"}
              onChange={(e) => handleTemplateChange("defect_cache_enabled", e.target.value === "true")}
              className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
            >
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">缺陷扩展像素</span>
            <input
              type="number"
              min={0}
              max={512}
              value={defectExpand}
              onChange={(e) => handleTemplateChange("defect_cache_expand", Number(e.target.value) || 0)}
              className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">磁盘缺陷上限</span>
            <input
              type="number"
              min={1}
              value={maxDefects}
              onChange={(e) => handleTemplateChange("disk_cache_max_defects", Number(e.target.value) || 1)}
              className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">磁盘瓦片上限</span>
            <input
              type="number"
              min={1}
              value={maxTiles}
              onChange={(e) => handleTemplateChange("disk_cache_max_tiles", Number(e.target.value) || 1)}
              className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
            />
          </label>
        </div>
      </div>
    );
  };

  const views = config.views || {};
  const viewEntries = Object.entries(views);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground uppercase tracking-[0.2em]">Service</span>
            <span className="text-foreground font-bold">服务设置 / 缓存配置</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>主机：<span className="font-mono text-foreground">{config.hostname || "UNKNOWN"}</span></span>
            <span>配置目录：<span className="font-mono text-foreground">{config.config_root_name || "current"}</span></span>
            <span className="opacity-70">{config.config_root}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <AlertCircle className="w-3 h-3" />
          <span>模板修改会写入 configs/current/server.json。</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] gap-3 p-4 overflow-hidden">
        <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          {renderTemplateCard("缓存模板 (Server.json)", defaultImages)}
          <div className="border border-border rounded-md p-3 bg-card flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Layers className="w-4 h-4 text-primary" />
              视图参数 (map.json)
            </div>
            {viewEntries.length === 0 && (
              <div className="text-[11px] text-muted-foreground">暂无视图配置</div>
            )}
            {viewEntries.map(([key, view]) => {
              const frameWidth = (view as any)?.frame_width ?? "-";
              const frameHeight = (view as any)?.frame_height ?? "-";
              const pixelScale = (view as any)?.pixel_scale ?? "-";
              return (
                <div key={key} className="flex items-center justify-between text-[11px] border border-border rounded-sm px-2 py-1">
                  <span className="font-bold">{key}</span>
                  <span className="text-muted-foreground font-mono">
                    {frameWidth}×{frameHeight} · scale {pixelScale}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2 mb-1">
            <span>产线配置视图</span>
            <span className="text-[10px] font-normal">
              以下为各产线在视图配置下“实际生效”的参数（只读预览）。
            </span>
          </div>
          <div className="grid gap-2">
            {config.lines?.map((line) => {
              return (
                <div key={line.key} className="border border-border rounded-md p-3 bg-card/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        {line.name || line.key || "未命名"} ({line.key})
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        模式: {line.mode || "direct"} · {line.ip}:{line.port ?? "?"}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-2 mt-2">
                    {(line.views || []).map((view) => {
                      const images = view.images || {};
                      const diskCacheEnabled = images.disk_cache_enabled ? "启用" : "禁用";
                      const defectCacheEnabled = images.defect_cache_enabled === false ? "禁用" : "启用";
                      const defectExpand = images.defect_cache_expand ?? config.templates.default?.defect_cache_expand ?? 100;
                      const frameWidth = images.frame_width ?? "-";
                      const frameHeight = images.frame_height ?? "-";
                      const pixelScale = images.pixel_scale ?? "-";
                      return (
                        <div key={`${line.key}-${view.view}`} className="border border-border rounded-sm px-2 py-2 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{view.view}</span>
                            <span className="text-muted-foreground font-mono">
                              {frameWidth}×{frameHeight} · scale {pixelScale}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">磁盘缓存</span>
                              <span className="font-mono">{diskCacheEnabled}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">缺陷缓存</span>
                              <span className="font-mono">{defectCacheEnabled}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">缺陷扩展像素</span>
                              <span className="font-mono">{defectExpand}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => {
            setIsLineDialogOpen(true);
            void refreshLineConfig();
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-primary/40 text-primary text-[11px] font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          产线配置与运行状态
        </button>
      </div>

      <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
        <DialogContent className="max-w-[960px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">产线配置视图</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              支持编辑、停用、重启产线，并查看 API 心跳状态。
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>来源：</span>
              <span className="font-mono text-foreground">{config.map_path || "configs/current/map.json"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border border-border hover:bg-muted/50"
              >
                <Plus className="w-3 h-3" />
                添加
              </button>
              <button
                onClick={refreshLineConfig}
                disabled={isRefreshingLines}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border border-border hover:bg-muted/50"
              >
                <RefreshCcw className={`w-3 h-3 ${isRefreshingLines ? "animate-spin" : ""}`} />
                刷新
              </button>
              <button
                onClick={handleSaveLines}
                disabled={isSavingLines}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <RotateCw className={`w-3 h-3 ${isSavingLines ? "animate-spin" : ""}`} />
                保存
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[420px] overflow-auto border border-border rounded-sm">
            <div className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_1fr] gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <span>产线</span>
              <span>连接</span>
              <span>端口</span>
              <span>状态</span>
              <span className="text-right">操作</span>
            </div>
            {lines.map((line, index) => {
              const key = String(line.key || line.name || "");
              const status = lineStatus[key];
              const online = status?.online ?? false;
              const mode = String(line.mode || "direct");
              return (
                <div
                  key={`${key}-${index}`}
                  className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_1fr] gap-2 px-3 py-2 text-[12px] border-b border-border/50 hover:bg-muted/30"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{line.name || "未命名"}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{key || "--"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono">{line.ip || "-"}</span>
                    <span className="text-[10px] text-muted-foreground">模式: {mode}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono">{line.port ?? "-"}</span>
                    <span className="text-[10px] text-muted-foreground">Profile: {line.profile || "default"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-bold ${online ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {online ? "在线" : "离线"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      心跳: {formatAge(status?.age)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditLine(index)}
                      className="p-1 hover:bg-muted/60 rounded"
                      title="编辑"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleLineEnabled(index)}
                      className="p-1 hover:bg-muted/60 rounded"
                      title={mode === "disabled" ? "启用" : "停用"}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRestartLine(key, line.name)}
                      className="p-1 hover:bg-muted/60 rounded"
                      title="重启"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLine(index)}
                      className="p-1 hover:bg-muted/60 rounded text-destructive"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {lines.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                暂无产线配置
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLineEditOpen} onOpenChange={setIsLineEditOpen}>
        <DialogContent className="max-w-[520px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-base">产线编辑</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              编辑产线基础信息，保存后请点击“保存”。
            </DialogDescription>
          </DialogHeader>
          {editingLineIndex !== null && lines[editingLineIndex] && (
            <div className="grid gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">产线名称</span>
                <input
                  value={lines[editingLineIndex].name ?? ""}
                  onChange={(e) => handleLineChange("name", e.target.value)}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Key</span>
                <input
                  value={lines[editingLineIndex].key ?? ""}
                  onChange={(e) => handleLineChange("key", e.target.value)}
                  className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">模式</span>
                  <select
                    value={lines[editingLineIndex].mode ?? "direct"}
                    onChange={(e) => handleLineChange("mode", e.target.value)}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  >
                    <option value="direct">direct</option>
                    <option value="proxy">proxy</option>
                    <option value="disabled">disabled</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Profile</span>
                  <input
                    value={lines[editingLineIndex].profile ?? ""}
                    onChange={(e) => handleLineChange("profile", e.target.value)}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">IP</span>
                  <input
                    value={lines[editingLineIndex].ip ?? ""}
                    onChange={(e) => handleLineChange("ip", e.target.value)}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">端口</span>
                  <input
                    type="number"
                    value={lines[editingLineIndex].port ?? ""}
                    onChange={(e) =>
                      handleLineChange("port", Number(e.target.value) || 0)
                    }
                    className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
                  />
                </label>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LoaderSpinner: React.FC = () => (
  <div className="inline-flex items-center justify-center w-4 h-4 border border-border border-t-transparent rounded-full animate-spin" />
);
