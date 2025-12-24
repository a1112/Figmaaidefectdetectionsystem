import { useState, useEffect, useRef, useCallback } from "react";
import { DefectReport } from "./components/DefectReport";
import {
  SearchDialog,
  SearchCriteria,
} from "./components/SearchDialog";
import {
  FilterDialog,
  FilterCriteria,
} from "./components/FilterDialog";
import { SystemDiagnosticDialog } from "./components/SystemDiagnosticDialog";
// 引入 API 客户端和环境配置
import { env } from "./src/config/env";
import {
  listSteels,
  searchSteels,
  getDefectsRaw,
  getTileImageUrl,
  getGlobalMeta,
  getSteelMeta,
  getApiList,
} from "./src/api/client";
import type {
  SteelItem,
  DefectItem,
  SurfaceImageInfo,
  ApiNode,
} from "./src/api/types";
import type {
  Defect,
  DetectionRecord,
  SteelPlate,
  ImageOrientation,
} from "./types/app.types";
import {
  defectTypes,
  defectColors,
  defectAccentColors,
  generateRandomDefects,
} from "./utils/defects";
import {
  Settings,
  Activity,
  Server,
  Wifi,
  BarChart3,
} from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner@2.0.3";
import { TitleBar } from "./components/layout/TitleBar";
import { MobileNavBar } from "./components/layout/MobileNavBar";
import { Sidebar } from "./components/layout/Sidebar";
import { SettingsPage } from "./components/pages/SettingsPage";
import { DefectsPage } from "./components/pages/DefectsPage";
import { MockDataEditorPage } from "./components/pages/MockDataEditorPage";
import { DefectToolbar } from "./pages/DefectToolbar";
import type { AppTab } from "./pages/DefectToolbar";
import { PlateOverlayPanel } from "./pages/PlateOverlayPanel";
import { PlatesTab } from "./pages/PlatesTab";
import { ImagesTab } from "./pages/ImagesTab";

// 简单的瓦片图像缓存，避免重复加载同一瓦片

