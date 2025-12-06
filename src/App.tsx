import { useState, useEffect, useRef } from 'react';
import { UploadZone } from './components/UploadZone';
import { DetectionResult } from './components/DetectionResult';
import { DefectList } from './components/DefectList';
import { DefectReport } from './components/DefectReport';
import { DefectDistributionChart } from './components/DefectDistributionChart';
import { SearchDialog, SearchCriteria } from './components/SearchDialog';
import { FilterDialog, FilterCriteria } from './components/FilterDialog';
import { SystemDiagnosticDialog } from './components/SystemDiagnosticDialog';
import { ModeSwitch } from './components/ModeSwitch';
import { BackendErrorPanel } from './components/BackendErrorPanel';
import { DefectImageView } from './components/DefectImageView';
// 引入 API 客户端和环境配置
import { env } from './src/config/env';
import { listSteels, searchSteels, getDefectsRaw, getTileImageUrl, getGlobalMeta } from './src/api/client';
import type { SteelItem, DefectItem, DefectClassItem, SurfaceImageInfo } from './src/api/types';
import type { Defect, DetectionRecord, SteelPlate } from './types/app.types';
import { defectTypes, defectColors, defectAccentColors, generateRandomDefects } from './utils/defects';
import { getLevelText } from './utils/steelPlates';
import { 
  LayoutDashboard, 
  FileImage, 
  Settings, 
  Menu, 
  Maximize2, 
  Minus, 
  X, 
  Scan, 
  Activity,
  Database,
  Server,
  Wifi,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Images,
  BarChart3,
  List,
  PieChart,
  Moon,
  Sun,
  Upload,
  Search,
  Filter,
  RotateCcw,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./components/ui/dropdown-menu";
import { TitleBar } from './components/layout/TitleBar';
import { MobileNavBar } from './components/layout/MobileNavBar';
import { Sidebar } from './components/layout/Sidebar';
import { PlatesPanel } from './components/layout/PlatesPanel';
import { StatusBar } from './components/layout/StatusBar';
import { ReportsPage } from './components/pages/ReportsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { DefectsPage } from './components/pages/DefectsPage';
import { ImagesPage } from './components/pages/ImagesPage';
import { LargeImageViewer } from './components/LargeImageViewer/LargeImageViewer';
import type { Tile } from './components/LargeImageViewer/utils';

// 简单的瓦片图像缓存，避免重复加载同一瓦片
const tileImageCache = new Map<string, HTMLImageElement>();
const tileImageLoading = new Set<string>();

export default function App() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionRecord | null>(null);
    const [history, setHistory] = useState<DetectionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'defects' | 'images' | 'plates' | 'reports' | 'settings'>('defects');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showPlatesPanel, setShowPlatesPanel] = useState(false); // 手机模式：是否显示钢板面板
  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(null);
  const [surfaceFilter, setSurfaceFilter] = useState<'all' | 'top' | 'bottom'>('all');
  const [plateDefects, setPlateDefects] = useState<Defect[]>([]); // 当前选中钢板的缺陷
  const [isLoadingDefects, setIsLoadingDefects] = useState(false);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null); // 选中的缺陷ID
  const [imageViewMode, setImageViewMode] = useState<'full' | 'single'>('full'); // 图像显示模式：大图/单缺陷
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [manualConfirmStatus, setManualConfirmStatus] = useState<'unprocessed' | 'ignore' | 'A' | 'B' | 'C' | 'D' | null>(null); // 人工确认状态
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isDiagnosticDialogOpen, setIsDiagnosticDialogOpen] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({ levels: [] });
  const [availableDefectTypes, setAvailableDefectTypes] = useState<string[]>(defectTypes);
  const [defectColorMap, setDefectColorMap] = useState(defectColors);
  const [defectAccentMap, setDefectAccentMap] = useState(defectAccentColors);
  const [defectClasses, setDefectClasses] = useState<DefectClassItem[] | null>(null);
  const [steelLimit, setSteelLimit] = useState<number>(50);
  const [searchLimit, setSearchLimit] = useState<number>(200);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const diagnosticButtonRef = useRef<HTMLButtonElement>(null);
  
  // 图像标签页：选中的历史记录
  const [selectedHistoryImage, setSelectedHistoryImage] = useState<DetectionRecord | null>(null);
  
  // 移动设备侧边栏状态
  const [isMobileHistorySidebarOpen, setIsMobileHistorySidebarOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // 图像 Tab：瓦片 LOD 双层控制
  const [preferredTileLevel, setPreferredTileLevel] = useState(0);
  const [activeTileLevel, setActiveTileLevel] = useState(0);
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
    window.addEventListener('resize', checkMobileDevice);
    return () => window.removeEventListener('resize', checkMobileDevice);
  }, []);

  // 应用主题到 document.documentElement
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // 加载全局 Meta（包含缺陷字典与瓦片配置），在页面刷新时调用一次
  useEffect(() => {
    let cancelled = false;
    const loadGlobalMeta = async () => {
      try {
        const res = await getGlobalMeta();
        if (cancelled) return;

        const defectPayload = res.defect_classes;
        const items = defectPayload?.items ?? [];
        setDefectClasses(items);

        const names = items
          .map((item: any) => item.desc || item.name || item.tag)
          .filter((name: any): name is string => Boolean(name));

        if (names.length > 0) {
          setAvailableDefectTypes(names);
          setSelectedDefectTypes(prev => {
            const filtered = prev.filter(name => names.includes(name));
            return filtered.length > 0 ? filtered : names;
          });
          const toHex = (num: number) => num.toString(16).padStart(2, '0');
          const accentMap = { ...defectAccentColors };
          items.forEach((item: any) => {
            const key = item.desc || item.name || item.tag;
            if (!key) return;
            const { red, green, blue } = item.color;
            accentMap[key] = `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
          });
          setDefectAccentMap(accentMap);
        }

        // 目前 tile 配置仅由后端告知最大层级和默认瓦片尺寸，前端内部逻辑已保持一致。
      } catch (error) {
        console.warn('⚠️ 加载全局 Meta 失败:', error);
      }
    };

    loadGlobalMeta();
    return () => {
      cancelled = true;
    };
  }, []);
  
  // 缺陷类型过滤
  const [selectedDefectTypes, setSelectedDefectTypes] = useState<string[]>(defectTypes);
  const activeDefects = (currentImage || detectionResult)
    ? (detectionResult?.defects || [])
    : plateDefects;
  const filteredDefectsByControls = activeDefects.filter(
    (defect) =>
      (surfaceFilter === 'all' || defect.surface === surfaceFilter) &&
      selectedDefectTypes.includes(defect.type),
  );

  // 钢板记录数据（从 API 或本地模拟数据加载）
  const [steelPlates, setSteelPlates] = useState<SteelPlate[]>([]);
  const [isLoadingSteels, setIsLoadingSteels] = useState(false);
  const [steelsLoadError, setSteelsLoadError] = useState<string | null>(null);
  const [surfaceImageInfo, setSurfaceImageInfo] = useState<SurfaceImageInfo[] | null>(null);

  // 加载钢板列表的函数（提取出来以便重用）
  const loadSteelPlates = async (
    criteria: SearchCriteria = searchCriteria,
    forceLimit?: number,
    forceSearch?: boolean,
  ) => {
    setIsLoadingSteels(true);
    setSteelsLoadError(null);
    
    try {
      const hasCriteria = Object.keys(criteria).length > 0;
      const limitToUse = Math.max(1, Math.min(forceLimit ?? (hasCriteria ? searchLimit : steelLimit), 200));
      const params = {
        limit: limitToUse,
        serialNumber: criteria.serialNumber,
        plateId: criteria.plateId,
        dateFrom: criteria.dateFrom,
        dateTo: criteria.dateTo,
      };

      const applyCriteriaFilter = (items: SteelItem[]) =>
        hasCriteria
          ? items.filter(item => {
              if (criteria.serialNumber && !item.serialNumber.includes(criteria.serialNumber)) {
                return false;
              }
              if (criteria.plateId && !item.plateId.includes(criteria.plateId)) {
                return false;
              }
              if (criteria.dateFrom && item.timestamp < new Date(criteria.dateFrom)) {
                return false;
              }
              if (criteria.dateTo && item.timestamp > new Date(criteria.dateTo)) {
                return false;
              }
              return true;
            })
          : items;

      let items: SteelItem[];
      const shouldSearch = env.isProduction() && (hasCriteria || forceSearch);
      if (shouldSearch) {
        try {
          items = await searchSteels(params);
        } catch (err) {
          console.warn('⚠️ 查询接口不可用，回退到列表接口并前端过滤', err);
          const fallback = await listSteels(limitToUse);
          items = applyCriteriaFilter(fallback);
        }
      } else {
        const fallback = await listSteels(limitToUse);
        items = applyCriteriaFilter(fallback);
      }
      
      // 将 API 返回的 SteelItem 转换为 SteelPlate 格式
      const mapped: SteelPlate[] = items.map(item => ({
        serialNumber: item.serialNumber,
        plateId: item.plateId,
        steelGrade: item.steelGrade,
        dimensions: item.dimensions,
        timestamp: item.timestamp,
        level: item.level,
        defectCount: item.defectCount,
      }));
      
      setSteelPlates(mapped);
      const hasSelection = selectedPlateId && mapped.some(p => p.plateId === selectedPlateId);
      if (hasCriteria || forceSearch) {
        setSelectedPlateId(mapped.length > 0 ? mapped[0].plateId : null);
      } else if (!hasSelection) {
        setSelectedPlateId(mapped.length > 0 ? mapped[0].plateId : null);
      }
      console.log(`✅ 成功加载 ${mapped.length} 条钢板记录 (${env.getMode()} 模式)`);
      
      // 🔧 开发模式：自动选择第一个钢板并初始化历史记录
      if (env.isDevelopment() && mapped.length > 0 && !selectedPlateId) {
        const firstPlate = mapped[0];
        setSelectedPlateId(firstPlate.plateId);
        console.log(`🎯 开发模式：自动选择钢板 ${firstPlate.plateId}`);
        
        // 如果 history 为空，为前几个钢板创建模拟历史记录
        if (history.length === 0) {
          const mockHistory = mapped.slice(0, 5).map((plate, index) => {
            const defects = generateRandomDefects();
            const status = defects.length === 0 ? 'pass' : 
                          defects.some(d => d.severity === 'high') ? 'fail' : 'warning';
            
            return {
              id: `${plate.plateId}-${Date.now() - index * 1000}`,
              defectImageUrl: `https://images.unsplash.com/photo-1755377205509-866d6e727ee6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400`,
              fullImageUrl: `https://images.unsplash.com/photo-1755377205509-866d6e727ee6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200`,
              timestamp: new Date(Date.now() - index * 3600000),
              defects,
              status
            } as DetectionRecord;
          });
          
          setHistory(mockHistory);
          console.log(`🎨 开发模式：初始化 ${mockHistory.length} 条模拟历史记录`);
        }
      }
    } catch (error) {
      console.error('❌ 加载钢板列表失败:', error);
      setSteelsLoadError(error instanceof Error ? error.message : '加载失败');
      
      // 生产模式失败时使用空数组，开发模式已经在 mock 层处理
      if (env.isProduction()) {
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
    loadSteelPlates(criteria, hasCriteria ? searchLimit : steelLimit, true);
  };

  const handleRefreshSteels = () => {
    setSearchCriteria({});
    setFilterCriteria({ levels: [] });
    loadSteelPlates({}, steelLimit, false);
  };

  // 初始加载钢板列表
  useEffect(() => {
    loadSteelPlates();

    // 监听模式切换事件，重新加载数据
    const handleModeChange = () => {
      console.log('🔄 检测到模式切换，重新加载钢板列表...');
      loadSteelPlates();
    };

    window.addEventListener('app_mode_change', handleModeChange);
    return () => window.removeEventListener('app_mode_change', handleModeChange);
  }, []);

  // 列表仅应用筛选条件（查询结果已由服务端决定）
  const filteredSteelPlates = steelPlates.filter(plate => {
    if (filterCriteria.levels.length > 0 && !filterCriteria.levels.includes(plate.level)) {
      return false;
    }
    if (filterCriteria.defectCountMin !== undefined && plate.defectCount < filterCriteria.defectCountMin) {
      return false;
    }
    if (filterCriteria.defectCountMax !== undefined && plate.defectCount > filterCriteria.defectCountMax) {
      return false;
    }
    return true;
  });

    // 当选中钢板时，加载该钢板的缺陷数据
    useEffect(() => {
      if (!selectedPlateId) {
        setPlateDefects([]);
        setSurfaceImageInfo(null);
        setDetectionResult(null);
        return;
      }

      const loadPlateDefects = async () => {
        setIsLoadingDefects(true);

        try {
          // 从 plateId 中提取 seq_no（去除前导零）
          const selectedPlate = steelPlates.find(p => p.plateId === selectedPlateId);
          if (!selectedPlate) {
            console.warn('未找到选中的钢板:', selectedPlateId);
            setPlateDefects([]);
            setSelectedPlateId(null);
            setDetectionResult(null);
            return;
          }

          const seqNo = parseInt(selectedPlate.serialNumber, 10);
          console.log(`🔍 加载钢板 ${selectedPlateId} (seq_no: ${seqNo}) 的缺陷数据...`);

          const response = await getDefectsRaw(seqNo);
          const defectItems: DefectItem[] = response.defects.map(item => ({
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
          }));

          // 将 DefectItem 转换为 Defect 格式
          const mapped: Defect[] = defectItems.map(item => ({
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
          setSurfaceImageInfo(response.surface_images ?? null);
          console.log(`✅ 成功加载 ${mapped.length} 个缺陷 (${env.getMode()} 模式)`);
        } catch (error) {
          console.error('❌ 加载缺陷数据失败:', error);
          setPlateDefects([]);
          setSurfaceImageInfo(null);
        } finally {
          setIsLoadingDefects(false);
        }
      };

      loadPlateDefects();
    }, [selectedPlateId, steelPlates]);

    // 预取前后卷的缺陷数据和首块瓦片，以加速分布图加载
    useEffect(() => {
      if (!selectedPlateId || steelPlates.length === 0) {
        return;
      }

      const index = steelPlates.findIndex(p => p.plateId === selectedPlateId);
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

      neighbors.forEach(plate => {
        const seqNo = parseInt(plate.serialNumber, 10);
        getDefectsRaw(seqNo)
          .then(response => {
            // 使用返回的 surface_images 预热每个表面的第一块瓦片
            const metas = response.surface_images ?? [];
            metas.forEach(meta => {
              const url = getTileImageUrl({
                surface: meta.surface,
                seqNo,
                level: 0,
                tileX: 0,
                tileY: 0,
                tileSize: 512,
              });
              const img = new Image();
              img.src = url;
            });
          })
          .catch(() => {
            // 预取失败忽略，不影响主流程
          });
      });
    }, [selectedPlateId, steelPlates]);

  const handleImageUpload = (imageUrl: string) => {
    setCurrentImage(imageUrl);
    setDetectionResult(null);
    simulateDetection(imageUrl);
  };

  const simulateDetection = (imageUrl: string) => {
    setIsDetecting(true);
    
    setTimeout(() => {
      const defects = generateRandomDefects();
      const status = defects.length === 0 ? 'pass' : 
                     defects.some(d => d.severity === 'high') ? 'fail' : 'warning';
      
      const record: DetectionRecord = {
        id: Date.now().toString(),
        defectImageUrl: imageUrl, // 假设缺陷图像和完整图像相同
        fullImageUrl: imageUrl,
        timestamp: new Date(),
        defects,
        status
      };
      
      setDetectionResult(record);
      setHistory(prev => [record, ...prev].slice(0, 50));
      setIsDetecting(false);
    }, 2000);
  };

  // 生成缺陷统计数据
  const getDefectStats = () => {
    const stats: { [key: string]: number } = {};
    
    availableDefectTypes.forEach(type => { stats[type] = 0; });
    
    history.forEach(record => {
      record.defects.forEach(defect => {
        if (stats[defect.type] !== undefined) {
          stats[defect.type]++;
        }
      });
    });
    
    return availableDefectTypes.map(type => ({
      type,
      count: stats[type] || Math.floor(Math.random() * 20) + 5 // 如果没有数据,使用模拟数据
    }));
  };

  return (
    <div className={`h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary selection:text-primary-foreground font-mono ${theme === 'dark' ? 'dark' : ''}`}>
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
        <div className={`${isMobileDevice ? 'hidden' : (isSidebarCollapsed ? 'w-0' : 'w-64')} bg-muted/30 border-r border-border flex flex-col shrink-0 transition-all duration-300 overflow-hidden`}>
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
            handleImageUpload={handleImageUpload}
            setActiveTab={setActiveTab}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-background/50 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar - 缺陷类型过滤器 */}
          <div className="border-b border-border relative sm:px-4 sm:py-2 bg-card/50 shrink-0 px-[5px] py-[3px]">
            {/* 缺陷类型过滤器 */}
            {(activeTab === 'defects' || activeTab === 'images') && (
              <>
                {/* 缺陷类型复选框 - 左侧，为右侧按钮留出空间 */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pr-10 sm:pr-12">
                  {availableDefectTypes.map((type) => {
                    const count = activeDefects.filter(d => d.type === type).length;
                    const isSelected = selectedDefectTypes.includes(type);
                    const colors = defectColorMap[type];
                    
                    return (
                      <label
                        key={type}
                        className="flex items-center gap-0.5 sm:gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                        title={`${type}: ${count}个`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedDefectTypes(prev => 
                              prev.includes(type) 
                                ? prev.filter(t => t !== type)
                                : [...prev, type]
                            );
                          }}
                          style={{ accentColor: defectAccentMap[type] || '#3b82f6' }}
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5 cursor-pointer"
                        />
                        <span className="text-[10px] sm:text-xs font-medium text-foreground whitespace-nowrap">
                          {type}({count})
                        </span>
                      </label>
                    );
                  })}
                </div>
                
                {/* 快捷操作菜单 - 固定在右上角 */}
                <div className="absolute top-2 right-2 sm:right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 hover:bg-accent rounded transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedDefectTypes(availableDefectTypes)}>
                        全选
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedDefectTypes([])}>
                        全不选
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const unselected = availableDefectTypes.filter(type => !selectedDefectTypes.includes(type));
                        setSelectedDefectTypes(unselected);
                      }}>
                        反选
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>

          {/* Scrollable Content */}
          <div className={`flex-1 min-h-0 overflow-auto ${isMobileDevice ? 'p-2' : 'p-4'}`}>

              {/* 钢板面板（桌面和手机模式） */}
              {showPlatesPanel && (
                <div className={`flex-1 min-h-0 flex flex-col bg-background ${isMobileDevice ? '-m-2' : '-m-4'}`}>
                {/* 顶部搜索栏 */}
                <div className={`bg-card border-b border-border shrink-0 ${isMobileDevice ? 'p-3' : 'p-4'}`}>
                  <div className="flex items-center gap-2">
                    {/* 桌面模式：标题和关闭按钮 */}
                    {!isMobileDevice && (
                      <div className="flex items-center gap-2 mr-2">
                        <Database className="w-5 h-5 text-primary" />
                        <h2 className="font-medium">钢板列表</h2>
                      </div>
                    )}
                    
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="搜索钢��号、流水号..."
                        className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        onChange={(e) => {
                          const value = e.target.value;
                          setSearchCriteria({
                            plateId: value,
                            serialNumber: value
                          });
                        }}
                      />
                    </div>
                    <button
                      onClick={() => setIsSearchDialogOpen(true)}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        Object.keys(searchCriteria).length > 0
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}
                      title="高级查询"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsFilterDialogOpen(true)}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        filterCriteria.levels.length > 0
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}
                      title="筛选"
                    >
                      <Filter className="w-5 h-5" />
                    </button>
                    
                    {/* 桌面模式：关闭按钮 */}
                    {!isMobileDevice && (
                      <button
                        onClick={() => setShowPlatesPanel(false)}
                        className="p-2.5 rounded-lg border border-border bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="关闭钢板列表"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* 筛选标签显示 */}
                  {(Object.keys(searchCriteria).length > 0 || filterCriteria.levels.length > 0) && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {filterCriteria.levels.map(level => (
                        <span key={level} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full border border-primary/30">
                          {getLevelText(level)}
                        </span>
                      ))}
                      <button
                        onClick={() => {
                          setSearchCriteria({});
                          setFilterCriteria({ levels: [] });
                        }}
                        className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        清除筛选
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 钢板列表 */}
                <div className="flex-1 min-h-0 overflow-auto">
                  {/* 统计信息 */}
                  <div className={`bg-card border-b border-border ${isMobileDevice ? 'p-3' : 'p-4'}`}>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-primary`}>{filteredSteelPlates.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">总数</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-green-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'A').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">一等品</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-yellow-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'B' || p.level === 'C').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">合格品</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-red-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'D').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">等外品</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 钢板列表项 */}
                  {filteredSteelPlates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <Database className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-sm">没有找到匹配的钢板记录</p>
                      <button
                        onClick={() => {
                          setSearchCriteria({});
                          setFilterCriteria({ levels: [] });
                        }}
                        className="mt-4 px-4 py-2 text-xs text-primary hover:underline"
                      >
                        清除筛���条件
                      </button>
                    </div>
                  ) : (
                    <div className={`${isMobileDevice ? 'p-2' : 'p-4'} space-y-2`}>
                      {filteredSteelPlates.map((plate) => (
                        <div
                          key={plate.plateId}
                          onClick={() => {
                            setSelectedPlateId(plate.plateId);
                            setShowPlatesPanel(false); // 选择钢板后关闭面板
                          }}
                          className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                            selectedPlateId === plate.plateId
                              ? 'border-primary shadow-lg shadow-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {/* 头部：流水号和等级 */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono text-muted-foreground">
                              NO.{plate.serialNumber}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                              plate.level === 'A' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                              plate.level === 'B' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                              plate.level === 'C' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                              'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                              {getLevelText(plate.level)}
                            </span>
                          </div>
                          
                          {/* 主要信息 */}
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-mono font-bold text-foreground">{plate.plateId}</span>
                              <span className="text-sm font-mono text-muted-foreground">{plate.steelGrade}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium">规格:</span>
                                <span className="font-mono">
                                  {plate.dimensions.length}×{plate.dimensions.width}×{plate.dimensions.thickness}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium">缺陷:</span>
                                <span className={`font-mono ${plate.defectCount > 5 ? 'text-red-400' : 'text-foreground'}`}>
                                  {plate.defectCount}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground font-mono">
                              {plate.timestamp.toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 正常内容（非钢板面板时） */}
            {!showPlatesPanel && activeTab === 'defects' && false && (
              <div className="h-full flex flex-col space-y-4">
                {/* ========== 统一使用桌面版布局 ========== */}
                <div className={`grid grid-cols-1 gap-4 flex-1 min-h-0 lg:grid-cols-3`}>
                  {/* Left: Viewport */}
                  <div className={`flex flex-col gap-4 lg:col-span-2`}>
                    <div className="flex-1 bg-card border border-border p-1 relative min-h-[300px] flex flex-col">
                      {/* 顶部标签 */}
                      <div className="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-bold z-10 flex items-center justify-between gap-2">
                        {/* 左侧：大图/缺陷 视图切换 + 确认状态显示 */}
                        <div className="flex items-center gap-2">
                          {/* 视图切换 */}
                          <div className="flex items-center gap-1 bg-black/20 rounded p-0.5">
                            <button
                              onClick={() => setImageViewMode('full')}
                              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                imageViewMode === 'full'
                                  ? 'bg-white text-primary'
                                  : 'text-white/70 hover:text-white'
                              }`}
                            >
                              大图
                            </button>
                            <button
                              onClick={() => setImageViewMode('single')}
                              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                imageViewMode === 'single'
                                  ? 'bg-white text-primary'
                                  : 'text-white/70 hover:text-white'
                              }`}
                            >
                              缺陷
                            </button>
                          </div>
                          
                          {/* 确认状态显示 */}
                          {manualConfirmStatus && (
                            <div className="flex items-center gap-1 bg-black/30 rounded px-2 py-0.5 border border-white/20">
                              <span 
                                className={`w-1.5 h-1.5 rounded-full ${
                                  manualConfirmStatus === 'unprocessed' ? 'bg-gray-400' :
                                  manualConfirmStatus === 'ignore' ? 'bg-blue-400' :
                                  manualConfirmStatus === 'A' ? 'bg-green-500' :
                                  manualConfirmStatus === 'B' ? 'bg-blue-500' :
                                  manualConfirmStatus === 'C' ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                              />
                              <span className="text-[10px] text-white/90">
                                {manualConfirmStatus === 'unprocessed' ? '未处理' :
                                 manualConfirmStatus === 'ignore' ? '不处理' :
                                 manualConfirmStatus === 'A' ? '一等品' :
                                 manualConfirmStatus === 'B' ? '二等品' :
                                 manualConfirmStatus === 'C' ? '三等品' :
                                 '等外品'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* 中间：钢板号 */}
                        <span className="text-[10px] opacity-80 flex-1 text-center truncate">
                          {selectedPlateId ? `钢板: ${selectedPlateId}` : '未选择'}
                        </span>
                        
                        {/* 右侧：人工确认标记菜单 */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={`p-1 hover:bg-white/20 rounded transition-colors relative ${
                              manualConfirmStatus ? 'ring-2 ring-white/30' : ''
                            }`}>
                              <Menu className="w-4 h-4" />
                              {/* 状态指示器 */}
                              {manualConfirmStatus && (
                                <span 
                                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                                    manualConfirmStatus === 'unprocessed' ? 'bg-gray-400' :
                                    manualConfirmStatus === 'ignore' ? 'bg-blue-400' :
                                    manualConfirmStatus === 'A' ? 'bg-green-500' :
                                    manualConfirmStatus === 'B' ? 'bg-blue-500' :
                                    manualConfirmStatus === 'C' ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                />
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuLabel className="text-xs">人工确认</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={() => setManualConfirmStatus('unprocessed')}
                            >
                              <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                              未处理
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={() => setManualConfirmStatus('ignore')}
                            >
                              <span className="w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                              不处理
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={() => setManualConfirmStatus('A')}
                            >
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                              一等品
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={() => setManualConfirmStatus('B')}
                            >
                              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                              二等品
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={() => setManualConfirmStatus('C')}
                            >
                              <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                              三等品
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer"
                              onClick={() => setManualConfirmStatus('D')}
                            >
                              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                              等外品
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* 图像区域 */}
                      <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden border border-border/20 relative">
                        {!currentImage ? (
                          <div className="w-full h-full flex items-center justify-center p-8">
                            <UploadZone onImageUpload={handleImageUpload} />
                          </div>
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                            <DetectionResult
                              imageUrl={currentImage}
                              defects={filteredDefectsByControls}
                              isDetecting={isDetecting}
                            />
                            <button
                              onClick={() => {
                                setCurrentImage(null);
                                setDetectionResult(null);
                              }}
                              className="absolute top-4 right-4 px-3 py-1.5 bg-destructive/90 hover:bg-destructive text-white text-xs rounded border border-white/10 backdrop-blur-md transition-colors z-20"
                            >
                              CLOSE FEED
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Logs/List */}
                  <div className="lg:col-span-1 flex flex-col bg-card border border-border">
                      {/* legacy list/chart toggle block removed */}
                    </div>
                  </div>
                </div>
            )}

            {/* 图像 Tab：使用 LargeImageViewer 作为长带地图视图容器 */}
            {!showPlatesPanel && activeTab === 'images' && (
              <div className="h-full flex flex-col gap-2">
                <div className="text-xs text-muted-foreground">
                  钢板长带虚拟图像（滚轮缩放，拖动平移）
                </div>
                <div className="flex-1 min-h-0 bg-card border border-border relative">
                  {(() => {
                    const selectedPlate = selectedPlateId
                      ? steelPlates.find(p => p.plateId === selectedPlateId)
                      : undefined;
                    if (!selectedPlate) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                          请选择左侧钢板以查看长带图像
                        </div>
                      );
                    }
                    if (!surfaceImageInfo || surfaceImageInfo.length === 0) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                          当前钢板尚无图像元数据（surface_images 为空）
                        </div>
                      );
                    }

                    const topMeta = surfaceImageInfo.find(info => info.surface === 'top');
                    const bottomMeta = surfaceImageInfo.find(info => info.surface === 'bottom');
                    if (!topMeta && !bottomMeta) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                          当前钢板上下表面都没有图像元数据
                        </div>
                      );
                    }

                    const toRotatedSize = (meta: SurfaceImageInfo | undefined) => {
                      if (!meta) {
                        return { width: 0, height: 0 };
                      }
                      const imgW = meta.image_width || 1;
                      const imgH = meta.image_height || 1;
                      const frameCount = meta.frame_count || 1;
                      const mosaicW = imgW;
                      const mosaicH = frameCount * imgH;
                      // 逆时针 90°：高变宽，宽变高
                      return { width: mosaicH, height: mosaicW };
                    };

                    const topRot = toRotatedSize(topMeta);
                    const bottomRot = toRotatedSize(bottomMeta);
                    const gap = topRot.height > 0 && bottomRot.height > 0 ? 100 : 0;

                    const worldLength = Math.max(topRot.width, bottomRot.width);
                    const worldWidth = topRot.height + bottomRot.height + gap;

                    if (worldLength <= 0 || worldWidth <= 0) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                          图像尺寸为 0，无法构建长带视图
                        </div>
                      );
                    }

                    const seqNo = Number(selectedPlate.serialNumber);
                    const baseTileSize = 1024;

                    const renderTile = (
                      ctx: CanvasRenderingContext2D,
                      tile: Tile,
                      tileSize: number,
                      scale: number
                    ) => {
                      const virtualTileSize = tileSize * Math.pow(2, tile.level);

                      // 计算瓦片中心的世界坐标，用于判断所在表面或间隙
                      const centerY = tile.y + tile.height / 2;

                      let surface: 'top' | 'bottom' | null = null;
                      let yOffset = 0;
                      let surfaceWidth = 0;
                      let surfaceHeight = 0;

                      if (centerY < topRot.height && topRot.height > 0) {
                        surface = 'top';
                        yOffset = 0;
                        surfaceWidth = topRot.width;
                        surfaceHeight = topRot.height;
                      } else if (centerY >= topRot.height + gap && bottomRot.height > 0) {
                        surface = 'bottom';
                        yOffset = topRot.height + gap;
                        surfaceWidth = bottomRot.width;
                        surfaceHeight = bottomRot.height;
                      } else {
                        // 间隙区域：仅绘制占位网格，不请求后端瓦片
                        ctx.fillStyle = '#f4f4f4';
                        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
                        ctx.strokeStyle = '#ddd';
                        ctx.lineWidth = 1 / scale;
                        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
                        return;
                      }

                      // 超出该表面有效宽高的瓦片不请求（避免加载多余图像）
                      if (tile.x >= surfaceWidth) {
                        return;
                      }

                      const mosaicY = tile.y - yOffset;
                      if (mosaicY >= surfaceHeight || mosaicY + tile.height <= 0) {
                        return;
                      }

                      const tileX = Math.floor(tile.x / virtualTileSize);
                      const tileY = Math.floor(mosaicY / virtualTileSize);

                      if (tileX < 0 || tileY < 0) {
                        return;
                      }

                       // 进一步按照后端的马赛克高度裁剪 tileY，避免请求超出范围导致 404
                       const metaForSurface = surface === 'top' ? topMeta : bottomMeta;
                       if (!metaForSurface) {
                         return;
                       }
                       // 与后端 get_tile 中的计算保持一致：
                       // rotated_h = first.width -> mosaic_height = rotated_h
                       const rotatedH = metaForSurface.image_width || 1;
                       const mosaicHeightBackend = rotatedH;
                       const maxTileYBackend = Math.ceil(mosaicHeightBackend / virtualTileSize);
                       if (tileY >= maxTileYBackend) {
                         return;
                       }

                      const url = getTileImageUrl({
                        surface,
                        seqNo,
                        level: tile.level,
                        tileX,
                        tileY,
                        tileSize,
                        fmt: 'JPEG',
                      });

                      const cacheKey = `${surface}-${seqNo}-${tile.level}-${tileX}-${tileY}-${tileSize}`;
                      const cached = tileImageCache.get(cacheKey);

                      if (cached && cached.complete) {
                        ctx.drawImage(cached, tile.x, tile.y, tile.width, tile.height);

                        // 绘制瓦片边框用于调试
                        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                        ctx.lineWidth = 1 / scale;
                        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
                        return;
                      }

                      if (!tileImageLoading.has(cacheKey)) {
                        tileImageLoading.add(cacheKey);
                        const img = new Image();
                        img.src = url;
                        img.onload = () => {
                          tileImageCache.set(cacheKey, img);
                          tileImageLoading.delete(cacheKey);
                        };
                        img.onerror = () => {
                          tileImageLoading.delete(cacheKey);
                        };
                      }

                      // 尚未加载完成时，绘制占位网格
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(tile.x, tile.y, tile.width, tile.height);

                      ctx.strokeStyle = '#ccc';
                      ctx.lineWidth = 1 / scale;
                      ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
                    };

                    return (
                      <LargeImageViewer
                        imageWidth={worldLength}
                        imageHeight={worldWidth}
                        tileSize={baseTileSize}
                        className="bg-slate-50"
                        fixedLevel={activeTileLevel}
                        onPreferredLevelChange={setPreferredTileLevel}
                        renderTile={renderTile}
                      />
                    );
                  })()}
                </div>
              </div>
            )}

            {!showPlatesPanel && activeTab === 'defects' && (
            <DefectsPage
              isMobileDevice={isMobileDevice}
              currentImage={currentImage}
              isDetecting={isDetecting}
              detectionResult={detectionResult}
              history={history}
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
            />
            )}

            {!showPlatesPanel && activeTab === 'reports' && (
              <DefectReport data={getDefectStats()} steelPlates={steelPlates} accentColors={defectAccentMap} />
            )}

            {!showPlatesPanel && activeTab === 'plates' && (
              <div className="h-full flex flex-col bg-background">
                {/* 手机模式：顶部搜索栏 */}
                {isMobileDevice && (
                  <div className="p-3 bg-card border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="搜索钢板号、流水号..."
                          className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          onChange={(e) => {
                            const value = e.target.value;
                            setSearchCriteria({
                              plateId: value,
                              serialNumber: value
                            });
                          }}
                        />
                      </div>
                      <button
                        onClick={() => setIsFilterDialogOpen(true)}
                        className={`p-2.5 rounded-lg border transition-colors ${
                          filterCriteria.levels.length > 0
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        <Filter className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* 筛选标��显示 */}
                    {(Object.keys(searchCriteria).length > 0 || filterCriteria.levels.length > 0) && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {filterCriteria.levels.map(level => (
                          <span key={level} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full border border-primary/30">
                            {getLevelText(level)}
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            setSearchCriteria({});
                            setFilterCriteria({ levels: [] });
                          }}
                          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          清除筛选
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 钢板列表 */}
                <div className="flex-1 min-h-0 overflow-auto">
                  {/* 统计信息 */}
                  <div className={`bg-card border-b border-border ${isMobileDevice ? 'p-3' : 'p-4'}`}>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-primary`}>{filteredSteelPlates.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">总数</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-green-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'A').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">一等品</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-yellow-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'B' || p.level === 'C').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">合格品</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-red-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'D').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">等外品</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 钢板列表项 */}
                  {filteredSteelPlates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <Database className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-sm">没有找到匹配的钢板记录</p>
                      <button
                        onClick={() => {
                          setSearchCriteria({});
                          setFilterCriteria({ levels: [] });
                        }}
                        className="mt-4 px-4 py-2 text-xs text-primary hover:underline"
                      >
                        清除筛选条件
                      </button>
                    </div>
                  ) : (
                    <div className={`${isMobileDevice ? 'p-2' : 'p-4'} space-y-2`}>
                      {filteredSteelPlates.map((plate) => (
                        <div
                          key={plate.plateId}
                          onClick={() => {
                            setSelectedPlateId(plate.plateId);
                            if (isMobileDevice) {
                              // 手机模式下点击后关闭钢板面板
                              setShowPlatesPanel(false);
                            }
                          }}
                          className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                            selectedPlateId === plate.plateId
                              ? 'border-primary shadow-lg shadow-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {/* 头部：流水号和等级 */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono text-muted-foreground">
                              NO.{plate.serialNumber}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                              plate.level === 'A' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                              plate.level === 'B' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                              plate.level === 'C' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                              'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                              {getLevelText(plate.level)}
                            </span>
                          </div>
                          
                          {/* 主要信息 */}
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-mono font-bold text-foreground">{plate.plateId}</span>
                              <span className="text-sm font-mono text-muted-foreground">{plate.steelGrade}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium">规格:</span>
                                <span className="font-mono">
                                  {plate.dimensions.length}×{plate.dimensions.width}×{plate.dimensions.thickness}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium">缺陷:</span>
                                <span className={`font-mono ${plate.defectCount > 5 ? 'text-red-400' : 'text-foreground'}`}>
                                  {plate.defectCount}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground font-mono">
                              {plate.timestamp.toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!showPlatesPanel && activeTab === 'settings' && (
              <SettingsPage theme={theme} setTheme={setTheme} />
            )}

            {!showPlatesPanel && activeTab === 'images' && false && (
              <div className="h-full flex flex-col bg-card border border-border">
                {/* 图像显示区域 */}
                <div className="flex-1 relative min-h-0 bg-black/40">
                  {(() => {
                    // 优先显示上传的图像
                    if (currentImage) {
                      return (
                        <DetectionResult
                          imageUrl={currentImage}
                          defects={filteredDefectsByControls}
                          isDetecting={isDetecting}
                        />
                      );
                    }
                    
                    // 根据选中的钢板ID查找对应的历史记录
                    if (selectedPlateId) {
                      const plateRecord = history.find(h => h.id.includes(selectedPlateId));
                      
                      if (plateRecord) {
                        return (
                          <DetectionResult
                            imageUrl={plateRecord.fullImageUrl}
                            defects={plateRecord.defects.filter(d => 
                              (surfaceFilter === 'all' || d.surface === surfaceFilter) &&
                              selectedDefectTypes.includes(d.type)
                            )}
                            isDetecting={false}
                          />
                        );
                      }
                    }
                    
                    // 无选中钢板时的���示
                    return (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <Database className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-sm mb-2">请选择要查看的钢板</p>
                        <p className="text-xs opacity-70">点击左上角数据库图标打开钢板列表</p>
                        <p className="text-xs opacity-70 mt-1">或使用顶部工具栏上传新图像</p>
                      </div>
                    );
                  })()}
                </div>
                
                {/* 底部信息栏 */}
                {(currentImage || selectedPlateId) && (() => {
                  const plateRecord = selectedPlateId ? history.find(h => h.id.includes(selectedPlateId)) : null;
                  const showInfo = currentImage || plateRecord;
                  
                  if (!showInfo) return null;
                  
                  return (
                    <div className="p-3 border-t border-border bg-muted/20 shrink-0">
                      <div className="grid grid-cols-5 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-1">钢板号</p>
                          <p className="font-mono truncate">
                            {currentImage ? (selectedPlateId || '上传图像') : plateRecord?.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">检测时间</p>
                          <p className="font-mono text-[10px]">
                            {currentImage ? new Date().toLocaleString('zh-CN') : plateRecord?.timestamp.toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">状态</p>
                          <span className={`text-xs px-1.5 py-0.5 border inline-block ${
                            currentImage 
                              ? 'text-blue-500 border-blue-500/30 bg-blue-500/10'
                              : plateRecord?.status === 'pass' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 
                              plateRecord?.status === 'fail' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                              'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
                          }`}>
                            {currentImage ? '已上传' : plateRecord?.status === 'pass' ? '合格' : plateRecord?.status === 'fail' ? '不合格' : '待检'}
                          </span>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">缺陷总数</p>
                          <p className="font-mono">
                            {currentImage || detectionResult
                              ? activeDefects.length
                              : (plateDefects.length || plateRecord?.defects.length || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">当前过滤</p>
                          <p className="font-mono text-[10px]">
                            {surfaceFilter === 'all' ? '全部表面' : surfaceFilter === 'top' ? '上表面' : '下表面'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {!showPlatesPanel && activeTab === 'reports' && (
              <DefectReport data={getDefectStats()} steelPlates={steelPlates} accentColors={defectAccentMap} />
            )}

            {!showPlatesPanel && activeTab === 'plates' && (
              <div className="h-full flex flex-col bg-background">
                {/* 手机模式：顶部搜索栏 */}
                {isMobileDevice && (
                  <div className="p-3 bg-card border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="搜索钢板号、流水号..."
                          className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          onChange={(e) => {
                            const value = e.target.value;
                            setSearchCriteria({
                              plateId: value,
                              serialNumber: value
                            });
                          }}
                        />
                      </div>
                      <button
                        onClick={() => setIsFilterDialogOpen(true)}
                        className={`p-2.5 rounded-lg border transition-colors ${
                          filterCriteria.levels.length > 0
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        <Filter className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* 筛选标签显示 */}
                    {(Object.keys(searchCriteria).length > 0 || filterCriteria.levels.length > 0) && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {filterCriteria.levels.map(level => (
                          <span key={level} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full border border-primary/30">
                            {getLevelText(level)}
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            setSearchCriteria({});
                            setFilterCriteria({ levels: [] });
                          }}
                          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          清除筛选
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 钢板列表 */}
                <div className="flex-1 min-h-0 overflow-auto">
                  {/* 统计信息 */}
                  <div className={`bg-card border-b border-border ${isMobileDevice ? 'p-3' : 'p-4'}`}>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-primary`}>{filteredSteelPlates.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">总数</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-green-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'A').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">一等品</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-yellow-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'B' || p.level === 'C').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">合格品</p>
                      </div>
                      <div className="text-center">
                        <p className={`${isMobileDevice ? 'text-xl' : 'text-2xl'} font-bold text-red-500`}>
                          {filteredSteelPlates.filter(p => p.level === 'D').length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">等外品</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 钢板列表项 */}
                  {filteredSteelPlates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <Database className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-sm">没有找到匹配的钢板记录</p>
                      <button
                        onClick={() => {
                          setSearchCriteria({});
                          setFilterCriteria({ levels: [] });
                        }}
                        className="mt-4 px-4 py-2 text-xs text-primary hover:underline"
                      >
                        清除筛选条件
                      </button>
                    </div>
                  ) : (
                    <div className={`${isMobileDevice ? 'p-2' : 'p-4'} space-y-2`}>
                      {filteredSteelPlates.map((plate) => (
                        <div
                          key={plate.plateId}
                          onClick={() => {
                            setSelectedPlateId(plate.plateId);
                            if (isMobileDevice) {
                              // 手机模式下点击后关闭钢板面板
                              setShowPlatesPanel(false);
                            }
                          }}
                          className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                            selectedPlateId === plate.plateId
                              ? 'border-primary shadow-lg shadow-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {/* 头部：流水号和等级 */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono text-muted-foreground">
                              NO.{plate.serialNumber}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                              plate.level === 'A' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                              plate.level === 'B' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                              plate.level === 'C' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                              'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                              {getLevelText(plate.level)}
                            </span>
                          </div>
                          
                          {/* 主要信息 */}
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-mono font-bold text-foreground">{plate.plateId}</span>
                              <span className="text-sm font-mono text-muted-foreground">{plate.steelGrade}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium">规格:</span>
                                <span className="font-mono">
                                  {plate.dimensions.length}×{plate.dimensions.width}×{plate.dimensions.thickness}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-medium">缺陷:</span>
                                <span className={`font-mono ${plate.defectCount > 5 ? 'text-red-400' : 'text-foreground'}`}>
                                  {plate.defectCount}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground font-mono">
                              {plate.timestamp.toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Status Bar - 仅桌面端显示 */}
      {!isMobileDevice && (
        <div className="h-6 bg-primary text-primary-foreground flex items-center justify-between px-3 text-[10px] uppercase tracking-wider shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Server className="w-3 h-3" /> SERVER: ONLINE (42ms)</span>
            <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> SIGNAL: STRONG</span>
          </div>
          <div>
            USER: OPERATOR_01 | SESSION: #882910
          </div>
        </div>
      )}
      
      {/* 底部导航栏（钢板面板显示时） - 报表/监控/设置 */}
      {showPlatesPanel && (
        <div className={`bg-card border-t border-border flex items-center justify-around shrink-0 ${isMobileDevice ? 'h-16 px-4 safe-area-inset-bottom' : 'h-12 px-8'}`}>
          <button
            onClick={() => {
              setActiveTab('reports');
              setShowPlatesPanel(false);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
              isMobileDevice ? 'flex-col px-4 py-2' : 'flex-row px-6 py-2'
            }`}
          >
            <BarChart3 className={isMobileDevice ? 'w-7 h-7' : 'w-5 h-5'} />
            <span className={isMobileDevice ? 'text-[11px] font-medium' : 'text-sm font-medium'}>报表</span>
          </button>
          
          <button
            onClick={() => {
              setIsDiagnosticDialogOpen(true);
              setShowPlatesPanel(false);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
              isMobileDevice ? 'flex-col px-4 py-2' : 'flex-row px-6 py-2'
            }`}
          >
            <Activity className={isMobileDevice ? 'w-7 h-7' : 'w-5 h-5'} />
            <span className={isMobileDevice ? 'text-[11px] font-medium' : 'text-sm font-medium'}>系统监控</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('settings');
              setShowPlatesPanel(false);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg transition-colors flex-1 text-muted-foreground hover:text-primary hover:bg-accent/50 ${
              isMobileDevice ? 'flex-col px-4 py-2' : 'flex-row px-6 py-2'
            }`}
          >
            <Settings className={isMobileDevice ? 'w-7 h-7' : 'w-5 h-5'} />
            <span className={isMobileDevice ? 'text-[11px] font-medium' : 'text-sm font-medium'}>设置</span>
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
    </div>
  );
}
