import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { 
  Settings, 
  Monitor, 
  Layers, 
  Palette, 
  ArrowUpDown, 
  RotateCw,
  Keyboard,
  Info
} from "lucide-react";
import type { ImageOrientation } from "../types/app.types";

interface ModernSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageOrientation: ImageOrientation;
  setImageOrientation: (orientation: ImageOrientation) => void;
  showDistributionImages: boolean;
  setShowDistributionImages: (show: boolean) => void;
  showTileBorders: boolean;
  setShowTileBorders: (show: boolean) => void;
}

export function ModernSettingsModal({
  isOpen,
  onClose,
  imageOrientation,
  setImageOrientation,
  showDistributionImages,
  setShowDistributionImages,
  showTileBorders,
  setShowTileBorders,
}: ModernSettingsModalProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<"ui" | "shortcuts" | "about">("ui");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card/80 backdrop-blur-xl border-border shadow-2xl p-0 overflow-hidden">
        <div className="flex h-[480px]">
          {/* Sidebar */}
          <div className="w-40 bg-muted/40 border-r border-border p-3 flex flex-col gap-1">
            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              系统配置
            </div>
            <button 
              onClick={() => setActiveSubTab("ui")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === "ui" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              显示与界面
            </button>
            <button 
              onClick={() => setActiveSubTab("shortcuts")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === "shortcuts" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              快捷键说明
            </button>
            <button 
              onClick={() => setActiveSubTab("about")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === "about" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              关于系统
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {activeSubTab === "ui" && (
              <>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5 text-primary" />
                    显示与界面设置
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    配置仪表盘图像显示偏好与交互风格。
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
                  {/* Image Orientation Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      图像排版方向
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setImageOrientation("horizontal")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          imageOrientation === "horizontal"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="w-12 h-8 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
                          <div className="w-8 h-4 bg-muted-foreground/20 rounded-sm" />
                        </div>
                        <span className="text-xs font-bold">水平排列</span>
                        <span className="text-[10px] text-muted-foreground">适合宽屏显示器</span>
                      </button>
                      <button
                        onClick={() => setImageOrientation("vertical")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          imageOrientation === "vertical"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="w-8 h-12 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
                          <div className="w-4 h-8 bg-muted-foreground/20 rounded-sm" />
                        </div>
                        <span className="text-xs font-bold">垂直排列</span>
                        <span className="text-[10px] text-muted-foreground">适合移动端或纵向分屏</span>
                      </button>
                    </div>
                  </div>

                  {/* Distribution Map Images Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5" />
                      分布图显示
                    </div>
                    <div className="grid gap-2">
                      <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold">显示瓦片图像</span>
                          <span className="text-[10px] text-muted-foreground">在缺陷分布图中加载并显示钢板表面图像</span>
                        </div>
                        <button
                          onClick={() => setShowDistributionImages(!showDistributionImages)}
                          className={`w-8 h-4 rounded-full relative transition-colors ${
                            showDistributionImages ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        >
                          <div 
                            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                              showDistributionImages ? "right-0.5" : "left-0.5"
                            }`} 
                          />
                        </button>
                      </div>

                      <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold">显示瓦片轮廓</span>
                          <span className="text-[10px] text-muted-foreground">瓦片加载器调试：显示瓦片边缘及整体轮廓</span>
                        </div>
                        <button
                          onClick={() => setShowTileBorders(!showTileBorders)}
                          className={`w-8 h-4 rounded-full relative transition-colors ${
                            showTileBorders ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        >
                          <div 
                            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                              showTileBorders ? "right-0.5" : "left-0.5"
                            }`} 
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Theme Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <Palette className="w-3.5 h-3.5" />
                      视觉主题
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold">深色工业风</span>
                        <span className="text-[10px] text-muted-foreground">默认深色界面（不可修改）</span>
                      </div>
                      <div className="w-8 h-4 bg-primary rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSubTab === "shortcuts" && (
              <>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Keyboard className="w-5 h-5 text-primary" />
                    全局快捷键
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    系统内置快捷键，提升生产环境操作效率。
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
                  <div className="space-y-2">
                    {[
                      { key: "Q / E", desc: "切换上一卷 / 下一卷" },
                      { key: "T", desc: "跳转至最新数据" },
                      { key: "Tab", desc: "切换 缺陷/图像 视图" },
                      { key: "Esc", desc: "关闭当前弹窗/浮层" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded border border-border bg-muted/20">
                        <span className="text-xs text-muted-foreground">{item.desc}</span>
                        <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold text-primary">
                          {item.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-yellow-500 mt-0.5" />
                      <p className="text-[10px] text-yellow-500/80 leading-relaxed">
                        安全提示：当输入框（如搜索、代理地址）处于聚焦状态时，系统将自动暂时禁用快捷键逻辑，以防文本输入与控制冲突。
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSubTab === "about" && (
              <>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Info className="w-5 h-5 text-primary" />
                    关于系统
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    STEEL-EYE PRO 钢板缺陷检测系统。
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 p-6 pt-0 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                    <Layers className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-sm font-bold">STEEL-EYE PRO</div>
                  <div className="text-[10px] text-muted-foreground font-mono">v2.0.1 (Stable Build)</div>
                  <div className="text-[10px] text-muted-foreground mt-4 max-w-[200px]">
                    © 2026 Industrial Inspection Systems Ltd. All rights reserved.
                  </div>
                </div>
              </>
            )}

            <div className="p-4 bg-muted/20 border-t border-border flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                取消
              </Button>
              <Button size="sm" onClick={onClose}>
                保存更改
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
