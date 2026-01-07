import { useEffect, useState } from "react";
import { AlertCircle, HardDrive, RefreshCcw } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { getCacheConfig, updateCacheConfig, type CacheConfig, type CacheConfigUpdatePayload } from "../../api/admin";

export const ServiceSettings: React.FC = () => {
  const [config, setConfig] = useState<CacheConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleTemplateChange = (profile: "default" | "small", key: string, value: any) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev, templates: { ...prev.templates } };
      const current = { ...(profile === "small" ? next.templates.small : next.templates.default) };
      (current as any)[key] = value;
      if (profile === "small") {
        next.templates.small = current;
      } else {
        next.templates.default = current;
      }
      return next;
    });
  };

  const handleSaveTemplates = async () => {
    if (!config) return;
    const payload: CacheConfigUpdatePayload = {
      templates: {
        default: config.templates.default,
        small: config.templates.small,
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

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-xs">
        <LoaderSpinner />
        <span>正在加载服务设置...</span>
      </div>
    );
  }

  const defaultImages = config.templates.default || {};
  const smallImages = config.templates.small || {};

  const renderTemplateCard = (label: string, profile: "default" | "small", images: Record<string, any>) => {
    const diskCacheEnabled = Boolean(images.disk_cache_enabled);
    const defectCacheEnabled = images.defect_cache_enabled !== false;
    const defectExpand = images.defect_cache_expand ?? 100;
    const maxDefects = images.disk_cache_max_defects ?? 1000;

    return (
      <div className="border border-border rounded-md p-3 bg-card flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                Profile: {profile === "small" ? "SMALL" : "DEFAULT"}
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
              onChange={(e) => handleTemplateChange(profile, "disk_cache_enabled", e.target.value === "true")}
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
              onChange={(e) => handleTemplateChange(profile, "defect_cache_enabled", e.target.value === "true")}
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
              onChange={(e) => handleTemplateChange(profile, "defect_cache_expand", Number(e.target.value) || 0)}
              className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">磁盘缺陷上限</span>
            <input
              type="number"
              min={1}
              value={maxDefects}
              onChange={(e) => handleTemplateChange(profile, "disk_cache_max_defects", Number(e.target.value) || 1)}
              className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
            />
          </label>
        </div>
      </div>
    );
  };

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
            <span>配置文件夹：<span className="font-mono text-foreground">{config.map_root_name}</span></span>
            <span className="opacity-70">{config.map_root}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <AlertCircle className="w-3 h-3" />
          <span>模板修改会影响所有继承该模板的产线，请谨慎操作。</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] gap-3 p-4 overflow-hidden">
        <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          {renderTemplateCard("默认模板 (2D)", "default", defaultImages)}
          {Object.keys(smallImages).length > 0 && renderTemplateCard("SMALL 模板", "small", smallImages)}
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2 mb-1">
            <span>产线配置视图</span>
            <span className="text-[10px] font-normal">
              以下为各产线在当前模板和 defaults 下“实际生效”的缓存参数（只读预览）。
            </span>
          </div>
          <div className="grid gap-2">
            {config.lines?.map((line) => {
              const images = line.effective?.images || {};
              const label = `${line.name || line.key || "未命名"} (${line.key})`;
              const profileLabel = line.profile === "small" ? "SMALL" : "DEFAULT";
              const diskCacheEnabled = images.disk_cache_enabled ? "启用" : "禁用";
              const defectCacheEnabled = images.defect_cache_enabled === false ? "禁用" : "启用";
              const defectExpand = images.defect_cache_expand ?? config.templates.default?.defect_cache_expand ?? 100;

              return (
                <div key={line.key} className="border border-border rounded-md p-3 bg-card/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">{label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Profile: {profileLabel} · 模式: {line.mode || "direct"} · {line.ip}:{line.port ?? "?"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
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
      </div>
    </div>
  );
};

const LoaderSpinner: React.FC = () => (
  <div className="inline-flex items-center justify-center w-4 h-4 border border-border border-t-transparent rounded-full animate-spin" />
);