export default function App() {
  const [history, setHistory] = useState<DetectionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>("defects");
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(true);
  const [showPlatesPanel, setShowPlatesPanel] = useState(false); // 手机模式：是否显示钢板面板
  const [selectedPlateId, setSelectedPlateId] = useState<
    string | null
  >(null);
  const [surfaceFilter, setSurfaceFilter] = useState<
    "all" | "top" | "bottom"
  >("all");
  const [plateDefects, setPlateDefects] = useState<Defect[]>(
    [],
  ); // 当前选中钢板的缺陷
  
  const [selectedDefectId, setSelectedDefectId] = useState<
    string | null
  >(null); // 选中的缺陷ID
  const [imageViewMode, setImageViewMode] = useState<
    "full" | "single"
  >("full"); // 图像显示模式：大图/单缺陷
  const [imageOrientation, setImageOrientation] =
    useState<ImageOrientation>(() => {
      if (typeof window === "undefined") {
        return "horizontal";
      }
      const stored = window.localStorage.getItem(
        "image_orientation",
      );
      return stored === "vertical" ? "vertical" : "horizontal";
    });
  const handleImageOrientationChange = (
    next: ImageOrientation,
  ) => {
    setImageOrientation(next);
    try {
      window.localStorage.setItem("image_orientation", next);
    } catch {
      // ignore persisted preference errors
    }
  };
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [manualConfirmStatus, setManualConfirmStatus] =
    useState<
      "unprocessed" | "ignore" | "A" | "B" | "C" | "D" | null
    >(null); // 人工确认状态
  const [isSearchDialogOpen, setIsSearchDialogOpen] =
    useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] =
    useState(false);
  const [isDiagnosticDialogOpen, setIsDiagnosticDialogOpen] =
    useState(false);
  const [searchCriteria, setSearchCriteria] =
    useState<SearchCriteria>({});
  const [filterCriteria, setFilterCriteria] =
    useState<FilterCriteria>({ levels: [] });
  const [availableDefectTypes, setAvailableDefectTypes] =
    useState<string[]>(defectTypes);
  const [defectColorMap] = useState(defectColors);
  const [defectAccentMap, setDefectAccentMap] = useState(
    defectAccentColors,
  );
  const [steelLimit] = useState<number>(50);
  const [searchLimit] = useState<number>(200);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const diagnosticButtonRef = useRef<HTMLButtonElement>(null);
  const [startupReady, setStartupReady] = useState(true);
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([]);
  const [activeLineKey, setActiveLineKey] = useState(env.getLineName());

  // 图像标签页：选中的历史记录

  // 移动设备侧边栏状态
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // 图像 Tab：瓦片 LOD 双层控制
  const [preferredTileLevel, setPreferredTileLevel] =
    useState(0);
  const [activeTileLevel, setActiveTileLevel] = useState(0);
  const [defaultTileSize, setDefaultTileSize] = useState(0);
  const [maxTileLevel, setMaxTileLevel] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => {
      setActiveTileLevel(preferredTileLevel);
    }, 200);
    return () => clearTimeout(id);
  }, [preferredTileLevel]);

  // 检测移动设备
  useEffect(() => {
    const checkMobileDevice = () => {
      setIsMobileDevice(window.innerWidth < 768);
    };

    checkMobileDevice();
    window.addEventListener("resize", checkMobileDevice);
    return () =>
      window.removeEventListener("resize", checkMobileDevice);
  }, []);

  // 应用主题到 document.documentElement
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // 启动时健康检查：若后端可连通，则默认切到 生产模式 + SMALL + 纵向
  // 仅在用户未持久化保存 mode/api_profile 时自动初始化，避免覆盖用户选择
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedMode = window.localStorage.getItem("app_mode");
      const storedProfile =
        window.localStorage.getItem("api_profile");
      const storedOrientation = window.localStorage.getItem(
        "image_orientation",
      );

      if (storedMode || storedProfile) {
        if (!cancelled) setStartupReady(true);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => {
          controller.abort();
        }, 5000);

        const response = await fetch("/api/health", {
          signal: controller.signal,
          cache: "no-store",
        });
        window.clearTimeout(timeoutId);

        if (response.ok) {
          let isHealthy = true;
          try {
            const payload = await response.json();
            if (payload && typeof payload.status === "string") {
              isHealthy =
                payload.status === "healthy" ||
                payload.status === "ok";
            }
          } catch {
            // ignore non-json health payload
          }

          if (isHealthy) {
            env.setMode("production");
            env.setApiProfile("small");
            if (!storedOrientation) {
              handleImageOrientationChange("vertical");
            }
          }
        }
      } catch {
        // backend unavailable; keep defaults
      } finally {
        if (!cancelled) setStartupReady(true);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyApiNodes = useCallback((nodes: ApiNode[]) => {
    setApiNodes(nodes);
    if (nodes.length === 0) {
      return;
    }
    const current = env.getLineName();
    const keys = nodes.map((node) => node.key);
    if (!current || !keys.includes(current)) {
      env.setLineName(nodes[0].key);
      setActiveLineKey(nodes[0].key);
    } else {
      setActiveLineKey(current);
    }
  }, []);

  const refreshApiNodes = useCallback(async () => {
    if (!env.isProduction()) {
      setApiNodes([]);
      return;
    }
    try {
      const nodes = await getApiList();
      applyApiNodes(nodes);
    } catch (error) {
      console.warn("⚠️ 加载产线列表失败:", error);
    }
  }, [applyApiNodes]);

  useEffect(() => {
    if (!startupReady || !env.isProduction()) return;
    let cancelled = false;

    const loadApiNodes = async () => {
      try {
        const nodes = await getApiList();
        if (cancelled) return;
        applyApiNodes(nodes);
      } catch (error) {
        console.warn("⚠️ 加载产线列表失败:", error);
      }
    };

    const handleLineChange = (event: CustomEvent) => {
      setActiveLineKey(event.detail || "");
    };

    loadApiNodes();
    window.addEventListener("line_change", handleLineChange as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("line_change", handleLineChange as EventListener);
    };
  }, [startupReady, applyApiNodes]);

  const activeLineLabel =
    apiNodes.find((node) => node.key === activeLineKey)?.name || activeLineKey;

  useEffect(() => {
    if (activeLineLabel) {
      document.title = `${activeLineLabel} - Web Defect Detection`;
    } else {
      document.title = "Web Defect Detection";
    }
  }, [activeLineLabel]);

  // 加载全局 Meta（包含缺陷字典与瓦片配置），在页面刷新时调用一次
  useEffect(() => {
    if (!startupReady) return;
    let cancelled = false;
    const loadGlobalMeta = async () => {
      try {
        const res = await getGlobalMeta();
        if (cancelled) return;

        const defectPayload = res.defect_classes;
        const items = defectPayload?.items ?? [];

        const names = items
          .map(
            (item: any) => item.desc || item.name || item.tag,
          )
          .filter((name: any): name is string => Boolean(name));

        if (names.length > 0) {
          setAvailableDefectTypes(names);
          setSelectedDefectTypes((prev) => {
            const filtered = prev.filter((name) =>
              names.includes(name),
            );
            return filtered.length > 0 ? filtered : names;
          });
          const toHex = (num: number) =>
            num.toString(16).padStart(2, "0");
          const accentMap = { ...defectAccentColors };
          items.forEach((item: any) => {
            const key = item.desc || item.name || item.tag;
            if (!key) return;
            const { red, green, blue } = item.color;
            accentMap[key] =
              `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
          });
          setDefectAccentMap(accentMap);
        }

        // 目前 tile 配置仅由后端告知最大层级和默认瓦片尺寸，前端内部逻辑已保持一致。
        const nextDefaultTileSize = res?.tile?.default_tile_size;
        if (
          typeof nextDefaultTileSize === "number" &&
          Number.isFinite(nextDefaultTileSize) &&
          nextDefaultTileSize > 0
        ) {
          setDefaultTileSize(nextDefaultTileSize);
        }

        const nextMaxTileLevel = res?.tile?.max_level;
        if (
          typeof nextMaxTileLevel === "number" &&
          Number.isFinite(nextMaxTileLevel) &&
          nextMaxTileLevel >= 0
        ) {
          setMaxTileLevel(nextMaxTileLevel);
        }
      } catch (error) {
        console.warn("⚠️ 加载全局 Meta 失败:", error);
      }
    };

    loadGlobalMeta();

    // 监听模式切换事件，重新加载 Meta
    const handleModeChange = () => {
      console.log("🔄 检测到模式切换，重新加载全局 Meta...");
      loadGlobalMeta();
    };

    window.addEventListener("app_mode_change", handleModeChange);
    window.addEventListener("line_change", handleModeChange);

    return () => {
      cancelled = true;
      window.removeEventListener("app_mode_change", handleModeChange);
      window.removeEventListener("line_change", handleModeChange);
    };
  }, [startupReady]);

  // 缺陷类型过滤
  const [selectedDefectTypes, setSelectedDefectTypes] =
    useState<string[]>(defectTypes);
  const activeDefects = plateDefects;

  const handleToggleDefectType = (type: string) => {
    setSelectedDefectTypes((prev) =>
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type],
    );
  };

  const handleSelectAllDefectTypes = () => {
    setSelectedDefectTypes(availableDefectTypes);
  };

  const handleSelectNoneDefectTypes = () => {
    setSelectedDefectTypes([]);
  };

  const handleInverseDefectTypes = () => {
    setSelectedDefectTypes((prev) =>
      availableDefectTypes.filter((type) => !prev.includes(type)),
    );
  };

  // 钢板记录数据（从 API 或本地模拟数据加载）
  const [steelPlates, setSteelPlates] = useState<SteelPlate[]>(
    [],
  );
  const [isLoadingSteels, setIsLoadingSteels] = useState(false);
    const [surfaceImageInfo, setSurfaceImageInfo] = useState<
    SurfaceImageInfo[] | null
  >(null);

  // 加载钢板列表的函数（提取出来以便重用）
  const loadSteelPlates = async (
    criteria: SearchCriteria = searchCriteria,
    forceLimit?: number,
    forceSearch?: boolean,
  ) => {
    setIsLoadingSteels(true);

    try {
      const hasCriteria = Object.keys(criteria).length > 0;
      const limitToUse = Math.max(
        1,
        Math.min(
          forceLimit ??
            (hasCriteria ? searchLimit : steelLimit),
          200,
        ),
      );
      const params = {
        limit: limitToUse,
        serialNumber: criteria.serialNumber,
        plateId: criteria.plateId,
        dateFrom: criteria.dateFrom,
        dateTo: criteria.dateTo,
      };

      const applyCriteriaFilter = (items: SteelItem[]) =>
        hasCriteria
          ? items.filter((item) => {
              if (
                criteria.serialNumber &&
                !item.serialNumber.includes(
                  criteria.serialNumber,
                )
              ) {
                return false;
              }
              if (
                criteria.plateId &&
                !item.plateId.includes(criteria.plateId)
              ) {
                return false;
              }
              if (
                criteria.dateFrom &&
                item.timestamp < new Date(criteria.dateFrom)
              ) {
                return false;
              }
              if (
                criteria.dateTo &&
                item.timestamp > new Date(criteria.dateTo)
              ) {
                return false;
              }
              return true;
            })
          : items;

      let items: SteelItem[];
      const shouldSearch =
        env.isProduction() && (hasCriteria || forceSearch);
      if (shouldSearch) {
        try {
          items = await searchSteels(params);
        } catch (err) {
          console.warn(
            "⚠️ 查询接口不可用，回退到列表接口并前端过滤",
            err,
          );
          const fallback = await listSteels(limitToUse);
          items = applyCriteriaFilter(fallback);
        }
      } else {
        const fallback = await listSteels(limitToUse);
        items = applyCriteriaFilter(fallback);
      }

      // 将 API 返回的 SteelItem 转换为 SteelPlate 格式
      const mapped: SteelPlate[] = items.map((item) => ({
        serialNumber: item.serialNumber,
        plateId: item.plateId,
        steelGrade: item.steelGrade,
        dimensions: item.dimensions,
        timestamp: item.timestamp,
        level: item.level,
        defectCount: item.defectCount,
      }));

      setSteelPlates(mapped);
      const hasSelection =
        selectedPlateId &&
        mapped.some((p) => p.serialNumber === selectedPlateId);
      if (hasCriteria || forceSearch) {
        setSelectedPlateId(
          mapped.length > 0 ? mapped[0].serialNumber : null,
        );
      } else if (!hasSelection) {
        setSelectedPlateId(
          mapped.length > 0 ? mapped[0].serialNumber : null,
        );
      }
      console.log(
        `✅ 成功加载 ${mapped.length} 条钢板记录 (${env.getMode()} 模式)`,
      );

      // 🔧 开发模式：自动选择第一个钢板并初始化历史记录
      if (
        env.isDevelopment() &&
        mapped.length > 0 &&
        !selectedPlateId
      ) {
        const firstPlate = mapped[0];
        setSelectedPlateId(firstPlate.serialNumber);
        console.log(
          `🎯 开发模式：自动选择钢板 ${firstPlate.plateId}`,
        );

        // 如果 history 为空，为前几个钢板创建模拟历史记录
        if (history.length === 0) {
          const mockHistory = mapped
            .slice(0, 5)
            .map((plate, index) => {
              const defects = generateRandomDefects();
              const status =
                defects.length === 0
                  ? "pass"
                  : defects.some((d) => d.severity === "high")
                    ? "fail"
                    : "warning";

              return {
                id: `${plate.plateId}-${Date.now() - index * 1000}`,
                defectImageUrl: `https://images.unsplash.com/photo-1755377205509-866d6e727ee6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400`,
                fullImageUrl: `https://images.unsplash.com/photo-1755377205509-866d6e727ee6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200`,
                timestamp: new Date(
                  Date.now() - index * 3600000,
                ),
                defects,
                status,
              } as DetectionRecord;
            });

          setHistory(mockHistory);
          console.log(
            `🎨 开发模式：初始化 ${mockHistory.length} 条模拟历史记录`,
          );
        }
      }
    } catch (error) {
      console.error("❌ 加载钢板列表失败:", error);
      // 不再使用全屏错误提示，改用 Toast
      const errMsg = error instanceof Error ? error.message : "加载失败";
      
      // 仅在生产模式下提示连接失败
      if (env.isProduction()) {
        toast.error("无法连接到后端服务器", {
            description: errMsg,
            action: {
                label: "切回开发模式",
                onClick: () => env.setMode("development"),
            },
            duration: 5000,
        });
        setSteelPlates([]);
      }
    } finally {
      setIsLoadingSteels(false);
    }
  };

  // 查询&刷新封装
  const handleSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    const hasCriteria = Object.keys(criteria).length > 0;
    loadSteelPlates(
      criteria,
      hasCriteria ? searchLimit : steelLimit,
      true,
    );
  };


  // 初始加载钢板列表
  useEffect(() => {
    if (!startupReady) return;
    loadSteelPlates();

    // 监听模式切换事件，重新加载数据
    const handleModeChange = () => {
      console.log("🔄 检测到模式切换，重新加载钢板列表...");
      loadSteelPlates();
    };

    window.addEventListener(
      "app_mode_change",
      handleModeChange,
    );
    window.addEventListener("line_change", handleModeChange);
    return () => {
      window.removeEventListener(
        "app_mode_change",
        handleModeChange,
      );
      window.removeEventListener(
        "line_change",
        handleModeChange,
      );
    };
  }, [startupReady]);

  // 列表仅应用筛选条件（查询结果已由服务端决定）
  const filteredSteelPlates = steelPlates.filter((plate) => {
    if (
      filterCriteria.levels.length > 0 &&
      !filterCriteria.levels.includes(plate.level)
    ) {
      return false;
    }
    if (
      filterCriteria.defectCountMin !== undefined &&
      plate.defectCount < filterCriteria.defectCountMin
    ) {
      return false;
    }
    if (
      filterCriteria.defectCountMax !== undefined &&
      plate.defectCount > filterCriteria.defectCountMax
    ) {
      return false;
    }
    return true;
  });

  // 当选中钢板时，加载该钢板的缺陷数据
  useEffect(() => {
    if (!selectedPlateId) {
      setPlateDefects([]);
      setSurfaceImageInfo(null);
      return;
    }

    const loadPlateDefects = async () => {

      try {
        // 从 plateId 中提取 seq_no（去除前导零）
        const selectedPlate = steelPlates.find(
          (p) => p.serialNumber === selectedPlateId,
        );
        if (!selectedPlate) {
          console.warn("未找到选中的钢板:", selectedPlateId);
          setPlateDefects([]);
          setSelectedPlateId(null);
          return;
        }

        const seqNo = parseInt(selectedPlate.serialNumber, 10);
        console.log(
          `🔍 加载钢板 ${selectedPlateId} (seq_no: ${seqNo}) 的缺陷数据...`,
        );

        const response = await getDefectsRaw(seqNo);
        const defectItems: DefectItem[] = response.defects.map(
          (item) => ({
            id: item.defect_id,
            type: item.defect_type as any,
            severity: item.severity,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            confidence: item.confidence,
            surface: item.surface,
            imageIndex: item.image_index,
          }),
        );

        // 将 DefectItem 转换为 Defect 格式
        const mapped: Defect[] = defectItems.map((item) => ({
          id: item.id,
          type: item.type,
          severity: item.severity,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          confidence: item.confidence,
          surface: item.surface,
          imageIndex: item.imageIndex,
        }));

        setPlateDefects(mapped);

        try {
          const steelMeta = await getSteelMeta(seqNo);
          setSurfaceImageInfo(steelMeta.surface_images ?? null);
        } catch (metaError) {
          console.warn("⚠️ 加载钢板图像元信息失败:", metaError);
          setSurfaceImageInfo(null);
        }
        console.log(
          `✅ 成功加载 ${mapped.length} 个缺陷 (${env.getMode()} 模式)`,
        );
      } catch (error) {
        console.error("❌ 加载缺陷数据失败:", error);
        setPlateDefects([]);
        setSurfaceImageInfo(null);
      } finally {
      }
    };

    loadPlateDefects();
  }, [selectedPlateId, steelPlates, defaultTileSize]);

  // 预取前后卷的缺陷数据和首块瓦片，以加速分布图加载
  useEffect(() => {
    if (activeTab !== "defects") {
      return;
    }
    if (!selectedPlateId || steelPlates.length === 0) {
      return;
    }

    const index = steelPlates.findIndex(
      (p) => p.serialNumber === selectedPlateId,
    );
    if (index === -1) {
      return;
    }

    const neighbors: SteelPlate[] = [];
    if (index > 0) {
      neighbors.push(steelPlates[index - 1]);
    }
    if (index < steelPlates.length - 1) {
      neighbors.push(steelPlates[index + 1]);
    }

    neighbors.forEach((plate) => {
      const seqNo = parseInt(plate.serialNumber, 10);
      getSteelMeta(seqNo)
        .then((meta) => {
          const metas = meta.surface_images ?? [];
          metas.forEach((surfaceMeta) => {
            const tileSize =
              defaultTileSize ||
              surfaceMeta.image_height ||
              512;
            const url = getTileImageUrl({
              surface: surfaceMeta.surface,
              seqNo,
              level: 0,
              tileX: 0,
              tileY: 0,
              tileSize,
            });
            const img = new Image();
            img.src = url;
          });
        })
        .catch(() => {
          // 预取失败忽略，不影响主流程
        });
    });
  }, [activeTab, selectedPlateId, steelPlates]);


  // 生成缺陷统计数据
  const getDefectStats = () => {
    const stats: { [key: string]: number } = {};

    availableDefectTypes.forEach((type) => {
      stats[type] = 0;
    });

    history.forEach((record) => {
      record.defects.forEach((defect) => {
        if (stats[defect.type] !== undefined) {
          stats[defect.type]++;
        }
      });
    });

    return availableDefectTypes.map((type) => ({
      type,
      count: stats[type] || Math.floor(Math.random() * 20) + 5, // 如果没有数据,使用模拟数据
    }));
  };

  return (
    <div
      className={`h-screen w-full bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary selection:text-primary-foreground font-mono ${theme === "dark" ? "dark" : ""}`}
    >
      {/* Custom Window Title Bar - 仅桌面端显示 */}
      {!isMobileDevice && (
        <TitleBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          filteredSteelPlates={filteredSteelPlates}
          selectedPlateId={selectedPlateId}
          setSelectedPlateId={setSelectedPlateId}
          surfaceFilter={surfaceFilter}
          setSurfaceFilter={setSurfaceFilter}
          setShowPlatesPanel={setShowPlatesPanel}
          setIsDiagnosticDialogOpen={setIsDiagnosticDialogOpen}
          diagnosticButtonRef={diagnosticButtonRef}
          lineName={activeLineLabel}
          apiNodes={apiNodes}
          onLineChange={(key) => env.setLineName(key)}
          onRefreshApiNodes={refreshApiNodes}
        />
      )}

      {/* 手机模式：顶部导航栏 */}
      {isMobileDevice && !showPlatesPanel && (
        <MobileNavBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filteredSteelPlates={filteredSteelPlates}
          selectedPlateId={selectedPlateId}
          setSelectedPlateId={setSelectedPlateId}
          surfaceFilter={surfaceFilter}
          setSurfaceFilter={setSurfaceFilter}
          setShowPlatesPanel={setShowPlatesPanel}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - 仅桌面端显示 */}
        <div
          className={`${isMobileDevice ? "hidden" : isSidebarCollapsed ? "w-0" : "w-64"} bg-muted/30 border-r border-border flex flex-col shrink-0 transition-all duration-300 overflow-hidden`}
        >
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            filteredSteelPlates={filteredSteelPlates}
            steelPlates={steelPlates}
            selectedPlateId={selectedPlateId}
            setSelectedPlateId={setSelectedPlateId}
            isLoadingSteels={isLoadingSteels}
            searchCriteria={searchCriteria}
            setSearchCriteria={setSearchCriteria}
            filterCriteria={filterCriteria}
            setFilterCriteria={setFilterCriteria}
            setIsSearchDialogOpen={setIsSearchDialogOpen}
            setIsFilterDialogOpen={setIsFilterDialogOpen}
            searchButtonRef={searchButtonRef}
            filterButtonRef={filterButtonRef}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-background/50 flex flex-col min-w-0 overflow-hidden">
          <DefectToolbar
            activeTab={activeTab}
            availableDefectTypes={availableDefectTypes}
            selectedDefectTypes={selectedDefectTypes}
            activeDefects={activeDefects}
            defectAccentMap={defectAccentMap}
            onToggleDefectType={handleToggleDefectType}
            onSelectAll={handleSelectAllDefectTypes}
            onSelectNone={handleSelectNoneDefectTypes}
            onSelectInverse={handleInverseDefectTypes}
          />

          {/* Scrollable Content */}
          <div
            className="flex-1 min-h-0 overflow-auto p-[2px]"
          >
            {showPlatesPanel ? (
              <PlateOverlayPanel
                isMobileDevice={isMobileDevice}
                searchCriteria={searchCriteria}
                setSearchCriteria={setSearchCriteria}
                filterCriteria={filterCriteria}
                setFilterCriteria={setFilterCriteria}
                filteredSteelPlates={filteredSteelPlates}
                selectedPlateId={selectedPlateId}
                setSelectedPlateId={setSelectedPlateId}
                setIsSearchDialogOpen={setIsSearchDialogOpen}
                setIsFilterDialogOpen={setIsFilterDialogOpen}
                setShowPlatesPanel={setShowPlatesPanel}
              />
            ) : (
              <>
                {activeTab === "images" && (
                  <ImagesTab
                    selectedPlateId={selectedPlateId}
                    steelPlates={steelPlates}
                    surfaceImageInfo={surfaceImageInfo}
                    surfaceFilter={surfaceFilter}
                    imageOrientation={imageOrientation}
                    plateDefects={plateDefects}
                    selectedDefectId={selectedDefectId}
                    activeTileLevel={activeTileLevel}
                    onPreferredLevelChange={setPreferredTileLevel}
                    defaultTileSize={defaultTileSize}
                    maxTileLevel={maxTileLevel}
                  />
                )}

                {activeTab === "defects" && (
                  <DefectsPage
                    isMobileDevice={isMobileDevice}
                    steelPlates={steelPlates}
                    filteredSteelPlates={filteredSteelPlates}
                    selectedPlateId={selectedPlateId}
                    plateDefects={plateDefects}
                    surfaceFilter={surfaceFilter}
                    setSurfaceFilter={setSurfaceFilter}
                    availableDefectTypes={availableDefectTypes}
                    selectedDefectTypes={selectedDefectTypes}
                    setSelectedDefectTypes={setSelectedDefectTypes}
                    defectColors={defectColorMap}
                    defectAccentColors={defectAccentMap}
                    imageViewMode={imageViewMode}
                    setImageViewMode={setImageViewMode}
                    manualConfirmStatus={manualConfirmStatus}
                    setManualConfirmStatus={setManualConfirmStatus}
                    selectedDefectId={selectedDefectId}
                    setSelectedDefectId={setSelectedDefectId}
                    searchCriteria={searchCriteria}
                    filterCriteria={filterCriteria}
                    surfaceImageInfo={surfaceImageInfo}
                    imageOrientation={imageOrientation}
                    defaultTileSize={defaultTileSize}
                    maxTileLevel={maxTileLevel}
                  />
                )}

                {activeTab === "reports" && (
                  <DefectReport
                    data={getDefectStats()}
                    steelPlates={steelPlates}
                    accentColors={defectAccentMap}
                  />
                )}

                {activeTab === "plates" && (
                  <PlatesTab
                    isMobileDevice={isMobileDevice}
                    searchCriteria={searchCriteria}
                    setSearchCriteria={setSearchCriteria}
                    filterCriteria={filterCriteria}
                    setFilterCriteria={setFilterCriteria}
                    filteredSteelPlates={filteredSteelPlates}
                    selectedPlateId={selectedPlateId}
                    setSelectedPlateId={setSelectedPlateId}
                    setIsFilterDialogOpen={setIsFilterDialogOpen}
                    setShowPlatesPanel={setShowPlatesPanel}
                  />
                )}

                {activeTab === "settings" && (
                  <SettingsPage
                    theme={theme}
                    setTheme={setTheme}
                    imageOrientation={imageOrientation}
                    setImageOrientation={handleImageOrientationChange}
                    apiNodes={apiNodes}
                    lineName={activeLineKey}
                    onLineChange={(key) => env.setLineName(key)}
                  />
                )}

                {activeTab === "mockdata" && <MockDataEditorPage />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar - 仅桌面端显示 */}
      {!isMobileDevice && (
        <div className="h-6 bg-primary text-primary-foreground flex items-center justify-between px-3 text-[10px] uppercase tracking-wider shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3" /> SERVER: ONLINE
              (42ms)
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3" /> SIGNAL: STRONG
            </span>
          </div>
          <div>USER: OPERATOR_01 | SESSION: #882910</div>
        </div>
      )}

      {/* 底部导航栏（钢板面板显示时） - 报表/监控/设置 */}
      {showPlatesPanel && (
        <div
          className={`bg-card border-t border-border flex items-center justify-around shrink-0 ${isMobileDevice ? "h-16 px-4 safe-area-inset-bottom" : "h-12 px-8"}`}
        >
          <button
            onClick={() => {
              setActiveTab("reports");
              setShowPlatesPanel(false);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
              isMobileDevice
                ? "flex-col px-4 py-2"
                : "flex-row px-6 py-2"
            }`}
          >
            <BarChart3
              className={isMobileDevice ? "w-7 h-7" : "w-5 h-5"}
            />
            <span
              className={
                isMobileDevice
                  ? "text-[11px] font-medium"
                  : "text-sm font-medium"
              }
            >
              报表
            </span>
          </button>

          <button
            onClick={() => {
              setIsDiagnosticDialogOpen(true);
              setShowPlatesPanel(false);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
              isMobileDevice
                ? "flex-col px-4 py-2"
                : "flex-row px-6 py-2"
            }`}
          >
            <Activity
              className={isMobileDevice ? "w-7 h-7" : "w-5 h-5"}
            />
            <span
              className={
                isMobileDevice
                  ? "text-[11px] font-medium"
                  : "text-sm font-medium"
              }
            >
              系统监控
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("settings");
              setShowPlatesPanel(false);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
              isMobileDevice
                ? "flex-col px-4 py-2"
                : "flex-row px-6 py-2"
            }`}
          >
            <Settings
              className={isMobileDevice ? "w-7 h-7" : "w-5 h-5"}
            />
            <span
              className={
                isMobileDevice
                  ? "text-[11px] font-medium"
                  : "text-sm font-medium"
              }
            >
              设置
            </span>
          </button>
        </div>
      )}

      {/* Dialogs */}
      <SearchDialog
        isOpen={isSearchDialogOpen}
        onClose={() => setIsSearchDialogOpen(false)}
        onSearch={handleSearch}
        triggerRef={searchButtonRef}
      />
      <FilterDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onFilter={setFilterCriteria}
        triggerRef={filterButtonRef}
      />
      <SystemDiagnosticDialog
        isOpen={isDiagnosticDialogOpen}
        onClose={() => setIsDiagnosticDialogOpen(false)}
        triggerRef={diagnosticButtonRef}
      />
      <Toaster />
    </div>
  );
}
