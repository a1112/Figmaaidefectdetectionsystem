import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  SearchDialog,
  SearchCriteria,
} from "../components/SearchDialog";
import {
  FilterDialog,
  FilterCriteria,
} from "../components/FilterDialog";
import { SystemDiagnosticDialog } from "../components/SystemDiagnosticDialog";
import { env } from "../config/env";
import {
  listSteels,
  searchSteels,
  getDefectsRaw,
  getTileImageUrl,
  getGlobalMeta,
  getSteelMeta,
  getApiList,
} from "../api/client";
import type {
  SteelItem,
  DefectItem,
  SurfaceImageInfo,
  ApiNode,
} from "../api/types";
import type {
  Defect,
  DetectionRecord,
  SteelPlate,
  ImageOrientation,
} from "../types/app.types";
import {
  defectTypes,
  defectColors as defectTailwindColors,
  defectAccentColors,
  generateRandomDefects,
} from "../utils/defects";
import {
  Settings,
  Activity,
  BarChart3,
} from "lucide-react";
import { Toaster } from "../components/ui/sonner";
import { toast } from "sonner@2.0.3";
import { TitleBar } from "../components/layout/TitleBar";
import { MobileNavBar } from "../components/layout/MobileNavBar";
import { Sidebar } from "../components/layout/Sidebar";
import { StatusBar } from "../components/layout/StatusBar";
import { SettingsPage } from "../components/pages/SettingsPage";
import { DefectsPage } from "../components/pages/DefectsPage";
import { MockDataEditorPage } from "../components/pages/MockDataEditorPage";
import { DefectToolbar } from "./DefectToolbar";
import type { AppTab } from "./DefectToolbar";
import { PlateOverlayPanel } from "./PlateOverlayPanel";
import { PlatesTab } from "./PlatesTab";
import { ImagesTab } from "./ImagesTab";
import { useTheme } from "../components/ThemeContext";
import { ModernSettingsModal } from "../components/modals/ModernSettingsModal";
import { DefectHoverTooltip } from "../components/DefectHoverTooltip";

