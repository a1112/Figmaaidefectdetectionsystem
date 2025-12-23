import {
  Menu,
  Maximize2,
  Minus,
  X,
  Scan,
  Activity,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Images,
  BarChart3,
  Settings,
  Database,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import type {
  ActiveTab,
  SurfaceFilter,
  SteelPlate,
} from "../../types/app.types";

import { useState } from "react";
import { LoginModal } from "../auth/LoginModal";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User as UserIcon, LogOut, LogIn } from "lucide-react";
import { DataSourceModal } from "../modals/DataSourceModal";
import type { ApiNode } from "../../src/api/types";

interface TitleBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  filteredSteelPlates: SteelPlate[];
  selectedPlateId: string | null;
  setSelectedPlateId: (id: string | null) => void;
  surfaceFilter: SurfaceFilter;
  setSurfaceFilter: (filter: SurfaceFilter) => void;
  setShowPlatesPanel: (show: boolean) => void;
  setIsDiagnosticDialogOpen: (open: boolean) => void;
  diagnosticButtonRef: React.RefObject<HTMLButtonElement>;
  lineName?: string;
  apiNodes: ApiNode[];
  onLineChange: (name: string) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  filteredSteelPlates,
  selectedPlateId,
  setSelectedPlateId,
  surfaceFilter,
  setSurfaceFilter,
  setShowPlatesPanel,
  setIsDiagnosticDialogOpen,
  diagnosticButtonRef,
  lineName,
  apiNodes,
  onLineChange,
}) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>({
    name: "Admin",
    role: "操作员",
  });

  const handlePrevPlate = () => {
    if (filteredSteelPlates.length === 0) return;
    const currentIndex = filteredSteelPlates.findIndex(
      (p) => p.plateId === selectedPlateId,
    );
    const prevIndex =
      currentIndex > 0
        ? currentIndex - 1
        : filteredSteelPlates.length - 1;
    const prevPlate = filteredSteelPlates[prevIndex];
    if (prevPlate) setSelectedPlateId(prevPlate.plateId);
  };

  const handleNextPlate = () => {
    if (filteredSteelPlates.length === 0) return;
    const currentIndex = filteredSteelPlates.findIndex(
      (p) => p.plateId === selectedPlateId,
    );
    const nextIndex =
      currentIndex < filteredSteelPlates.length - 1
        ? currentIndex + 1
        : 0;
    const nextPlate = filteredSteelPlates[nextIndex];
    if (nextPlate) setSelectedPlateId(nextPlate.plateId);
  };

  const currentPlateId = (() => {
    const currentPlate =
      filteredSteelPlates.find(
        (p) => p.plateId === selectedPlateId,
      ) || filteredSteelPlates[0];
    return currentPlate?.plateId || "-";
  })();

  return (
    <div className="h-10 bg-muted border-b border-border flex items-center justify-between px-4 select-none shrink-0">
      {/* Left: Menu and Tab Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() =>
            setIsSidebarCollapsed(!isSidebarCollapsed)
          }
          className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
          title={isSidebarCollapsed ? "展开侧栏" : "折叠侧栏"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors focus:outline-none outline-none">
              <Menu className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 bg-card border-border text-foreground"
          >
            <DropdownMenuLabel>主菜单</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => window.location.reload()}
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
            >
              网页刷新
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
            >
              文件
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
            >
              视图
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
            >
              检测
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setActiveTab("mockdata");
                setShowPlatesPanel(false);
              }}
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs flex items-center gap-2"
            >
              <Database className="w-3.5 h-3.5" />
              测试数据编辑器
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
            >
              窗口
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
            >
              帮助
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-border mx-1"></div>

        {/* Tab Buttons - 缺陷/图像 */}
        <button
          onClick={() => setActiveTab("defects")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors rounded-sm ${
            activeTab === "defects"
              ? "bg-primary/90 text-primary-foreground border border-primary/50"
              : "bg-muted/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-border"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          缺陷
        </button>

        <button
          onClick={() => setActiveTab("images")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors rounded-sm ${
            activeTab === "images"
              ? "bg-primary/90 text-primary-foreground border border-primary/50"
              : "bg-muted/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-border"
          }`}
        >
          <Images className="w-3.5 h-3.5" />
          图像
        </button>
      </div>

      {/* Center: App Title - 仅在桌面大屏显示 */}
      <div className="hidden xl:flex items-center gap-2 flex-1 justify-center px-4">
        <Scan className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium tracking-wider">
          {lineName || "STEEL-EYE PRO v2.0.1"}
        </span>
      </div>

      {/* Right: Status and Window Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* 钢板导航 */}
        {filteredSteelPlates.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-background/50 border border-border rounded">
            <button
              onClick={handlePrevPlate}
              className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
              title="上一块钢板"
              disabled={filteredSteelPlates.length === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-foreground px-1">
              {currentPlateId}
            </span>
            <button
              onClick={handleNextPlate}
              className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
              title="下一块钢板"
              disabled={filteredSteelPlates.length === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 px-3 py-1 bg-background/50 border border-border rounded text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          SYSTEM READY
        </div>

        {/* 表面切换 - 缺陷和图像界面都显示 */}
        {(activeTab === "defects" ||
          activeTab === "images") && (
          <div className="flex items-center gap-1 bg-background/50 border border-border rounded-sm p-0.5">
            <button
              onClick={() => setSurfaceFilter("top")}
              className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                surfaceFilter === "top"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              上表
            </button>
            <button
              onClick={() => setSurfaceFilter("bottom")}
              className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                surfaceFilter === "bottom"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              下表
            </button>
            <button
              onClick={() => setSurfaceFilter("all")}
              className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                surfaceFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              全部
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* 功能按钮 */}
          <button
            onClick={() => {
              setActiveTab("reports");
              setShowPlatesPanel(false);
            }}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="报表"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            ref={diagnosticButtonRef}
            onClick={() => setIsDiagnosticDialogOpen(true)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="监控诊断"
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setActiveTab("settings");
              setShowPlatesPanel(false);
            }}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="系统设置"
          >
            <Settings className="w-4 h-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-9999 p-0 shadow-sm shadow-black/30 focus:outline-none">
                <Avatar className="h-8 w-8 shrink-0 rounded-9999 avatar-hover-ring transition-all cursor-pointer">
                  <AvatarImage src="" alt="@user" />
                  <AvatarFallback className="bg-primary/10 text-primary leading-none text-center rounded-9999">
                    {currentUser ? currentUser.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-9999 border-2 border-primary/50 ${currentUser ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border text-foreground">
              <DropdownMenuLabel>
                {currentUser ? (
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{currentUser.role}</p>
                  </div>
                ) : (
                  "未登录"
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={() => { setActiveTab("settings"); setShowPlatesPanel(false); }}
                className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>用户设置</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDataSourceOpen(true)}
                className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
              >
                <Database className="mr-2 h-4 w-4" />
                <span>切换数据源</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {currentUser ? (
                <DropdownMenuItem 
                  onClick={() => setCurrentUser(null)}
                  className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-red-500 focus:text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={() => setIsLoginOpen(true)}
                  className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  <span>登录</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <LoginModal 
            isOpen={isLoginOpen} 
            onClose={() => setIsLoginOpen(false)}
            onLogin={(name) => setCurrentUser({ name, role: "操作员" })} 
          />
          <DataSourceModal
            isOpen={isDataSourceOpen}
            onClose={() => setIsDataSourceOpen(false)}
            nodes={apiNodes}
            currentLineName={lineName || ""}
            onConfirm={(name) => onLineChange(name)}
          />

          <div className="w-px h-4 bg-border mx-1 hidden"></div>

          {/* 窗口控制按钮 - 仅桌面版本显示 */}
          <div className="hidden">
            <button className="p-1.5 hover:bg-white/10 rounded">
              <Minus className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-red-500/80 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
