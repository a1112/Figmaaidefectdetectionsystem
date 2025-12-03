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
  RotateCcw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./components/ui/dropdown-menu";

export interface Defect {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  surface: 'top' | 'bottom'; // 钢板表面：上表面或下表面
}

export interface DetectionRecord {
  id: string;
  defectImageUrl: string; // 缺陷图像（单个缺陷特写）
  fullImageUrl: string; // 完整钢板图像
  timestamp: Date;
  defects: Defect[];
  status: 'pass' | 'warning' | 'fail';
}

export interface SteelPlate {
  serialNumber: string; // 流水号
  plateId: string; // 8位钢板号
  steelGrade: string; // 5位钢种
  dimensions: { length: number; width: number; thickness: number }; // 规格（长×宽×厚，单位：mm）
  timestamp: Date;
  level: 'A' | 'B' | 'C' | 'D'; // 质量级别
  defectCount: number; // 缺陷数量
}

// 等级映射函数
const getLevelText = (level: 'A' | 'B' | 'C' | 'D'): string => {
  const levelMap = {
    'A': '一等品',
    'B': '二等品',
    'C': '三等品',
    'D': '等外品'
  };
  return levelMap[level];
};

export default function App() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionRecord | null>(null);
  const [history, setHistory] = useState<DetectionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'defects' | 'images' | 'plates' | 'reports' | 'settings'>('defects');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(null);
  const [defectLogView, setDefectLogView] = useState<'list' | 'chart'>('list');
  const [surfaceFilter, setSurfaceFilter] = useState<'all' | 'top' | 'bottom'>('all');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isDiagnosticDialogOpen, setIsDiagnosticDialogOpen] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({ levels: [] });
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
  
  // 缺陷类型过滤
  const defectTypes = ['纵向裂纹', '横向裂纹', '异物压入', '孔洞', '辊印', '压氧', '边裂', '划伤'];
  const [selectedDefectTypes, setSelectedDefectTypes] = useState<string[]>(defectTypes);
  
  // 缺陷类型颜色映射
  const defectColors: { [key: string]: { bg: string; border: string; text: string; activeBg: string; activeBorder: string; activeText: string } } = {
    '纵向裂纹': { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', activeBg: 'bg-red-500', activeBorder: 'border-red-500', activeText: 'text-white' },
    '横向裂纹': { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-400', activeBg: 'bg-orange-500', activeBorder: 'border-orange-500', activeText: 'text-white' },
    '异物压入': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', activeBg: 'bg-yellow-500', activeBorder: 'border-yellow-500', activeText: 'text-white' },
    '孔洞': { bg: 'bg-green-500/10', border: 'border-green-500/40', text: 'text-green-400', activeBg: 'bg-green-500', activeBorder: 'border-green-500', activeText: 'text-white' },
    '辊印': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', text: 'text-cyan-400', activeBg: 'bg-cyan-500', activeBorder: 'border-cyan-500', activeText: 'text-white' },
    '压氧': { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400', activeBg: 'bg-blue-500', activeBorder: 'border-blue-500', activeText: 'text-white' },
    '边裂': { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-400', activeBg: 'bg-purple-500', activeBorder: 'border-purple-500', activeText: 'text-white' },
    '划伤': { bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-400', activeBg: 'bg-pink-500', activeBorder: 'border-pink-500', activeText: 'text-white' }
  };

  // 钢板记录模拟数据
  const [steelPlates] = useState<SteelPlate[]>([
    { serialNumber: '00000001', plateId: 'SP240001', steelGrade: 'Q345B', dimensions: { length: 12000, width: 2500, thickness: 20 }, timestamp: new Date('2024-12-02T08:23:15'), level: 'A', defectCount: 2 },
    { serialNumber: '00000002', plateId: 'SP240002', steelGrade: 'Q235B', dimensions: { length: 10000, width: 2000, thickness: 16 }, timestamp: new Date('2024-12-02T09:15:42'), level: 'B', defectCount: 5 },
    { serialNumber: '00000003', plateId: 'SP240003', steelGrade: 'Q345B', dimensions: { length: 11000, width: 2200, thickness: 18 }, timestamp: new Date('2024-12-02T10:08:21'), level: 'A', defectCount: 1 },
    { serialNumber: '00000004', plateId: 'SP240004', steelGrade: '16MnR', dimensions: { length: 9500, width: 1800, thickness: 22 }, timestamp: new Date('2024-12-02T11:42:33'), level: 'C', defectCount: 8 },
    { serialNumber: '00000005', plateId: 'SP240005', steelGrade: 'Q235B', dimensions: { length: 13000, width: 2600, thickness: 25 }, timestamp: new Date('2024-12-02T13:25:18'), level: 'B', defectCount: 4 },
    { serialNumber: '00000006', plateId: 'SP240006', steelGrade: 'Q345B', dimensions: { length: 11500, width: 2300, thickness: 20 }, timestamp: new Date('2024-12-02T14:17:09'), level: 'A', defectCount: 3 },
    { serialNumber: '00000007', plateId: 'SP240007', steelGrade: '20MnK', dimensions: { length: 10500, width: 2100, thickness: 30 }, timestamp: new Date('2024-12-02T15:33:27'), level: 'D', defectCount: 12 },
  ]);

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

  const generateRandomDefects = (): Defect[] => {
    const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const numDefects = Math.floor(Math.random() * 8) + 4; // 4-11个缺陷，增加测试数据
    
    return Array.from({ length: numDefects }, (_, i) => ({
      id: `defect-${Date.now()}-${i}`,
      type: defectTypes[Math.floor(Math.random() * defectTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      x: Math.random() * 80 + 5,  // 5-85范围，避免边缘
      y: Math.random() * 80 + 5,  // 5-85范围，避免边缘
      width: Math.random() * 8 + 3,  // 3-11大小
      height: Math.random() * 8 + 3, // 3-11大小
      confidence: Math.random() * 0.25 + 0.7, // 70-95%置信度
      surface: Math.random() < 0.5 ? 'top' : 'bottom'
    }));
  };

  // 生成缺陷统计数据
  const getDefectStats = () => {
    const stats: { [key: string]: number } = {};
    
    defectTypes.forEach(type => { stats[type] = 0; });
    
    history.forEach(record => {
      record.defects.forEach(defect => {
        if (stats[defect.type] !== undefined) {
          stats[defect.type]++;
        }
      });
    });
    
    return defectTypes.map(type => ({
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

          {/* Tab Buttons */}
          <button 
            onClick={() => setActiveTab('defects')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs transition-colors rounded-sm ${
              activeTab === 'defects' 
                ? 'bg-primary/80 text-primary-foreground border border-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            缺陷
          </button>
          <button 
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs transition-colors rounded-sm ${
              activeTab === 'images' 
                ? 'bg-primary/80 text-primary-foreground border border-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            图像
          </button>
          <button 
            onClick={() => {
              setActiveTab('reports');
              setIsSidebarCollapsed(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs transition-colors rounded-sm ${
              activeTab === 'reports' 
                ? 'bg-primary/80 text-primary-foreground border border-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            报表
          </button>
        </div>

        {/* Center: App Title */}
        <div className="flex items-center gap-2 flex-1 justify-center px-4">
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
                  const currentIndex = filteredSteelPlates.findIndex(p => p.plateId === selectedPlateId);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredSteelPlates.length - 1;
                  setSelectedPlateId(filteredSteelPlates[prevIndex].plateId);
                }}
                className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
                title="上一块钢板"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-foreground px-1">
                {(() => {
                  const currentPlate = filteredSteelPlates.find(p => p.plateId === selectedPlateId) || filteredSteelPlates[0];
                  return currentPlate.plateId;
                })()}
              </span>
              <button
                onClick={() => {
                  const currentIndex = filteredSteelPlates.findIndex(p => p.plateId === selectedPlateId);
                  const nextIndex = currentIndex < filteredSteelPlates.length - 1 ? currentIndex + 1 : 0;
                  setSelectedPlateId(filteredSteelPlates[nextIndex].plateId);
                }}
                className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
                title="下一块钢板"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 px-3 py-1 bg-background/50 border border-border rounded text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            SYSTEM READY
          </div>
          
          {/* 表面切换 */}
          {activeTab === 'defects' && (
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
            <button 
              ref={diagnosticButtonRef}
              onClick={() => setIsDiagnosticDialogOpen(true)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="系统诊断"
            >
              <Activity className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="系统设置"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded"><Minus className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-white/10 rounded"><Maximize2 className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-red-500/80 rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      )}
      
      {/* 手机模式：顶部导航栏 */}
      {isMobileDevice && (
        <div className="h-14 bg-card border-b border-border flex items-center justify-between px-3 shrink-0">
          {/* 左侧：侧边栏开关（仅在图像界面显示） */}
          {activeTab === 'images' && (
            <button
              onClick={() => setIsMobileHistorySidebarOpen(true)}
              className="p-2 bg-primary text-primary-foreground hover:bg-primary/80 rounded"
              title="打开历史记录"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          {/* 中间：钢板切换 */}
          {filteredSteelPlates.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded">
              <button
                onClick={() => {
                  const currentIndex = filteredSteelPlates.findIndex(p => p.plateId === selectedPlateId);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredSteelPlates.length - 1;
                  setSelectedPlateId(filteredSteelPlates[prevIndex].plateId);
                }}
                className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-mono font-bold text-foreground px-2 min-w-[80px] text-center">
                {(() => {
                  const currentPlate = filteredSteelPlates.find(p => p.plateId === selectedPlateId) || filteredSteelPlates[0];
                  return currentPlate.plateId;
                })()}
              </span>
              <button
                onClick={() => {
                  const currentIndex = filteredSteelPlates.findIndex(p => p.plateId === selectedPlateId);
                  const nextIndex = currentIndex < filteredSteelPlates.length - 1 ? currentIndex + 1 : 0;
                  setSelectedPlateId(filteredSteelPlates[nextIndex].plateId);
                }}
                className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* 右侧：表面切换按钮 */}
          {activeTab === 'defects' && (
            <div className="flex items-center gap-1 bg-muted border border-border rounded p-0.5">
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
                    <p className="text-xs">没有找到匹配的钢板记录</p>
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
          {/* Toolbar - 仅桌面端显示 */}
          {!isMobileDevice && (
          <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50 shrink-0">
            <h2 className="font-medium text-lg tracking-tight">
              {activeTab === 'defects' ? 'DASHBOARD / REAL-TIME' : 
               activeTab === 'images' ? 'DATABASE / HISTORY LOGS' : 
               activeTab === 'reports' ? 'STATISTICS / DEFECT ANALYSIS' :
               'SYSTEM CONFIGURATION'}
            </h2>
            <div className="flex items-center gap-3">
              {/* 缺陷类型过滤器 */}
              {activeTab === 'defects' && (
                <>
                  {/* 缺陷类型复选框 */}
                  <div className="flex items-center gap-2">
                    {defectTypes.map((type) => {
                      const count = (detectionResult?.defects || []).filter(d => d.type === type).length;
                      const isSelected = selectedDefectTypes.includes(type);
                      const colors = defectColors[type];
                      
                      // 从 Tailwind 颜色类中提取实际颜色值
                      const accentColorMap: { [key: string]: string } = {
                        '纵向裂纹': '#ef4444',
                        '横向裂纹': '#f97316',
                        '异物压入': '#eab308',
                        '孔洞': '#22c55e',
                        '辊印': '#06b6d4',
                        '压氧': '#3b82f6',
                        '边裂': '#a855f7',
                        '划伤': '#ec4899',
                      };
                      
                      return (
                        <label
                          key={type}
                          className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
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
                            style={{ accentColor: accentColorMap[type] }}
                            className="w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-foreground">
                            {type}({count})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  
                  <div className="w-px h-6 bg-border mx-1"></div>
                  
                  {/* 快捷按钮 */}
                  <button
                    onClick={() => setSelectedDefectTypes(defectTypes)}
                    className="px-3 py-1 text-xs font-bold bg-primary hover:bg-primary/80 text-white border border-primary transition-colors"
                  >
                    全选
                  </button>
                  <button
                    onClick={() => setSelectedDefectTypes([])}
                    className="px-3 py-1 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 transition-colors"
                  >
                    清
                  </button>
                </>
              )}
            </div>
          </div>
          )}

          {/* Scrollable Content */}
          <div className={`flex-1 overflow-auto ${isMobileDevice ? 'p-2' : 'p-4'}`}>
            {activeTab === 'defects' && (
              <div className={`h-full flex flex-col ${isMobileDevice ? 'gap-2' : 'space-y-4'}`}>
                <div className={`grid grid-cols-1 gap-4 flex-1 min-h-0 ${!isMobileDevice && 'lg:grid-cols-3'}`}>
                  {/* Left: Viewport */}
                  <div className={`flex flex-col gap-4 ${!isMobileDevice && 'lg:col-span-2'}`}>
                    <div className="flex-1 bg-card border border-border p-1 relative min-h-[300px] flex flex-col">
                      {!isMobileDevice && (
                      <div className="absolute top-0 left-0 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold z-10">
                        CAM-01 LIVE FEED
                      </div>
                      )}
                      
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

                  {/* Right: Logs/List - 手机模式下隐藏 */}
                  {!isMobileDevice && (
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
                            <DefectList defects={filteredDefects} isDetecting={isDetecting} surface={surfaceFilter} defectColors={defectColors} />
                          ) : (
                            <DefectDistributionChart defects={filteredDefects} surface={surfaceFilter} defectColors={defectColors} />
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="h-full relative">
                {/* 移动设备：抽屉遮罩层 */}
                {isMobileDevice && (
                  <div 
                    className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
                      isMobileHistorySidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={() => setIsMobileHistorySidebarOpen(false)}
                  />
                )}
                
                {/* 移动设备：抽屉（浮动在界面上层，不占据布局空间） */}
                {isMobileDevice && (
                  <div className={`
                    fixed top-0 left-0 h-full z-50 
                    transition-all duration-300 ease-out 
                    w-80 max-w-[85vw] 
                    shadow-2xl 
                    bg-card border-r border-border
                    flex flex-col
                    ${isMobileHistorySidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                  `}>
                    <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
                      <h3 className="font-medium text-sm">HISTORY LOGS</h3>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-sm hover:bg-primary/80">EXPORT</button>
                        <button 
                          onClick={() => setIsMobileHistorySidebarOpen(false)}
                          className="p-1 hover:bg-accent rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                      {history.length === 0 ? (
                        <p className="text-muted-foreground text-xs p-4 text-center">NO RECORDS</p>
                      ) : (
                        history.map((record) => (
                          <div 
                            key={record.id} 
                            onClick={() => {
                              setSelectedHistoryImage(record);
                              setIsMobileHistorySidebarOpen(false);
                            }}
                            className={`flex items-center gap-3 p-2 border cursor-pointer transition-all ${
                              selectedHistoryImage?.id === record.id
                                ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20'
                                : 'border-border bg-muted/10 hover:bg-muted/30 hover:border-border'
                            }`}
                          >
                            <div className="w-12 h-12 bg-black/50 border border-border shrink-0 overflow-hidden flex items-center justify-center">
                              <img src={record.fullImageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-mono text-xs truncate">{record.id}</p>
                                <span className={`text-[10px] px-1 py-0.5 border shrink-0 ${
                                  record.status === 'pass' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 
                                  record.status === 'fail' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                                  'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
                                }`}>
                                  {record.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="font-mono">{record.timestamp.toLocaleTimeString()}</span>
                                <span>缺陷: {record.defects.length}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {/* 桌面端：左侧历史记录列表（正常布局） */}
                {!isMobileDevice && (
                  <div className="absolute top-0 left-0 bottom-0 w-96 bg-card border-r border-border flex flex-col z-10">
                    <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
                      <h3 className="font-medium text-sm">HISTORY LOGS</h3>
                      <button className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-sm hover:bg-primary/80">EXPORT</button>
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                      {history.length === 0 ? (
                        <p className="text-muted-foreground text-xs p-4 text-center">NO RECORDS</p>
                      ) : (
                        history.map((record) => (
                          <div 
                            key={record.id} 
                            onClick={() => setSelectedHistoryImage(record)}
                            className={`flex items-center gap-3 p-2 border cursor-pointer transition-all ${
                              selectedHistoryImage?.id === record.id
                                ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20'
                                : 'border-border bg-muted/10 hover:bg-muted/30 hover:border-border'
                            }`}
                          >
                            <div className="w-12 h-12 bg-black/50 border border-border shrink-0 overflow-hidden flex items-center justify-center">
                              <img src={record.fullImageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-mono text-xs truncate">{record.id}</p>
                                <span className={`text-[10px] px-1 py-0.5 border shrink-0 ${
                                  record.status === 'pass' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 
                                  record.status === 'fail' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                                  'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
                                }`}>
                                  {record.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="font-mono">{record.timestamp.toLocaleTimeString()}</span>
                                <span>缺陷: {record.defects.length}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 图像查看器（移动端全宽，桌面端左侧留出空间） */}
                <div className={`h-full bg-card flex flex-col ${!isMobileDevice ? 'ml-96 border border-border' : ''}`}>
                  {!isMobileDevice && (
                  <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
                    <h3 className="font-medium text-sm">IMAGE VIEWER</h3>
                  </div>
                  )}
                  <div className="flex-1 relative min-h-0">
                    {!selectedHistoryImage ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <Images className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-sm">{isMobileDevice ? '点击左上角菜单选择图像' : 'SELECT AN IMAGE FROM HISTORY'}</p>
                      </div>
                    ) : (
                      <DetectionResult
                        imageUrl={selectedHistoryImage.fullImageUrl}
                        defects={selectedHistoryImage.defects}
                        isDetecting={false}
                      />
                    )}
                  </div>
                  
                  {/* 底部信息栏 */}
                  {selectedHistoryImage && (
                    <div className="p-3 border-t border-border bg-muted/20">
                      <div className={`grid ${isMobileDevice ? 'grid-cols-2' : 'grid-cols-4'} gap-4 text-xs`}>
                        <div>
                          <p className="text-muted-foreground mb-1">ID</p>
                          <p className="font-mono truncate">{selectedHistoryImage.id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">TIMESTAMP</p>
                          <p className="font-mono text-[10px]">{selectedHistoryImage.timestamp.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">STATUS</p>
                          <span className={`text-xs px-1.5 py-0.5 border ${
                            selectedHistoryImage.status === 'pass' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 
                            selectedHistoryImage.status === 'fail' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                            'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
                          }`}>
                            {selectedHistoryImage.status.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">DEFECTS</p>
                          <p className="font-mono">{selectedHistoryImage.defects.length}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <DefectReport data={getDefectStats()} steelPlates={steelPlates} />
            )}

            {activeTab === 'plates' && (
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
                              // 手机模式下点击后可以显示详情或切换到缺陷界面
                              setActiveTab('defects');
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

            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6 p-8 border border-border bg-card mt-8">
                <div className="pb-4 border-b border-border">
                  <h3 className="text-lg font-medium">SYSTEM CONFIGURATION</h3>
                  <p className="text-sm text-muted-foreground">Manage detection parameters and device settings</p>
                </div>
                
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
      
      {/* 手机模式：底部导航栏 */}
      {isMobileDevice && (
        <div className="h-16 bg-card border-t border-border flex items-center justify-around px-1 shrink-0 safe-area-inset-bottom">
          <button
            onClick={() => setActiveTab('defects')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 ${
              activeTab === 'defects'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <AlertCircle className={`w-5 h-5 ${activeTab === 'defects' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">缺陷</span>
          </button>
          
          <button
            onClick={() => setActiveTab('images')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 ${
              activeTab === 'images'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <Images className={`w-5 h-5 ${activeTab === 'images' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">图像</span>
          </button>
          
          <button
            onClick={() => setActiveTab('plates')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 ${
              activeTab === 'plates'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <Database className={`w-5 h-5 ${activeTab === 'plates' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">钢板</span>
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 ${
              activeTab === 'reports'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <BarChart3 className={`w-5 h-5 ${activeTab === 'reports' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">报表</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors flex-1 ${
              activeTab === 'settings'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">设置</span>
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