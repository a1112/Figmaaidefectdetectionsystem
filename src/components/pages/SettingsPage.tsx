import React, { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  HardDrive,
  Minimize2,
  Rows3,
  Columns3,
} from "lucide-react";
import { ModeSwitch } from "../ModeSwitch";
import type {
  Theme,
  ImageOrientation,
} from "../../types/app.types";
import { env, type ApiProfile } from "../../src/config/env";
import type { ApiNode } from "../../src/api/types";

interface SettingsPageProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  imageOrientation: ImageOrientation;
  setImageOrientation: (value: ImageOrientation) => void;
  apiNodes: ApiNode[];
  lineName: string;
  onLineChange: (key: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  theme,
  setTheme,
  imageOrientation,
  setImageOrientation,
  apiNodes,
  lineName,
  onLineChange,
}) => {
  const [apiProfile, setApiProfile] = useState<ApiProfile>(
    env.getApiProfile(),
  );
  const [mode, setMode] = useState(env.getMode());
  const [corsBaseUrl, setCorsBaseUrl] = useState(env.getCorsBaseUrl());

  useEffect(() => {
    const handleModeChange = (e: CustomEvent) => {
      setMode(e.detail);
    };
    const handleCorsBaseUrlChange = (e: CustomEvent) => {
      setCorsBaseUrl(e.detail || "");
    };
    window.addEventListener(
      "app_mode_change",
      handleModeChange as EventListener,
    );
    window.addEventListener(
      "cors_base_url_change",
      handleCorsBaseUrlChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "app_mode_change",
        handleModeChange as EventListener,
      );
      window.removeEventListener(
        "cors_base_url_change",
        handleCorsBaseUrlChange as EventListener,
      );
    };
  }, []);

  const handleApiProfileChange = (profile: ApiProfile) => {
    if (profile === apiProfile) return;
    env.setApiProfile(profile);
    setApiProfile(profile);
    if (
      confirm(
        "切换图像服务器模式后需要刷新页面，是否立即刷新？",
      )
    ) {
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-8 border border-border bg-card mt-8">
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium">
          SYSTEM CONFIGURATION
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage detection parameters and device settings
        </p>
      </div>

      {/* API 模式切换 */}
      <ModeSwitch />

      <div className="space-y-4">
        {mode === "cors" && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  CORS / 跨域地址
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  输入远程服务器地址，自动追加 /api
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-sm focus:outline-none focus:border-primary"
                value={corsBaseUrl}
                onChange={(event) =>
                  setCorsBaseUrl(event.target.value)
                }
                onBlur={() => env.setCorsBaseUrl(corsBaseUrl)}
                placeholder="http://9qwygl8e.zjz-service.cn:80"
              />
              <button
                type="button"
                className="px-3 py-2 text-xs border border-border rounded-sm hover:bg-accent transition-colors"
                onClick={() => env.setCorsBaseUrl(corsBaseUrl)}
              >
                应用
              </button>
            </div>
          </div>
        )}
        {mode === "production" && apiNodes.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  LINE / 产线切换
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  选择产线后将通过 /产线/api 访问后端
                </div>
              </div>
            </div>
            <select
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-sm focus:outline-none focus:border-primary"
              value={lineName || ""}
              onChange={(event) => onLineChange(event.target.value)}
            >
              {apiNodes.map((node) => (
                <option key={node.key} value={node.key}>
                  {node.name} ({node.key})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 图像服务器模式：标准 / SMALL 实例（仅生产模式显示） */}
        {mode === "production" && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  IMAGE SERVER / 图像模式
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  在标准 16K 2D 与 8K SMALL 图像服务实例之间切换
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() =>
                  handleApiProfileChange("default")
                }
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs rounded-lg border-2 transition-colors ${
                  apiProfile === "default"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-xs font-semibold">
                      FULL
                    </div>
                    <div className="text-[10px] opacity-70">
                      16K 数据 / 原始 2D
                    </div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleApiProfileChange("small")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs rounded-lg border-2 transition-colors ${
                  apiProfile === "small"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Minimize2 className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-xs font-semibold">
                      SMALL
                    </div>
                    <div className="text-[10px] opacity-70">
                      8K 数据 / 精简图像
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="text-[11px] text-muted-foreground/80 mt-1">
              当前将通过
              <span className="font-mono px-1">
                {apiProfile === "small" ? "/small-api" : "/api"}
              </span>
              访问图像接口。切换后需要刷新页面以完全生效。
            </div>
          </div>
        )}

        {/* 主题设置 */}
        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            THEME / 主题
          </label>
          <div className="flex items-center gap-2 bg-background border border-border rounded-sm p-1">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                theme === "light"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              LIGHT
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                theme === "dark"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              DARK
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            IMAGE ORIENTATION / 图像方向
          </label>
          <div className="flex items-center gap-2 bg-background border border-border rounded-sm p-1">
            <button
              onClick={() => setImageOrientation("horizontal")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                imageOrientation === "horizontal"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
              横向
            </button>
            <button
              onClick={() => setImageOrientation("vertical")}
              className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                imageOrientation === "vertical"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              纵向
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            DETECTION THRESHOLD
          </label>
          <input
            type="range"
            className="w-full accent-primary"
          />
        </div>
        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            CAMERA EXPOSURE
          </label>
          <input
            type="range"
            className="w-full accent-primary"
          />
        </div>
        <div className="grid grid-cols-2 items-center gap-4">
          <label className="text-sm font-medium">
            AUTO-ARCHIVE LOGS
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked
              readOnly
              className="accent-primary w-4 h-4"
            />
            <span className="text-sm text-muted-foreground">
              ENABLED
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex justify-end gap-2">
        <button className="px-4 py-2 border border-border hover:bg-accent text-sm transition-colors">
          RESET
        </button>
        <button className="px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
          SAVE CHANGES
        </button>
      </div>
    </div>
  );
};
