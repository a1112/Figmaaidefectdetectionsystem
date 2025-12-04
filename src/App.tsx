import { useState, useEffect, useRef } from 'react';
import { UploadZone } from './components/UploadZone';
import { DetectionResult } from './components/DetectionResult';
import { StatisticsPanel } from './components/StatisticsPanel';
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
import { listSteels, getDefects, getDefectClasses } from './src/api/client';
import type { SteelItem, DefectItem, DefectClassItem } from './src/api/types';
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

export default function App() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionRecord | null>(null);
  const [history, setHistory] = useState<DetectionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'defects' | 'images' | 'plates' | 'reports' | 'settings'>('defects');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showPlatesPanel, setShowPlatesPanel] = useState(false); // 手机模式：是否显示钢板面板
  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(null);
  const [defectLogView, setDefectLogView] = useState<'list' | 'chart'>('list');
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
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const diagnosticButtonRef = useRef<HTMLButtonElement>(null);
  
  // 图像标签页：选中的历史记录
  const [selectedHistoryImage, setSelectedHistoryImage] = useState<DetectionRecord | null>(null);
  
  // 移动设备侧边栏状态
  const [isMobileHistorySidebarOpen, setIsMobileHistorySidebarOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
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

  // 加载缺陷字典（确保 /api/defect-classes 调用）
  useEffect(() => {
    let cancelled = false;
    const loadDefectClasses = async () => {
      try {
        const res = await getDefectClasses();
        if (cancelled) return;
        setDefectClasses(res.items);

        const names = res.items
          .map(item => item.desc || item.name || item.tag)
          .filter((name): name is string => Boolean(name));

        if (names.length > 0) {
          setAvailableDefectTypes(names);
          setSelectedDefectTypes(prev => {
            const filtered = prev.filter(name => names.includes(name));
            return filtered.length > 0 ? filtered : names;
          });
          const toHex = (num: number) => num.toString(16).padStart(2, '0');
          const accentMap = { ...defectAccentColors };
          res.items.forEach(item => {
            const key = item.desc || item.name || item.tag;
            if (!key) return;
            const { red, green, blue } = item.color;
            accentMap[key] = `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
          });
          setDefectAccentMap(accentMap);
        }
      } catch (error) {
        console.warn('⚠️ 加载缺陷字典失败:', error);
      }
    };

    loadDefectClasses();
    return () => {
      cancelled = true;
    };
  }, []);
  
  // 缺陷类型过滤
  const [selectedDefectTypes, setSelectedDefectTypes] = useState<string[]>(defectTypes);

  // 钢板记录数据（从 API 或本地模拟数据加载）
  const [steelPlates, setSteelPlates] = useState<SteelPlate[]>([]);
  const [isLoadingSteels, setIsLoadingSteels] = useState(false);
  const [steelsLoadError, setSteelsLoadError] = useState<string | null>(null);

  // 加载钢板列表的函数（提取出来以便重用）
  const loadSteelPlates = async () => {
    setIsLoadingSteels(true);
    setSteelsLoadError(null);
    
    try {
      const items: SteelItem[] = await listSteels(50);
      
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

  // 筛选和搜索钢板列表
  const filteredSteelPlates = steelPlates.filter(plate => {
    // 搜索条件
    if (searchCriteria.serialNumber && !plate.serialNumber.includes(searchCriteria.serialNumber)) {
      return false;
    }
    if (searchCriteria.plateId && !plate.plateId.includes(searchCriteria.plateId)) {
      return false;
    }
    if (searchCriteria.dateFrom && plate.timestamp < new Date(searchCriteria.dateFrom)) {
      return false;
    }
    if (searchCriteria.dateTo && plate.timestamp > new Date(searchCriteria.dateTo)) {
      return false;
    }

    // 筛选条件
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
          return;
        }

        const seqNo = parseInt(selectedPlate.serialNumber, 10);
        console.log(`🔍 加载钢板 ${selectedPlateId} (seq_no: ${seqNo}) 的缺陷数据...`);
        
        const defectItems: DefectItem[] = await getDefects(seqNo);
        
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
        console.log(`✅ 成功加载 ${mapped.length} 个缺陷 (${env.getMode()} 模式)`);
      } catch (error) {
        console.error('❌ 加载缺陷数据失败:', error);
        setPlateDefects([]);
      } finally {
        setIsLoadingDefects(false);
      }
    };

    loadPlateDefects();
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
        <div className="h-10 bg-muted border-b border-border flex items-center justify-between px-4 select-none shrink-0">
          {/* Left: Menu and Tab Buttons */}
          <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
            title={isSidebarCollapsed ? "展开侧栏" : "折叠侧栏"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors focus:outline-none outline-none">
                <Menu className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-card border-border text-foreground">
              <DropdownMenuLabel>Main Menu</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {['FILE', 'VIEW', 'DETECTION', 'TOOLS', 'WINDOW', 'HELP'].map((item) => (
                <DropdownMenuItem key={item} className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs">
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="w-px h-4 bg-border mx-1"></div>

          {/* Tab Buttons - 缺陷/图像 */}
          <button 
            onClick={() => setActiveTab('defects')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors rounded-sm ${
              activeTab === 'defects'
                ? 'bg-primary/90 text-primary-foreground border border-primary/50'
                : 'bg-muted/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-border'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            缺陷
          </button>
          
          <button 
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors rounded-sm ${
              activeTab === 'images'
                ? 'bg-primary/90 text-primary-foreground border border-primary/50'
                : 'bg-muted/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-border'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            图像
          </button>
          </div>

          {/* Center: App Title - 仅在桌面大屏显示 */}
          <div className="hidden xl:flex items-center gap-2 flex-1 justify-center px-4">
            <Scan className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium tracking-wider">STEEL-EYE PRO v2.0.1</span>
          </div>

          {/* Right: Status and Window Controls */}
          <div className="flex items-center gap-4">
            {/* 钢板导航 */}
            {filteredSteelPlates.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-1 bg-background/50 border border-border rounded">
                <button
                  onClick={() => {
                  if (filteredSteelPlates.length === 0) return;
                  const currentIndex = filteredSteelPlates.findIndex(p => p.plateId === selectedPlateId);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredSteelPlates.length - 1;
                  const prevPlate = filteredSteelPlates[prevIndex];
                  if (prevPlate) setSelectedPlateId(prevPlate.plateId);
                }}
                className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
                title="上一块钢板"
                disabled={filteredSteelPlates.length === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-foreground px-1">
                  {(() => {
                    const currentPlate = filteredSteelPlates.find(p => p.plateId === selectedPlateId) || filteredSteelPlates[0];
                    return currentPlate?.plateId || '-';
                  })()}
                </span>
                <button
                  onClick={() => {
                    if (filteredSteelPlates.length === 0) return;
                    const currentIndex = filteredSteelPlates.findIndex(p => p.plateId === selectedPlateId);
                    const nextIndex = currentIndex < filteredSteelPlates.length - 1 ? currentIndex + 1 : 0;
                    const nextPlate = filteredSteelPlates[nextIndex];
                    if (nextPlate) setSelectedPlateId(nextPlate.plateId);
                  }}
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
            {(activeTab === 'defects' || activeTab === 'images') && (
              <div className="flex items-center gap-1 bg-background/50 border border-border rounded-sm p-0.5">
              <button
                onClick={() => setSurfaceFilter('top')}
                className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                  surfaceFilter === 'top'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                上表
              </button>
              <button
                onClick={() => setSurfaceFilter('bottom')}
                className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                  surfaceFilter === 'bottom'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                下表
              </button>
              <button
                onClick={() => setSurfaceFilter('all')}
                className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                  surfaceFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
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
                  setActiveTab('reports');
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
                  setActiveTab('settings');
                  setShowPlatesPanel(false);
                }}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="系统设置"
              >
                <Settings className="w-4 h-4" />
              </button>
            
              <div className="w-px h-4 bg-border mx-1 hidden xl:block"></div>
              
              {/* 窗口控制按钮 - 仅桌面版本显示 */}
              <div className="hidden xl:flex items-center gap-2">
                <button className="p-1.5 hover:bg-white/10 rounded"><Minus className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-white/10 rounded"><Maximize2 className="w-4 h-4" /></button>
                <button className="p-1.5 hover:bg-red-500/80 rounded"><X className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 手机模式：顶部导航栏 */}
      {isMobileDevice && !showPlatesPanel && (
        <div className="h-14 bg-card border-b border-border flex items-center justify-between px-2 shrink-0 gap-2">
          {/* 左侧：钢板列表按钮 */}
          <button
            onClick={() => setShowPlatesPanel(true)}
            className="p-2 bg-[rgba(23,23,23,0)] text-[rgb(0,0,0)] hover:bg-primary/80 rounded shrink-0"
            title="钢板列表"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* 中间区域：缺陷/图像切换 + 钢板切换 + 表面切换 */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
            {/* 缺陷/图像切换 */}
            <button
              onClick={() => {
                if (activeTab === 'defects') {
                  setActiveTab('images');
                } else if (activeTab === 'images') {
                  setActiveTab('defects');
                } else {
                  setActiveTab('defects');
                }
              }}
              className="flex items-center gap-1 px-2 py-1.5 bg-muted hover:bg-accent border border-border rounded shrink-0 transition-colors"
              title={activeTab === 'defects' ? '切换到图像' : activeTab === 'images' ? '切换到缺陷' : '缺陷/图像'}
            >
              {activeTab === 'defects' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <ChevronRight className="w-3 h-3" />
                  <Images className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Images className="w-4 h-4" />
                  <ChevronRight className="w-3 h-3" />
                  <AlertCircle className="w-4 h-4" />
                </>
              )}
            </button>
            
            {/* 钢板切换 */}
            {filteredSteelPlates.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-muted border border-border rounded shrink-0">
                <button
                  onClick={() => {
                    if (filteredSteelPlates.length === 0) return;
                    const currentIndex = filteredSteelPlates.findIndex(p => p.plateId === selectedPlateId);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredSteelPlates.length - 1;
                    const prevPlate = filteredSteelPlates[prevIndex];
                    if (prevPlate) setSelectedPlateId(prevPlate.plateId);
                  }}
                  className="p-0.5 hover:bg-accent/50 active:bg-accent text-muted-foreground hover:text-foreground transition-colors rounded"
                  disabled={filteredSteelPlates.length === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-foreground px-1 min-w-[70px] text-center">
                  {(() => {
                    const currentPlate = filteredSteelPlates.find(p => p.plateId === selectedPlateId) || filteredSteelPlates[0];
                    return currentPlate?.plateId || '-';
                  })()}
                </span>
                <button
                  onClick={() => {
                    if (filteredSteelPlates.length === 0) return;
                    const currentIndex = filteredSteelPlates.findIndex(p => p.plateId === selectedPlateId);
                    const nextIndex = currentIndex < filteredSteelPlates.length - 1 ? currentIndex + 1 : 0;
                    const nextPlate = filteredSteelPlates[nextIndex];
                    if (nextPlate) setSelectedPlateId(nextPlate.plateId);
                  }}
                  className="p-0.5 hover:bg-accent/50 active:bg-accent text-muted-foreground hover:text-foreground transition-colors rounded"
                  disabled={filteredSteelPlates.length === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* 表面切换（上表/下表/全部） */}
            {(activeTab === 'defects' || activeTab === 'images') && (
              <div className="flex items-center gap-1 bg-muted border border-border rounded p-0.5 shrink-0">
                <button
                  onClick={() => setSurfaceFilter('top')}
                  className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                    surfaceFilter === 'top'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  上表
                </button>
                <button
                  onClick={() => setSurfaceFilter('bottom')}
                  className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                    surfaceFilter === 'bottom'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  下表
                </button>
                <button
                  onClick={() => setSurfaceFilter('all')}
                  className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                    surfaceFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  全部
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - 仅桌面端显示 */}
        <div className={`${isMobileDevice ? 'hidden' : (isSidebarCollapsed ? 'w-0' : 'w-64')} bg-muted/30 border-r border-border flex flex-col shrink-0 transition-all duration-300 overflow-hidden`}>

          {/* Steel Plates Record List */}
          {!isSidebarCollapsed && (
            <div className="flex-1 flex flex-col min-h-0 border-t border-border">
              {/* 当前钢板详细信息 */}
              <div className="p-2 bg-muted/10 border-b border-border">
                <div className="bg-card border border-border/50">
                  <div className="px-2 py-1.5 bg-primary/20 border-b border-border">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">当前钢板信息</h3>
                  </div>
                  {(() => {
                    const currentPlate = filteredSteelPlates.find(p => p.plateId === selectedPlateId) || filteredSteelPlates[0] || steelPlates[0];
                    
                    // 如果没有钢板数据，显示加载或空状态
                    if (!currentPlate) {
                      return (
                        <div className="p-2 text-xs text-center text-muted-foreground">
                          {isLoadingSteels ? '加载中...' : '暂无钢板数据'}
                        </div>
                      );
                    }
                    
                    return (
                      <div className="p-2 text-xs space-y-1">
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">流水号</span>
                          <span className="font-mono font-bold">{currentPlate.serialNumber}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">钢板号</span>
                          <span className="font-mono font-bold">{currentPlate.plateId}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">钢种</span>
                          <span className="font-mono font-bold">{currentPlate.steelGrade}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">规格</span>
                          <span className="font-mono font-bold text-[10px]">
                            {currentPlate.dimensions.length}×{currentPlate.dimensions.width}×{currentPlate.dimensions.thickness}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">时间</span>
                          <span className="font-mono">{currentPlate.timestamp.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">等级</span>
                          <span className={`px-1.5 py-0.5 rounded-sm border ${
                            currentPlate.level === 'A' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                            currentPlate.level === 'B' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                            currentPlate.level === 'C' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                            'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>{getLevelText(currentPlate.level)}</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-muted-foreground">缺陷数</span>
                          <span className="font-mono font-bold text-red-400">{currentPlate.defectCount}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="p-2 bg-muted/20 flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  钢板记录 
                  <span className="ml-1 text-[9px] text-primary">
                    {(Object.keys(searchCriteria).length > 0 || filterCriteria.levels.length > 0) 
                      ? `(${filteredSteelPlates.length}/${steelPlates.length})`
                      : `(${steelPlates.length})`
                    }
                  </span>
                </h3>
                <div className="flex items-center gap-1">
                  <button 
                    ref={searchButtonRef}
                    onClick={() => setIsSearchDialogOpen(true)}
                    className={`p-1 hover:bg-accent/50 border transition-colors rounded ${
                      Object.keys(searchCriteria).length > 0 
                        ? 'bg-primary/20 border-primary/50 text-primary' 
                        : 'border-border/50 bg-card/50 text-muted-foreground'
                    }`}
                    title="查询"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    ref={filterButtonRef}
                    onClick={() => setIsFilterDialogOpen(true)}
                    className={`p-1 hover:bg-accent/50 border transition-colors rounded ${
                      filterCriteria.levels.length > 0 
                        ? 'bg-primary/20 border-primary/50 text-primary' 
                        : 'border-border/50 bg-card/50 text-muted-foreground'
                    }`}
                    title="筛选"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      setSearchCriteria({});
                      setFilterCriteria({ levels: [] });
                    }}
                    className="p-1 hover:bg-accent/50 border border-border/50 bg-card/50 text-muted-foreground transition-colors rounded"
                    title="刷新/重置"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {filteredSteelPlates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-xs">没有找到��配的钢板记录</p>
                    <button
                      onClick={() => {
                        setSearchCriteria({});
                        setFilterCriteria({ levels: [] });
                      }}
                      className="mt-2 text-[10px] text-primary hover:underline"
                    >
                      清除筛选条件
                    </button>
                  </div>
                ) : (
                  filteredSteelPlates.map((plate) => (
                  <div 
                    key={plate.plateId}
                    onClick={() => setSelectedPlateId(plate.plateId)}
                    className={`p-1.5 border transition-all cursor-pointer ${
                      selectedPlateId === plate.plateId 
                        ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20' 
                        : 'bg-card/50 border-border/50 hover:bg-accent/30 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {plate.serialNumber}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
                        plate.level === 'A' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                        plate.level === 'B' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                        plate.level === 'C' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                        'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}>
                        {getLevelText(plate.level)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-mono font-bold ${selectedPlateId === plate.plateId ? 'text-primary-foreground' : ''}`}>
                        {plate.plateId}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {plate.steelGrade}
                      </span>
                    </div>
                    <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
                      {plate.dimensions.length}×{plate.dimensions.width}×{plate.dimensions.thickness}
                    </div>
                  </div>
                  ))
                )}
              </div>
              
              {/* 上传按钮区域 - 底部固定 */}
              <div className="p-2 bg-muted/20 border-t border-border space-y-1 shrink-0">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const imageUrl = event.target?.result as string;
                          handleImageUpload(imageUrl);
                          setActiveTab('defects'); // 切换到缺陷界面
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/80 text-primary-foreground text-xs font-bold cursor-pointer border border-primary/50 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    上传缺陷图像
                  </div>
                </label>
                
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const imageUrl = event.target?.result as string;
                          handleImageUpload(imageUrl);
                          setActiveTab('images'); // 切换到图像界面
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer border border-blue-500/50 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    上传钢板图像
                  </div>
                </label>
              </div>
            </div>
          )}
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
                    const count = (detectionResult?.defects || []).filter(d => d.type === type).length;
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
          <div className={`flex-1 overflow-auto ${isMobileDevice ? 'p-2' : 'p-4'}`}>
            {/* 钢板面板（桌面和手机模式） */}
            {showPlatesPanel && (
              <div className={`h-full flex flex-col bg-background ${isMobileDevice ? '-m-2' : '-m-4'}`}>
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
                <div className="flex-1 overflow-auto">
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
            {!showPlatesPanel && activeTab === 'defects' && (
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
                              defects={detectionResult?.defects || []}
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
                      <div className="p-2 border-b border-border bg-muted/20">
                        {/* 视图切换 */}
                        <div className="flex items-center gap-1 bg-background border border-border rounded-sm p-0.5">
                          <button
                            onClick={() => setDefectLogView('list')}
                            className={`flex-1 px-2 py-1 text-[10px] rounded-sm transition-colors flex items-center justify-center gap-1 ${
                              defectLogView === 'list'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="列表视图"
                          >
                            <List className="w-3 h-3" />
                            列表
                          </button>
                          <button
                            onClick={() => setDefectLogView('chart')}
                            className={`flex-1 px-2 py-1 text-[10px] rounded-sm transition-colors flex items-center justify-center gap-1 ${
                              defectLogView === 'chart'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="分布图"
                          >
                            <PieChart className="w-3 h-3" />
                            分布图
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto p-2">
                        {(() => {
                          const filteredDefects = (detectionResult?.defects || []).filter(d => 
                            (surfaceFilter === 'all' || d.surface === surfaceFilter) &&
                            selectedDefectTypes.includes(d.type)
                          );
                          return defectLogView === 'list' ? (
                            <DefectList defects={filteredDefects} isDetecting={isDetecting} surface={surfaceFilter} defectColors={defectColorMap} />
                          ) : (
                            <DefectDistributionChart defects={filteredDefects} surface={surfaceFilter} defectColors={defectColorMap} />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
            )}

            {!showPlatesPanel && activeTab === 'images' && (
              <div className="h-full flex flex-col bg-card border border-border">
                {/* 图像显示区域 */}
                <div className="flex-1 relative min-h-0 bg-black/40">
                  {(() => {
                    // 优先显示上传的图像
                    if (currentImage) {
                      return (
                        <DetectionResult
                          imageUrl={currentImage}
                          defects={(detectionResult?.defects || []).filter(d => 
                            (surfaceFilter === 'all' || d.surface === surfaceFilter) &&
                            selectedDefectTypes.includes(d.type)
                          )}
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
                    
                    // 无选中钢板时的提示
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
                            {currentImage ? (selectedPlateId || '上��图像') : plateRecord?.id}
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
                            {currentImage ? (detectionResult?.defects || []).length : plateRecord?.defects.length || 0}
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
                <div className="flex-1 overflow-auto">
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
              <div className="max-w-2xl mx-auto space-y-6 p-8 border border-border bg-card mt-8">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-lg font-medium">SYSTEM CONFIGURATION</h3>
                  <p className="text-sm text-muted-foreground">Manage detection parameters and device settings</p>
                </div>
                
                {/* API 模式切换 */}
                <ModeSwitch />
                
                <div className="space-y-4">
                  {/* 主题设置 */}
                  <div className="grid grid-cols-2 items-center gap-4">
                     <label className="text-sm font-medium">THEME / 主题</label>
                     <div className="flex items-center gap-2 bg-background border border-border rounded-sm p-1">
                       <button
                         onClick={() => setTheme('light')}
                         className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                           theme === 'light'
                             ? 'bg-primary text-primary-foreground'
                             : 'text-muted-foreground hover:text-foreground'
                         }`}
                       >
                         <Sun className="w-3.5 h-3.5" />
                         LIGHT
                       </button>
                       <button
                         onClick={() => setTheme('dark')}
                         className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                           theme === 'dark'
                             ? 'bg-primary text-primary-foreground'
                             : 'text-muted-foreground hover:text-foreground'
                         }`}
                       >
                         <Moon className="w-3.5 h-3.5" />
                         DARK
                       </button>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 items-center gap-4">
                     <label className="text-sm font-medium">DETECTION THRESHOLD</label>
                     <input type="range" className="w-full accent-primary" />
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                     <label className="text-sm font-medium">CAMERA EXPOSURE</label>
                     <input type="range" className="w-full accent-primary" />
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                     <label className="text-sm font-medium">AUTO-ARCHIVE LOGS</label>
                     <div className="flex items-center gap-2">
                       <input type="checkbox" checked readOnly className="accent-primary w-4 h-4" />
                       <span className="text-sm text-muted-foreground">ENABLED</span>
                     </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-2">
                  <button className="px-4 py-2 border border-border hover:bg-accent text-sm transition-colors">RESET</button>
                  <button className="px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">SAVE CHANGES</button>
                </div>
              </div>
            )}

            {!showPlatesPanel && activeTab === 'images' && (
              <div className="h-full flex flex-col bg-card border border-border">
                {/* 图像显示区域 */}
                <div className="flex-1 relative min-h-0 bg-black/40">
                  {(() => {
                    // 优先显示上传的图像
                    if (currentImage) {
                      return (
                        <DetectionResult
                          imageUrl={currentImage}
                          defects={(detectionResult?.defects || []).filter(d => 
                            (surfaceFilter === 'all' || d.surface === surfaceFilter) &&
                            selectedDefectTypes.includes(d.type)
                          )}
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
                            {currentImage ? (detectionResult?.defects || []).length : plateRecord?.defects.length || 0}
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
                <div className="flex-1 overflow-auto">
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
              <div className="max-w-2xl mx-auto space-y-6 p-8 border border-border bg-card mt-8">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-lg font-medium">SYSTEM CONFIGURATION</h3>
                  <p className="text-sm text-muted-foreground">Manage detection parameters and device settings</p>
                </div>
                
                {/* API 模式切换 */}
                <ModeSwitch />
                
                <div className="space-y-4">
                  {/* 主题设置 */}
                  <div className="grid grid-cols-2 items-center gap-4">
                     <label className="text-sm font-medium">THEME / 主题</label>
                     <div className="flex items-center gap-2 bg-background border border-border rounded-sm p-1">
                       <button
                         onClick={() => setTheme('light')}
                         className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                           theme === 'light'
                             ? 'bg-primary text-primary-foreground'
                             : 'text-muted-foreground hover:text-foreground'
                         }`}
                       >
                         <Sun className="w-3.5 h-3.5" />
                         LIGHT
                       </button>
                       <button
                         onClick={() => setTheme('dark')}
                         className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                           theme === 'dark'
                             ? 'bg-primary text-primary-foreground'
                             : 'text-muted-foreground hover:text-foreground'
                         }`}
                       >
                         <Moon className="w-3.5 h-3.5" />
                         DARK
                       </button>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 items-center gap-4">
                     <label className="text-sm font-medium">DETECTION THRESHOLD</label>
                     <input type="range" className="w-full accent-primary" />
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                     <label className="text-sm font-medium">CAMERA EXPOSURE</label>
                     <input type="range" className="w-full accent-primary" />
                  </div>
                  <div className="grid grid-cols-2 items-center gap-4">
                     <label className="text-sm font-medium">AUTO-ARCHIVE LOGS</label>
                     <div className="flex items-center gap-2">
                       <input type="checkbox" checked readOnly className="accent-primary w-4 h-4" />
                       <span className="text-sm text-muted-foreground">ENABLED</span>
                     </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-2">
                  <button className="px-4 py-2 border border-border hover:bg-accent text-sm transition-colors">RESET</button>
                  <button className="px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">SAVE CHANGES</button>
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
        onSearch={setSearchCriteria}
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