export function Dashboard() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const theme = currentTheme.colors.background === "#ffffff" ? "light" : "dark";
  
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
  const [hoveredDefect, setHoveredDefect] = useState<{
    defect: Defect;
    screenX: number;
    screenY: number;
  } | null>(null);
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

  const [showDistributionImages, setShowDistributionImages] = useState(true);
  const [showTileBorders, setShowTileBorders] = useState(false);

  const handleDefectHover = useCallback(
    (defect: Defect, position: { screenX: number; screenY: number }) => {
      setHoveredDefect({ defect, screenX: position.screenX, screenY: position.screenY });
    },
    [],
  );

  const handleDefectHoverEnd = useCallback(() => {
    setHoveredDefect(null);
  }, []);
  
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchCriteria, setSearchCriteria] =
    useState<SearchCriteria>({});
  const [filterCriteria, setFilterCriteria] =
    useState<FilterCriteria>({ levels: [] });
  const [availableDefectTypes, setAvailableDefectTypes] =
    useState<string[]>(defectTypes);
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
  const [activeLineKey, setActiveLineKey] = useState(
    env.getLineName(),
  );

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

  // 启动时健康检查
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedMode =
        window.localStorage.getItem("app_mode");
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
    try {
      const nodes = await getApiList();
      applyApiNodes(nodes);
    } catch (error) {
      console.warn("⚠️ 加载产线列表失败:", error);
    }
  }, [applyApiNodes]);

  useEffect(() => {
    if (!startupReady) return;
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
    window.addEventListener(
      "line_change",
      handleLineChange as EventListener,
    );
    return () => {
      cancelled = true;
      window.removeEventListener(
        "line_change",
        handleLineChange as EventListener,
      );
    };
  }, [startupReady, applyApiNodes]);

  useEffect(() => {
    const handleModeChange = () => {
      setApiNodes([]);
      setActiveLineKey("");
      env.setLineName("");
      refreshApiNodes();
    };
    window.addEventListener(
      "app_mode_change",
      handleModeChange,
    );
    return () => {
      window.removeEventListener(
        "app_mode_change",
        handleModeChange,
      );
    };
  }, [refreshApiNodes]);

  const activeLineLabel =
    apiNodes.find((node) => node.key === activeLineKey)?.name ||
    activeLineKey;

  useEffect(() => {
    if (activeLineLabel) {
      document.title = `${activeLineLabel} - Web Defect Detection`;
    } else {
      document.title = "Web Defect Detection";
    }
  }, [activeLineLabel]);

    // 加载全局 Meta
    useEffect(() => {
      if (!startupReady) return;
      if (env.isProduction() && apiNodes.length === 0) return;
      let cancelled = false;
      const loadGlobalMeta = async () => {
        // 生产模式下，尚未选择产线时不发起 /api/meta 请求，避免访问无效的 /api/meta。
        if (env.isProduction()) {
          const lineName =
            (env as any).getLineName?.() ?? "";
          if (!lineName) {
            return;
          }
        }

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

        const nextDefaultTileSize =
          res?.tile?.default_tile_size;
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

    const handleModeChange = () => {
      loadGlobalMeta();
    };

    window.addEventListener(
      "app_mode_change",
      handleModeChange,
    );
    window.addEventListener("line_change", handleModeChange);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "app_mode_change",
        handleModeChange,
      );
      window.removeEventListener(
        "line_change",
        handleModeChange,
      );
    };
  }, [startupReady, apiNodes]);

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
      availableDefectTypes.filter(
        (type) => !prev.includes(type),
      ),
    );
  };

    const [steelPlates, setSteelPlates] = useState<SteelPlate[]>(
      [],
    );
    const hoveredPlate = useMemo(() => {
      if (!selectedPlateId) return null;
      return (
        steelPlates.find(
          (plate) => plate.serialNumber === selectedPlateId,
        ) || null
      );
    }, [selectedPlateId, steelPlates]);
    const [isLoadingSteels, setIsLoadingSteels] = useState(false);
    const [surfaceImageInfo, setSurfaceImageInfo] = useState<
      SurfaceImageInfo[] | null
    >(null);

    const loadSteelPlates = async (
      criteria: SearchCriteria = searchCriteria,
      forceLimit?: number,
      forceSearch?: boolean,
    ) => {
      setIsLoadingSteels(true);

    try {
        const hasCriteria = Object.keys(criteria).length > 0;

        // 生产模式下尚未选择产线时，不触发真实 API 请求，避免访问无效的 /api/steels。
        if (env.isProduction()) {
          const lineName =
            (env as any).getLineName?.() ?? "";
          if (!lineName) {
            setSteelPlates([]);
            setIsLoadingSteels(false);
            return;
          }
        }
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

      if (
        env.isDevelopment() &&
        mapped.length > 0 &&
        !selectedPlateId
      ) {
        const firstPlate = mapped[0];
        setSelectedPlateId(firstPlate.serialNumber);

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
        }
      }
    } catch (error) {
      console.error("❌ 加载钢板列表失败:", error);
      const errMsg =
        error instanceof Error ? error.message : "加载失败";

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

  const handleSearch = (criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    const hasCriteria = Object.keys(criteria).length > 0;
    loadSteelPlates(
      criteria,
      hasCriteria ? searchLimit : steelLimit,
      true,
    );
  };

  useEffect(() => {
    if (!startupReady) return;
    if (env.isProduction() && apiNodes.length === 0) return;
    loadSteelPlates();

    const handleModeChange = () => {
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
  }, [startupReady, apiNodes]);

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

  useEffect(() => {
    if (!selectedPlateId) {
      setPlateDefects([]);
      setSurfaceImageInfo(null);
      return;
    }

    const loadPlateDefects = async () => {
      try {
        const selectedPlate = steelPlates.find(
          (p) => p.serialNumber === selectedPlateId,
        );
        if (!selectedPlate) {
          setPlateDefects([]);
          setSelectedPlateId(null);
          return;
        }

        const seqNo = parseInt(selectedPlate.serialNumber, 10);
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
      } catch (error) {
        console.error("❌ 加载缺陷数据失败:", error);
        setPlateDefects([]);
        setSurfaceImageInfo(null);
      }
    };

    loadPlateDefects();
  }, [selectedPlateId, steelPlates, defaultTileSize]);

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
        .catch(() => {});
    });
  }, [activeTab, selectedPlateId, steelPlates]);

  const navigateToReports = () => {
    navigate("/reports");
  };

  return (
    <div
      className={`h-screen w-full bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary selection:text-primary-foreground font-mono bg-grid-pattern relative ${theme === "dark" ? "dark" : ""}`}
    >
      <div className="absolute inset-0 pointer-events-none industrial-gradient z-0"></div>
      <div className="absolute inset-0 pointer-events-none scanline z-50 opacity-20"></div>

      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
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
          lineKey={activeLineKey}
          lineLabel={activeLineLabel}
          apiNodes={apiNodes}
          onLineChange={(key) => env.setLineName(key)}
          onRefreshApiNodes={refreshApiNodes}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

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
          lineLabel={activeLineLabel}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${isMobileDevice ? "hidden" : isSidebarCollapsed ? "w-0" : "w-64"} glass-panel border-r border-border flex flex-col shrink-0 transition-all duration-300 overflow-hidden`}
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

        <div className="flex-1 bg-transparent flex flex-col min-w-0 overflow-hidden">
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

          <div className="flex-1 min-h-0 overflow-auto p-[2px]">
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
                    onPreferredLevelChange={
                      setPreferredTileLevel
                    }
                    defaultTileSize={defaultTileSize}
                    maxTileLevel={maxTileLevel}
                    onDefectHover={handleDefectHover}
                    onDefectHoverEnd={handleDefectHoverEnd}
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
                    setSelectedDefectTypes={
                      setSelectedDefectTypes
                    }
                    defectColors={defectTailwindColors}
                    defectAccentColors={defectAccentMap}
                    imageViewMode={imageViewMode}
                    setImageViewMode={setImageViewMode}
                    manualConfirmStatus={manualConfirmStatus}
                    setManualConfirmStatus={
                      setManualConfirmStatus
                    }
                    selectedDefectId={selectedDefectId}
                    setSelectedDefectId={setSelectedDefectId}
                    searchCriteria={searchCriteria}
                    filterCriteria={filterCriteria}
                    surfaceImageInfo={surfaceImageInfo}
                    imageOrientation={imageOrientation}
                    defaultTileSize={defaultTileSize}
                    maxTileLevel={maxTileLevel}
                    showDistributionImages={showDistributionImages}
                    showTileBorders={showTileBorders}
                    onDefectHover={handleDefectHover}
                    onDefectHoverEnd={handleDefectHoverEnd}
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
                    setIsFilterDialogOpen={
                      setIsFilterDialogOpen
                    }
                    setShowPlatesPanel={setShowPlatesPanel}
                  />
                )}

                {/* Settings Tab content removed - moved to Modal */}

                {activeTab === "mockdata" && (
                  <MockDataEditorPage />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {!isMobileDevice && (
        <StatusBar />
      )}

      {showPlatesPanel && (
        <div
          className={`bg-card border-t border-border flex items-center justify-around shrink-0 ${isMobileDevice ? "h-16 px-4 safe-area-inset-bottom" : "h-12 px-8"}`}
        >
          <button
            onClick={() => {
              setShowPlatesPanel(false);
              navigateToReports();
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

      </div>
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
      <ModernSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        imageOrientation={imageOrientation}
        setImageOrientation={handleImageOrientationChange}
        showDistributionImages={showDistributionImages}
        setShowDistributionImages={setShowDistributionImages}
        showTileBorders={showTileBorders}
        setShowTileBorders={setShowTileBorders}
        lineKey={activeLineKey}
        apiNodes={apiNodes}
      />
      <Toaster />
      {hoveredDefect && (
        <DefectHoverTooltip
          defect={hoveredDefect.defect}
          screenX={hoveredDefect.screenX}
          screenY={hoveredDefect.screenY}
          plateSize={
            hoveredPlate
              ? {
                  width: hoveredPlate.dimensions.width,
                  length: hoveredPlate.dimensions.length,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
