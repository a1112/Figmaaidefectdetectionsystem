import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Menu, Bell, User, Settings, Database, Shield, Monitor, 
  ChevronLeft, ChevronRight, Search, Play, Pause, Square,
  Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCcw, Clock, RotateCw, Gavel,
  Layout, BarChart3, AlertCircle, FileText, ChevronDown, Activity,
  LogOut, Box, Terminal, Home, Calendar, LayoutGrid, Filter, ArrowUpToLine, X,
  PanelRightOpen, PanelRightClose, Target, Locate
} from "lucide-react";
import { StatusBar } from "../../components/layout/StatusBar";
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from "../../components/ThemeContext";
import { env } from "../../config/env";
import { 
  listSteels, 
  getDefectsRaw, 
  getSteelMeta, 
  getTileImageUrl,
  getApiList 
} from "../../api/client";
import type { SteelItem, DefectItem, SurfaceImageInfo, ApiNode } from "../../api/types";
import { toast } from "sonner@2.0.3";
import { DataSourceModal } from "../../components/modals/DataSourceModal";
import { SettingsModal } from "../../components/modals/SettingsModal";
import { SystemDiagnosticDialog } from "../../components/SystemDiagnosticDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { LoginModal } from "../../components/auth/LoginModal";
import { User as UserIcon, LogIn } from "lucide-react";
import type { AuthUser } from "../../api/admin";

// Separate Clock component to prevent full page re-renders every second
const DEFECT_TYPES = [
  { label: "划痕", color: "#3fb950" }, { label: "辊印", color: "#f85149" }, 
  { label: "头尾", color: "#d29922" }, { label: "氧化铁皮", color: "#58a6ff" },
  { label: "异物压入", color: "#bc8cff" }, { label: "周期性缺陷", color: "#ffffff" },
  { label: "油渍", color: "#1f6feb" }, { label: "气泡", color: "#db61a2" },
  { label: "结疤", color: "#79c0ff" }, { label: "折叠", color: "#fa7e7e" },
  { label: "边缘缺陷", color: "#ffa657" }, { label: "黑点", color: "#8b949e" }
];

const NAV_ITEMS = ["缺陷分析", "图像分析"];

function LiveClock({ formatTime }: { formatTime: (date: Date) => string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="font-mono">{formatTime(time)}</span>;
}

function TimeSince({ timestamp }: { timestamp?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Only update once a minute for duration
    return () => clearInterval(timer);
  }, []);

  if (!timestamp) return <span>---</span>;
  
  const diff = Math.max(0, now.getTime() - new Date(timestamp).getTime());
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const mon = Math.floor(day / 30);
  const yr = Math.floor(mon / 12);
  
  const res = [
    yr > 0 ? `${yr}年` : "",
    (mon % 12) > 0 ? `${mon % 12}月` : "",
    (day % 30) > 0 ? `${day % 30}天` : "",
    (hr % 24) > 0 ? `${hr % 24}时` : "",
    (min % 60) > 0 ? `${min % 60}分` : ""
  ].join("");
  
  return <span>{res || "刚刚"}</span>;
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function TraditionalMode() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [plates, setPlates] = useState<SteelItem[]>([]);
  const [selectedPlate, setSelectedPlate] = useState<SteelItem | null>(null);
  const [plateDefects, setPlateDefects] = useState<DefectItem[]>([]);
  const [surfaceImages, setSurfaceImages] = useState<SurfaceImageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [surfaceFilter, setSurfaceFilter] = useState<"all" | "top" | "bottom">("all");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const raw = window.localStorage.getItem("auth_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });

  const saveUser = (user: AuthUser | null) => {
    if (!user) {
      window.localStorage.removeItem("auth_user");
      return;
    }
    window.localStorage.setItem("auth_user", JSON.stringify(user));
  };
  const [activeNav, setActiveNav] = useState("缺陷分析");
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const diagnosticButtonRef = useRef<HTMLButtonElement>(null);
  const [gridCols, setGridCols] = useState(6);
  const [isImageFit, setIsImageFit] = useState(true);
  const [queryTab, setQueryTab] = useState("SN"); // SN, ID, TIME
  const [sidebarTab, setSidebarTab] = useState<'records' | 'defects'>('records');
  const [refreshLimit, setRefreshLimit] = useState(20);
  
  // Image Analysis State
  const [analysisScrollState, setAnalysisScrollState] = useState({ top: 0, height: 1, clientHeight: 1 });
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const scrollUpdatePending = useRef(false);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);

  const handleScrollSync = useCallback((e: React.UIEvent<HTMLDivElement>, source: 'top' | 'bottom') => {
    if (isSyncing.current) return;
    const target = e.currentTarget;
    
    // Throttle state updates to animation frames to prevent "Maximum update depth exceeded"
    if (!scrollUpdatePending.current) {
      scrollUpdatePending.current = true;
      requestAnimationFrame(() => {
        setAnalysisScrollState({
          top: target.scrollTop,
          height: target.scrollHeight,
          clientHeight: target.clientHeight
        });
        scrollUpdatePending.current = false;
      });
    }

    if (surfaceFilter === 'all') {
      isSyncing.current = true;
      const otherRef = source === 'top' ? bottomScrollRef : topScrollRef;
      if (otherRef.current) {
        const ratio = target.scrollTop / (target.scrollHeight - target.clientHeight || 1);
        otherRef.current.scrollTop = ratio * (otherRef.current.scrollHeight - otherRef.current.clientHeight);
      }
      setTimeout(() => { isSyncing.current = false; }, 50);
    }
  }, [surfaceFilter]);

  // Data Source State
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([]);
  const [currentLine, setCurrentLine] = useState("1780热轧");

  const refreshDataSources = useCallback(async () => {
    try {
      const nodesData = await getApiList().catch(() => []);
      setApiNodes(nodesData);
    } catch (error) {
      console.error("Failed to refresh data sources", error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [steelsData, nodesData] = await Promise.all([
        listSteels(refreshLimit),
        getApiList().catch(() => [])
      ]);
      
      setPlates(steelsData);
      setApiNodes(nodesData);
      
      if (steelsData.length > 0) {
        setSelectedPlate(prev => {
           if (prev) {
             const found = steelsData.find(s => s.serialNumber === prev.serialNumber);
             return found || steelsData[0];
           }
           return steelsData[0];
        });
      }
      
      toast.success(`已刷新数据 (最新 ${refreshLimit} 条)`);
    } catch (error) {
      console.error("Refresh failed", error);
      toast.error("数据刷新失败");
    } finally {
      setIsLoading(false);
    }
  }, [refreshLimit]);
  
  // Date Picker State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const [isDraggingPicker, setIsDraggingPicker] = useState(false);
  const [pickerDragStart, setPickerDragStart] = useState({ x: 0, y: 0 });

  // Defect Selection State
  const [selectedDefectTypes, setSelectedDefectTypes] = useState<string[]>(DEFECT_TYPES.map(t => t.label));

  // Defect Chart Data
  const defectChartData = useMemo(() => {
    if (!plateDefects || !plateDefects.length) return [];
    const counts: Record<string, number> = {};
    plateDefects.forEach(d => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    return DEFECT_TYPES
      .map(t => ({
        name: t.label,
        count: counts[t.label] || 0,
        color: t.color
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [plateDefects]);

  // Image Viewer State
  const [imgScale, setImgScale] = useState(1);
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // 播放状态与快捷键逻辑
  const [isPlaying, setIsPlaying] = useState(false);
  const [isQueryActive, setIsQueryActive] = useState(false);
  const [listFilter, setListFilter] = useState("all"); // all, normal, alert
  const [isDefectListOpen, setIsDefectListOpen] = useState(true);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查当前焦点是否在输入框中
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

      // 如果焦点在输入框中，不阻止默认行为，也不执行快捷键
      if (isInputFocused) {
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case "ArrowUp": 
        case "w":
        case "W": {
          const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
          if (idx > 0) setSelectedPlate(plates[idx - 1]);
          break;
        }
        case "ArrowDown":
        case "s":
        case "S": {
          const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
          if (idx < plates.length - 1) setSelectedPlate(plates[idx + 1]);
          break;
        }
        case "ArrowLeft":
        case "a":
        case "A": setImgScale(prev => Math.max(0.1, prev * 0.9)); break;
        case "ArrowRight":
        case "d":
        case "D": setImgScale(prev => Math.min(10, prev * 1.1)); break;
        case " ": setIsPlaying(prev => !prev); break;
        case "t":
        case "T": 
          setSurfaceFilter(prev => prev === 'top' ? 'all' : 'top');
          break;
        case "l":
        case "L":
          setIsDefectListOpen(prev => !prev);
          break;
        case "b":
        case "B":
          setSurfaceFilter(prev => prev === 'bottom' ? 'all' : 'bottom');
          break;
        case "q":
        case "Q": {
          const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
          if (idx > 0) setSelectedPlate(plates[idx - 1]);
          break;
        }
        case "e":
        case "E": {
          const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
          if (idx < plates.length - 1) setSelectedPlate(plates[idx + 1]);
          break;
        }
        case "Tab":
          e.preventDefault();
          setIsGridView(prev => !prev);
          break;
        case "f":
        case "F":
          setIsImmersiveMode(prev => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [plates, selectedPlate, imgScale]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      if (activeNav === "图像分析") {
        timer = setInterval(() => {
          const targetRef = topScrollRef.current ? topScrollRef : bottomScrollRef;
          if (targetRef.current) {
            const container = targetRef.current;
            const maxScroll = container.scrollHeight - container.clientHeight;
            if (container.scrollTop >= maxScroll - 2) {
              container.scrollTop = 0; // Loop back to start
            } else {
              container.scrollTop += 2; // Smooth auto-scroll increment
            }
          }
        }, 16); // ~60fps for smooth motion
      } else {
        timer = setInterval(() => {
          setSelectedPlate(prev => {
            if (!prev) return plates[0];
            const idx = plates.findIndex(p => p.serialNumber === prev.serialNumber);
            return plates[(idx + 1) % plates.length];
          });
        }, 3000);
      }
    }
    return () => clearInterval(timer);
  }, [isPlaying, plates, activeNav]);

  // 3D Model Control State
  const [rotX, setRotX] = useState(-12);
  const [rotY, setRotY] = useState(-18);
  const [isGridView, setIsGridView] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Initial data load
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [steelsData, nodesData] = await Promise.all([
          listSteels(50),
          getApiList().catch(() => [])
        ]);
        if (!mounted) return;
        setPlates(steelsData);
        setApiNodes(nodesData);
        if (steelsData.length > 0) setSelectedPlate(steelsData[0]);
      } catch (error) {
        if (mounted) toast.error("数据加载失败");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, []);

  // Sync defects and images when selection changes
  useEffect(() => {
    if (!selectedPlate) {
      setPlateDefects([]);
      setSurfaceImages([]);
      return;
    }

    let mounted = true;
    const loadPlateDetails = async () => {
      try {
        const seqNo = parseInt(selectedPlate.serialNumber, 10);
        
        // Parallel fetch for defects and metadata
        const [defectsRes, metaRes] = await Promise.all([
          getDefectsRaw(seqNo).catch(() => ({ defects: [] })),
          getSteelMeta(seqNo).catch(() => ({ surface_images: [] }))
        ]);

        if (!mounted) return;

        setPlateDefects(defectsRes.defects.map(d => ({
          id: d.defect_id,
          type: d.defect_type as any,
          severity: d.severity,
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          confidence: d.confidence,
          surface: d.surface,
          imageIndex: d.image_index
        })));
        
        setSurfaceImages(metaRes.surface_images || []);
      } catch (error) {
        console.error("Failed to load plate details", error);
      }
    };

    loadPlateDetails();
    return () => { mounted = false; };
  }, [selectedPlate]);

  useEffect(() => {
    if (activeNav === "图像分析" && selectedDefectId && (topScrollRef.current || bottomScrollRef.current)) {
      const defect = plateDefects.find(d => d.id === selectedDefectId);
      if (defect && selectedPlate) {
        const plateLength = selectedPlate.dimensions.length || 10000;
        const targetRef = defect.surface === 'top' ? topScrollRef : bottomScrollRef;
        const container = targetRef.current;
        
        if (container) {
          const scrollHeight = container.scrollHeight;
          const targetY = (defect.y / plateLength) * scrollHeight;

          container.scrollTo({
            top: targetY - container.clientHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedDefectId, activeNav, plateDefects, selectedPlate]);

  const handleDistributionInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 && e.type !== 'mousedown') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, y / rect.height));
    
    const targetRef = topScrollRef.current ? topScrollRef : bottomScrollRef;
    if (targetRef.current) {
      const container = targetRef.current;
      container.scrollTop = ratio * (container.scrollHeight - container.clientHeight);
    }
  }, []);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    }).replace(/\//g, '-');
  }, []);

  // Mouse Handlers for 3D Rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingPicker) {
      setPickerPos({
        x: e.clientX - pickerDragStart.x,
        y: e.clientY - pickerDragStart.y
      });
      return;
    }
    if (!isDragging) return;
    const deltaX = e.clientX - lastPos.x;
    const deltaY = e.clientY - lastPos.y;
    
    setRotY(prev => prev + deltaX * 0.5);
    setRotX(prev => Math.max(-90, Math.min(90, prev - deltaY * 0.5)));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
    setIsDraggingPicker(false);
  };

  const handleImageWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(10, Math.max(0.1, imgScale * delta));
    setImgScale(newScale);
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click for pan
    setIsPanning(true);
    setPanStart({ x: e.clientX - imgOffset.x, y: e.clientY - imgOffset.y });
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setImgOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const currentImageUrl = useMemo(() => {
    if (!selectedPlate || surfaceImages.length === 0) {
      return "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop";
    }
    
    const seqNo = parseInt(selectedPlate.serialNumber, 10);
    const surface = surfaceImages[0].surface; // Default to first surface
    
    return getTileImageUrl({
      surface,
      seqNo,
      level: 0,
      tileX: 0,
      tileY: 0,
      tileSize: surfaceImages[0].image_height || 512
    });
  }, [selectedPlate, surfaceImages]);

  // Dynamic Scale Calculation based on Actual Dimensions
  const box = useMemo(() => {
    if (!selectedPlate || !selectedPlate.dimensions) return { w: 160, h: 10, d: 80, actualT: 10 };
    
    // Handle missing dimensions with defaults (Height/Thickness defaults to 10 if missing)
    const width = selectedPlate.dimensions.width || 1500;
    const thickness = selectedPlate.dimensions.thickness ?? 10;
    const length = selectedPlate.dimensions.length || 8000;
    
    // Normalize logic for visual representation
    const w = Math.min(200, Math.max(80, (width / 2500) * 160));
    const h = Math.min(24, Math.max(4, (thickness / 50) * 20)); 
    const d = Math.min(120, Math.max(40, (length / 20000) * 80));
    
    return { w, h, d, actualT: thickness };
  }, [selectedPlate]);

  return (
    <div className="h-screen w-full bg-[#0a0f14] text-[#d1d5db] flex flex-col font-sans overflow-hidden select-none relative">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0d1117; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #58a6ff; }
        
        .preserve-3d { transform-style: preserve-3d; }

        @keyframes steel-idle-float {
          0% { transform: translateY(0px) rotateX(var(--rx)) rotateY(var(--ry)); }
          50% { transform: translateY(-12px) rotateX(calc(var(--rx) - 3deg)) rotateY(calc(var(--ry) + 5deg)); }
          100% { transform: translateY(0px) rotateX(var(--rx)) rotateY(var(--ry)); }
        }
        .animate-idle {
          animation: steel-idle-float 4s ease-in-out infinite;
        }
      `}</style>
      {/* Header */}
      <AnimatePresence>
        {!isImmersiveMode && (
          <motion.header 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-3 shrink-0 overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 pr-4 border-r border-[#30363d] relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex items-center gap-1 group transition-colors px-1 py-0.5 rounded hover:bg-[#30363d] data-[state=open]:bg-[#30363d] outline-none"
                    >
                      <span className="text-sm font-bold tracking-widest text-[#58a6ff] group-hover:text-white">北科工研</span>
                      <ChevronDown className="w-3 h-3 text-[#58a6ff] transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-[#161b22] border-[#30363d] text-[#d1d5db] p-0 z-50">
                    <DropdownMenuLabel className="px-3 py-2 text-[10px] text-[#8b949e] border-b border-[#30363d] mb-1 font-bold">系统主菜单</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate("/")} className="px-3 py-2 text-[11px] focus:bg-[#58a6ff] focus:text-white cursor-pointer">
                      <Home className="w-3.5 h-3.5 mr-2" /> 现代仪表盘
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/BackendManagement")} className="px-3 py-2 text-[11px] focus:bg-[#58a6ff] focus:text-white cursor-pointer">
                      <Shield className="w-3.5 h-3.5 mr-2" /> 后台管理系统
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-3 py-2 text-[11px] focus:bg-[#58a6ff] focus:text-white cursor-pointer">
                      <Box className="w-3.5 h-3.5 mr-2" /> 数据导出工具
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-3 py-2 text-[11px] focus:bg-[#58a6ff] focus:text-white cursor-pointer">
                      <Terminal className="w-3.5 h-3.5 mr-2" /> 系统日志查看
                    </DropdownMenuItem>
                    <div className="border-t border-[#30363d] mt-1 pt-1 pb-1">
                      <DropdownMenuItem onClick={() => navigate("/")} className="px-3 py-2 text-[11px] text-[#f85149] focus:bg-[#f85149] focus:text-white cursor-pointer">
                        <LogOut className="w-3.5 h-3.5 mr-2" /> 退出传统仪表盘
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Main Dropdown Menu */}
                {showMainMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMainMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 w-48 bg-[#161b22] border border-[#30363d] shadow-2xl z-50 py-1 flex flex-col animate-in fade-in zoom-in duration-100 origin-top-left">
                      <div className="px-3 py-2 text-[10px] text-[#8b949e] border-b border-[#30363d] mb-1 font-bold">系统主菜单</div>
                      <button 
                        onClick={() => navigate("/")}
                        className="px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-[#58a6ff] hover:text-white transition-colors text-left"
                      >
                        <Home className="w-3.5 h-3.5" /> 现代仪表盘
                      </button>
                      <button 
                        onClick={() => { navigate("/BackendManagement"); setShowMainMenu(false); }}
                        className="px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-[#58a6ff] hover:text-white transition-colors text-left"
                      >
                        <Shield className="w-3.5 h-3.5" /> 后台管理系统
                      </button>
                      <button 
                        className="px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-[#58a6ff] hover:text-white transition-colors text-left"
                        onClick={() => setShowMainMenu(false)}
                      >
                        <Box className="w-3.5 h-3.5" /> 数��导出工具
                      </button>
                      <button 
                        className="px-3 py-2 text-[11px] flex items-center gap-2 hover:bg-[#58a6ff] hover:text-white transition-colors text-left"
                        onClick={() => setShowMainMenu(false)}
                      >
                        <Terminal className="w-3.5 h-3.5" /> 系统日志查看
                      </button>
                      <div className="border-t border-[#30363d] mt-1 pt-1">
                        <button 
                          onClick={() => navigate("/")}
                          className="px-3 py-2 text-[11px] flex items-center gap-2 text-[#f85149] hover:bg-[#f85149] hover:text-white transition-colors text-left w-full"
                        >
                          <LogOut className="w-3.5 h-3.5" /> 退出传统仪表盘
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <nav className="flex items-center h-full">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item}
                    onClick={() => setActiveNav(item)}
                    className={`px-3 h-10 text-[11px] font-bold transition-all border-b-2 ${
                      activeNav === item 
                        ? "text-[#58a6ff] border-[#58a6ff] bg-[#58a6ff]/10" 
                        : "text-[#8b949e] border-transparent hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsDataSourceOpen(true)}
                className="flex flex-col items-center group cursor-pointer hover:bg-[#30363d]/30 px-4 py-1 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-[#f0f6fc] tracking-[0.2em]">宝武集团不锈钢有限公司</span>
                  <ChevronDown className={`w-4 h-4 text-[#8b949e] transition-transform ${isDataSourceOpen ? 'rotate-180' : ''} group-hover:text-[#58a6ff]`} />
                </div>
                <span className="text-[10px] text-[#8b949e] uppercase group-hover:text-[#c9d1d9]">{currentLine}表面检测系统</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#30363d]/30 text-[#8b949e] border border-[#30363d]">
                  <div className="text-[9px] uppercase font-bold opacity-60">CAM TEMP</div>
                  <span className="font-mono text-[11px] text-[#c9d1d9]">42.8°C</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#30363d]/30 text-[#8b949e] border border-[#30363d]">
                  <div className="text-[9px] uppercase font-bold opacity-60">LINK SPD</div>
                  <span className="font-mono text-[11px] text-[#c9d1d9]">10Gbps</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
                  <span className="font-mono">系统就绪</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[#8b949e]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 shadow-sm shadow-black/30 focus:outline-none hover:text-white transition-colors">
                      <Avatar className="h-6 w-6 shrink-0 rounded-full cursor-pointer border border-[#30363d]">
                        <AvatarImage src="" alt="@user" />
                        <AvatarFallback className="bg-[#30363d] text-[#c9d1d9] leading-none text-center rounded-full text-[10px]">
                          {currentUser ? (
                            currentUser.username[0].toUpperCase()
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#0d1117] ${currentUser ? "bg-[#3fb950]" : "bg-[#8b949e]"}`}
                      ></span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-[#161b22] border-[#30363d] text-[#c9d1d9]"
                  >
                    <DropdownMenuLabel className="text-[#8b949e] font-normal">
                      {currentUser ? (
                        <div className="flex flex-col space-y-1 py-1">
                          <p className="text-sm font-medium leading-none text-[#f0f6fc]">
                            {currentUser.username}
                          </p>
                          <p className="text-xs leading-none text-[#8b949e]">
                            {currentUser.role}
                          </p>
                        </div>
                      ) : (
                        "未登录"
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-[#30363d] focus:text-[#f0f6fc] text-xs"
                    >
                      <Settings className="mr-2 h-3.5 w-3.5" />
                      <span>用户设置</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsDataSourceOpen(true)}
                      className="cursor-pointer focus:bg-[#30363d] focus:text-[#f0f6fc] text-xs"
                    >
                      <Database className="mr-2 h-3.5 w-3.5" />
                      <span>切换数据源</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                    {currentUser ? (
                      <DropdownMenuItem
                        onClick={() => {
                          setCurrentUser(null);
                          saveUser(null);
                          toast.success("已退出登录");
                        }}
                        className="cursor-pointer focus:bg-[#30363d] focus:text-[#f85149] text-[#f85149] text-xs"
                      >
                        <LogOut className="mr-2 h-3.5 w-3.5" />
                        <span>退出登录</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => setIsLoginOpen(true)}
                        className="cursor-pointer focus:bg-[#30363d] focus:text-[#f0f6fc] text-xs"
                      >
                        <LogIn className="mr-2 h-3.5 w-3.5" />
                        <span>登录</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  ref={diagnosticButtonRef}
                  onClick={() => setIsDiagnosticOpen(true)}
                  className="text-[#8b949e] hover:text-[#58a6ff] transition-colors"
                  title="系统诊断"
                >
                  <Activity className="w-4 h-4" />
                </button>
                <LiveClock formatTime={formatTime} />
                <button onClick={() => setIsSettingsOpen(true)} className="text-[#8b949e] hover:text-white transition-colors" title="系统设置">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        gridCols={gridCols}
        setGridCols={setGridCols}
        isImageFit={isImageFit}
        setIsImageFit={setIsImageFit}
        refreshLimit={refreshLimit}
        setRefreshLimit={setRefreshLimit}
      />

      <SystemDiagnosticDialog
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        triggerRef={diagnosticButtonRef}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 p-0.5 gap-0.5">
        {/* Left Sidebar - Widened and Compact Layout */}
        <AnimatePresence>
          {!isImmersiveMode && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col gap-0.5 bg-[#0d1117] overflow-hidden"
            >
              {/* List Tabs */}
              <div className="h-8 flex gap-0.5 bg-[#161b22] p-0.5">
                <button 
                  onClick={() => setSidebarTab('records')}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors ${
                    sidebarTab === 'records' 
                      ? 'bg-[#0d1117] text-[#58a6ff] border border-[#58a6ff]/30 shadow-[0_0_10px_rgba(88,166,255,0.1)]' 
                      : 'text-[#8b949e] hover:bg-[#1f242b] hover:text-[#c9d1d9]'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  钢板记录
                </button>
                <button 
                  onClick={() => setSidebarTab('defects')}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold transition-colors ${
                    sidebarTab === 'defects' 
                      ? 'bg-[#0d1117] text-[#f85149] border border-[#f85149]/30 shadow-[0_0_10px_rgba(248,81,73,0.1)]' 
                      : 'text-[#8b949e] hover:bg-[#1f242b] hover:text-[#c9d1d9]'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  缺陷统计
                </button>
              </div>

          <div className="h-32 bg-[#0d1117] relative flex items-center justify-center overflow-hidden border-b border-[#30363d]">
            <AnimatePresence mode="wait">
              {sidebarTab === 'records' ? (
                <motion.div
                  key="3d-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing group/view"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ perspective: '1000px' }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1f242d_0%,transparent_70%)] opacity-50 pointer-events-none" />
                  
                  {/* CSS 3D Steel Plate */}
                  <div 
                    className={`relative transition-transform duration-75 ease-out preserve-3d ${!isDragging ? 'group-hover/view:[animation-play-state:paused] animate-idle' : ''}`} 
                    style={{ 
                      width: `${box.w}px`, 
                      height: `${box.h}px`,
                      transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                      '--rx': `${rotX}deg`,
                      '--ry': `${rotY}deg`
                    } as any}
                  >
                    {/* FRONT FACE */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#c9d1d9] to-[#8b949e] border border-white/20 shadow-lg pointer-events-none flex items-center justify-center"
                         style={{ transform: `translateZ(${box.d / 2}px)` }}>
                      <div className="absolute -top-6 left-0 right-0 flex flex-col items-center">
                         <div className="w-full h-px bg-[#58a6ff]/50 relative">
                           <div className="absolute left-0 -top-0.5 w-px h-1 bg-[#58a6ff]" />
                           <div className="absolute right-0 -top-0.5 w-px h-1 bg-[#58a6ff]" />
                         </div>
                         <span className="text-[9px] text-[#58a6ff] font-bold mt-0.5 whitespace-nowrap">W {selectedPlate?.dimensions.width || 0}mm</span>
                      </div>
                      <div className="absolute -left-12 top-0 bottom-0 flex items-center gap-1">
                         <span className="text-[9px] text-[#58a6ff] font-bold whitespace-nowrap">T {(box.actualT ?? 10).toFixed(1)}</span>
                         <div className="h-full w-px bg-[#58a6ff]" />
                      </div>
                    </div>

                    {/* BACK FACE */}
                    <div className="absolute inset-0 bg-[#30363d] border border-white/10"
                         style={{ transform: `rotateY(180deg) translateZ(${box.d / 2}px)` }} />

                    {/* TOP FACE */}
                    <div className="absolute bg-gradient-to-t from-[#8b949e] to-[#484f58] border border-white/10"
                         style={{ 
                           width: `${box.w}px`, 
                           height: `${box.d}px`, 
                           left: '0',
                           top: '50%',
                           marginTop: `-${box.d / 2}px`,
                           transform: `rotateX(90deg) translateZ(${box.h / 2}px)` 
                         }}>
                      <div className="absolute inset-0 opacity-20 bg-[grid-white/10] [background-size:15px_15px]" />
                      <div className="absolute top-1/2 -right-14 -translate-y-1/2 flex items-center gap-1 origin-left rotate-90">
                         <div className="w-16 h-px bg-[#58a6ff]/50 relative">
                           <div className="absolute left-0 -top-0.5 w-px h-1 bg-[#58a6ff]" />
                           <div className="absolute right-0 -top-0.5 w-px h-1 bg-[#58a6ff]" />
                         </div>
                         <span className="text-[9px] text-[#58a6ff] font-bold whitespace-nowrap">L {selectedPlate?.dimensions.length || 0}</span>
                      </div>
                    </div>

                    {/* BOTTOM FACE */}
                    <div className="absolute bg-[#161b22]"
                         style={{ 
                           width: `${box.w}px`, 
                           height: `${box.d}px`, 
                           left: '0',
                           top: '50%',
                           marginTop: `-${box.d / 2}px`,
                           transform: `rotateX(-90deg) translateZ(${box.h / 2}px)` 
                         }} />

                    {/* RIGHT SIDE FACE */}
                    <div className="absolute bg-[#21262d] border-l border-white/5"
                         style={{ 
                           width: `${box.d}px`, 
                           height: `${box.h}px`, 
                           top: '0',
                           left: '50%',
                           marginLeft: `-${box.d / 2}px`,
                           transform: `rotateY(90deg) translateZ(${box.w / 2}px)` 
                         }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                    </div>

                    {/* LEFT SIDE FACE */}
                    <div className="absolute bg-[#21262d] border-r border-white/5"
                         style={{ 
                           width: `${box.d}px`, 
                           height: `${box.h}px`, 
                           top: '0',
                           left: '50%',
                           marginLeft: `-${box.d / 2}px`,
                           transform: `rotateY(-90deg) translateZ(${box.w / 2}px)` 
                         }} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="chart-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <div className="flex-1 min-h-0 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={defectChartData}
                        margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
                        barSize={16}
                      >
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#30363d" opacity={0.2} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#8b949e', fontSize: 8 }}
                          interval={0}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#ffffff', opacity: 0.05 }}
                          contentStyle={{ 
                            backgroundColor: '#0d1117', 
                            border: '1px solid #30363d',
                            borderRadius: '0',
                            fontSize: '10px',
                            padding: '2px 6px'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          radius={[1, 1, 0, 0]}
                          label={{ position: 'top', fill: '#8b949e', fontSize: 8, offset: 4 }}
                        >
                          {defectChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Area - Upgraded with Independent Query Tabs */}
          <div className="bg-[#161b22] flex flex-col border-b border-[#30363d]">
            {/* Query Tabs */}
            <div className="h-7 flex gap-[1px] bg-[#0d1117] p-[1px]">
              {[
                { id: "SN", label: "流水号" },
                { id: "ID", label: "板号" },
                { id: "TIME", label: "时间" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setQueryTab(tab.id)}
                  className={`flex-1 text-[10px] font-bold transition-all ${
                    queryTab === tab.id 
                      ? "bg-[#161b22] text-[#58a6ff] border-t border-x border-[#30363d]" 
                      : "text-[#8b949e] hover:bg-[#161b22]/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-2.5 space-y-2.5">
              {queryTab === "SN" && (
                <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-left-1 duration-200">
                  <label className="text-[9px] text-[#8b949e] pl-1 font-bold flex items-center gap-1">
                    <Terminal className="w-2.5 h-2.5" /> 精确流水号查���
                  </label>
                  <input 
                    type="text" 
                    placeholder="输入完整流水号 (如: SN20260104...)"
                    className="h-8 bg-[#0d1117] border border-[#30363d] text-[11px] px-2 text-[#c9d1d9] focus:border-[#58a6ff] outline-none transition-colors w-full" 
                  />
                </div>
              )}

              {queryTab === "ID" && (
                <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-right-1 duration-200">
                  <label className="text-[9px] text-[#8b949e] pl-1 font-bold flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5" /> 钢板唯一标识查询
                  </label>
                  <input 
                    type="text" 
                    placeholder="输入钢板 ID (如: H2255043...)"
                    className="h-8 bg-[#0d1117] border border-[#30363d] text-[11px] px-2 text-[#c9d1d9] focus:border-[#58a6ff] outline-none transition-colors w-full" 
                  />
                </div>
              )}

              {queryTab === "TIME" && (
                <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-1 duration-200 relative">
                  <label className="text-[9px] text-[#8b949e] pl-1 font-bold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> 生产时间区间回溯
                  </label>
                  <div className="flex flex-col gap-[2px]">
                    <button 
                      onClick={() => setActivePicker(activePicker === 'start' ? null : 'start')}
                      className="flex items-center gap-2 h-7 bg-[#0d1117] border border-[#30363d] px-2 hover:border-[#58a6ff] transition-colors group"
                    >
                      <span className="text-[9px] text-[#8b949e] w-8 text-left">开始</span>
                      <span className="flex-1 text-[10px] text-[#c9d1d9] text-left">
                        {startDate || "请选择起始时间"}
                      </span>
                      <Calendar className="w-3 h-3 text-[#30363d] group-hover:text-[#58a6ff]" />
                    </button>
                    
                    <button 
                      onClick={() => setActivePicker(activePicker === 'end' ? null : 'end')}
                      className="flex items-center gap-2 h-7 bg-[#0d1117] border border-[#30363d] px-2 hover:border-[#58a6ff] transition-colors group"
                    >
                      <span className="text-[9px] text-[#8b949e] w-8 text-left">结束</span>
                      <span className="flex-1 text-[10px] text-[#c9d1d9] text-left">
                        {endDate || "请选择结束时间"}
                      </span>
                      <Calendar className="w-3 h-3 text-[#30363d] group-hover:text-[#58a6ff]" />
                    </button>
                  </div>

                  {/* Industrial Date Picker Popup */}
                  {activePicker && (
                    <>
                      <div className="fixed inset-0 z-[60] backdrop-blur-[2px] bg-black/20" onClick={() => { setActivePicker(null); setPickerPos({x: 0, y: 0}); }} />
                      <div 
                        style={{ transform: `translate(${pickerPos.x}px, ${pickerPos.y}px)` }}
                        className="absolute top-full left-4 -right-4 mt-1 bg-[#161b22]/95 backdrop-blur-md border border-[#30363d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-[70] p-4 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-left rounded-sm"
                      >
                        <div className="flex flex-col gap-4">
                          <div 
                            className="flex items-center justify-between border-b border-[#30363d] pb-2 cursor-move active:cursor-grabbing select-none"
                            onMouseDown={(e) => {
                              setIsDraggingPicker(true);
                              setPickerDragStart({ x: e.clientX - pickerPos.x, y: e.clientY - pickerPos.y });
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-3 bg-[#58a6ff] rounded-full" />
                              <span className="text-[11px] font-bold text-[#f0f6fc] tracking-wider">
                                设定{activePicker === 'start' ? '起始' : '截止'}时刻
                              </span>
                            </div>
                            <button 
                              onMouseDown={(e) => e.stopPropagation()} 
                              onClick={() => { setActivePicker(null); setPickerPos({x: 0, y: 0}); }} 
                              className="text-[#8b949e] hover:text-white transition-colors"
                            >
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                             <div className="relative group">
                               <input 
                                 type="datetime-local" 
                                 value={activePicker === 'start' ? startDate : endDate}
                                 onChange={(e) => {
                                   if (activePicker === 'start') setStartDate(e.target.value);
                                   else setEndDate(e.target.value);
                                 }}
                                 className="w-full h-9 bg-[#0d1117] border border-[#30363d] text-[12px] text-[#c9d1d9] px-3 outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]/30 transition-all rounded-sm appearance-none custom-datetime-input"
                               />
                               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#58a6ff]/50">
                                 <Clock className="w-3.5 h-3.5" />
                               </div>
                             </div>

                             <div className="grid grid-cols-2 gap-2">
                               <button 
                                 onClick={() => {
                                   const now = new Date();
                                   const str = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                   if (activePicker === 'start') setStartDate(str);
                                   else setEndDate(str);
                                 }}
                                 className="h-7 bg-[#21262d] text-[10px] font-bold text-[#c9d1d9] hover:bg-[#30363d] hover:text-white border border-[#30363d] transition-colors flex items-center justify-center gap-1.5"
                               >
                                 <RefreshCcw className="w-3 h-3" />
                                 设为当前
                               </button>
                               <button 
                                 onClick={() => {
                                   if (activePicker === 'start') setStartDate("");
                                   else setEndDate("");
                                 }}
                                 className="h-7 bg-[#21262d] text-[10px] font-bold text-[#f85149] hover:bg-[#f85149]/10 border border-[#30363d] hover:border-[#f85149]/50 transition-colors flex items-center justify-center gap-1.5"
                               >
                                 <AlertCircle className="w-3 h-3" />
                                 重置清除
                               </button>
                             </div>
                          </div>

                          <div className="pt-2 border-t border-[#30363d]">
                            <button 
                              onClick={() => setActivePicker(null)}
                              className="w-full h-8 bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                              应用��更
                            </button>
                          </div>
                        </div>
                        
                        {/* Decorative Corner */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#58a6ff]/20 pointer-events-none" />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-[2px] pt-1">
                <button 
                  onClick={() => setIsQueryActive(true)}
                  className="flex-1 h-8 bg-[#238636]/20 border border-[#238636]/40 text-[#3fb950] text-[11px] font-bold hover:bg-[#238636]/40 transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" /> 检索数据库
                </button>
                <button className="w-10 h-8 bg-[#21262d] border border-[#30363d] text-[#8b949e] flex items-center justify-center hover:bg-[#30363d] transition-colors">
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Current Selection Card - Redesigned for Industrial Sophistication */}
          <div className="bg-[#161b22] p-2 border-y border-[#30363d] relative overflow-hidden group">
            {/* Top glass reflection effect */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#58a6ff]/50 to-transparent" />
            
            <div className="flex justify-between items-center mb-2 px-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] shadow-[0_0_8px_#58a6ff]" />
                  <span className="text-[9px] font-bold text-[#c9d1d9] uppercase tracking-wider">检测目标</span>
                </div>
                <div className="text-[16px] font-black text-[#f0f6fc] font-mono tracking-tighter">
                  {selectedPlate?.plateId || "WAITING..."}
                </div>
              </div>
              <div className="px-2 py-0.5 rounded bg-[#58a6ff]/20 border border-[#58a6ff]/40">
                <span className="text-[11px] font-bold text-[#58a6ff] font-mono">
                  {selectedPlate?.level ? (
                    {
                      '1': '一等', '2': '二等', '3': '三等', '4': '四等',
                      'A': '一等', 'B': '二等', 'C': '三等'
                    }[selectedPlate.level] || `${selectedPlate.level}等`
                  ) : "-"}
                </span>
              </div>
            </div>

            {/* Compact Row-based Info - 2 Columns Layout with Larger Text */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-2 py-2.5 bg-[#0d1117]/50 rounded-sm border border-[#30363d]/30">
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-[#c9d1d9] shrink-0">序号:</span>
                <span className="text-[#f0f6fc] font-mono font-bold truncate">
                  {selectedPlate?.serialNumber || "---"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-[#c9d1d9] shrink-0">钢种:</span>
                <span className="text-[#f0f6fc] font-bold truncate">
                  {selectedPlate?.steelGrade || "---"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-[#c9d1d9] shrink-0">规格:</span>
                <span className="text-[#58a6ff] font-mono font-bold truncate">
                  {selectedPlate?.dimensions?.width || 0}×{(selectedPlate?.dimensions?.thickness ?? 10).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-[#c9d1d9] shrink-0">缺陷:</span>
                <span className="text-[#f85149] font-mono font-bold">
                  {selectedPlate?.defectCount || 0} pts
                </span>
              </div>
            </div>

            {/* Bottom timestamp bar - Highly Visible */}
            <div className="mt-2 pt-1.5 border-t border-[#30363d] flex justify-between items-center px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#58a6ff]" />
                <span className="text-[10px] text-[#f0f6fc] font-mono font-bold bg-[#30363d]/50 px-1.5 py-0.5 rounded-sm">
                  {selectedPlate ? new Date(selectedPlate.timestamp).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\//g, '-') : "----/--/-- --:--:--"}
                </span>
              </div>
              <div className="text-[9px] text-[#3fb950] font-bold font-mono">
                <TimeSince timestamp={selectedPlate?.timestamp} />
              </div>
            </div>
          </div>

          {/* List Statistics */}
          <div className="h-6 bg-[#161b22] flex items-center justify-between px-2 text-[9px] border-b border-[#30363d]">
            <div className="flex gap-3">
              <span>合计 {plates.length}</span>
              <span className="text-[#3fb950]">正常 {plates.filter(p => p.level === 'A' || p.level === 'B').length}</span>
              <span className="text-[#f85149]">报警 {plates.filter(p => p.level === 'D').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <AnimatePresence>
                {isQueryActive && (
                  <motion.button
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    onClick={() => setIsQueryActive(false)}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-[#f85149]/10 text-[#f85149] border border-[#f85149]/30 rounded-[1px] hover:bg-[#f85149]/20 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                    <span>退出查询</span>
                  </motion.button>
                )}
              </AnimatePresence>
              
              <button 
                onClick={() => {
                  setSelectedPlate(plates[0]);
                  const scrollContainer = document.querySelector('.custom-scrollbar');
                  if (scrollContainer) scrollContainer.scrollTop = 0;
                }}
                className="p-1 hover:bg-[#30363d] text-[#8b949e] transition-colors rounded-sm"
                title="回到顶部"
              >
                <ArrowUpToLine className="w-3 h-3" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-[#30363d] text-[#8b949e] transition-colors rounded-sm">
                    <Filter className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#161b22] border-[#30363d] text-[10px] min-w-[100px] p-1 shadow-2xl">
                  <DropdownMenuLabel className="text-[#8b949e] py-1 px-2 text-[9px] font-bold">列表过滤</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#30363d]" />
                  <DropdownMenuItem onClick={() => setListFilter("all")} className={`focus:bg-[#30363d] focus:text-[#f0f6fc] cursor-pointer py-1 px-2 rounded-sm ${listFilter === 'all' ? 'text-[#58a6ff]' : 'text-[#c9d1d9]'}`}>
                    全部结果
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setListFilter("normal")} className={`focus:bg-[#30363d] focus:text-[#f0f6fc] cursor-pointer py-1 px-2 rounded-sm ${listFilter === 'normal' ? 'text-[#58a6ff]' : 'text-[#c9d1d9]'}`}>
                    仅看一等/二等
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setListFilter("alert")} className={`focus:bg-[#30363d] focus:text-[#f0f6fc] cursor-pointer py-1 px-2 rounded-sm ${listFilter === 'alert' ? 'text-[#58a6ff]' : 'text-[#c9d1d9]'}`}>
                    ��看报警/等外
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <RotateCw 
                onClick={handleRefresh}
                className="w-3 h-3 text-[#58a6ff] cursor-pointer hover:scale-110 transition-transform ml-1 hover:rotate-180 duration-500" 
                title={`刷新列表 (加载 ${refreshLimit} 条)`}
              />
            </div>
          </div>

          {/* Plate List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden border border-[#30363d] custom-scrollbar">
            <table className="w-full text-[12px] border-collapse table-fixed">
              <thead className="sticky top-0 bg-[#161b22] shadow-sm z-10">
                <tr className="text-[#8b949e] text-left">
                  <th className="w-[85px] px-1.5 py-2 font-bold border-r border-[#30363d]">钢板号</th>
                  <th className="w-[65px] px-1.5 py-2 font-bold border-r border-[#30363d]">钢种</th>
                  <th className="w-[45px] px-1.5 py-2 font-bold border-r border-[#30363d] text-center">长</th>
                  <th className="w-[45px] px-1.5 py-2 font-bold border-r border-[#30363d] text-center">宽</th>
                  <th className="w-[45px] px-1.5 py-2 font-bold border-r border-[#30363d] text-center">时间</th>
                  <th className="w-[50px] px-1.5 py-2 font-bold text-center">等级</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50">
                {plates
                  .filter(plate => {
                    if (listFilter === 'normal') return plate.level === 'A' || plate.level === 'B';
                    if (listFilter === 'alert') return plate.level === 'D' || plate.level === 'C'; // Assuming C/D are non-normal
                    return true;
                  })
                  .map((plate, index) => (
                  <tr 
                    key={`${plate.plateId}-${plate.serialNumber}`} 
                    onClick={() => setSelectedPlate(plate)}
                    className={`cursor-pointer group transition-colors ${
                      selectedPlate?.serialNumber === plate.serialNumber 
                        ? 'bg-[#58a6ff]/15' 
                        : index % 2 === 0 ? 'bg-[#0d1117]' : 'bg-[#161b22]'
                    } hover:bg-[#1f242b]`}
                  >
                    <td className="px-1.5 py-1.5 border-r border-[#30363d]/50 font-mono font-medium text-[#f0f6fc] truncate">{plate.plateId}</td>
                    <td className="px-1.5 py-1.5 border-r border-[#30363d]/50 text-[#c9d1d9] truncate">{plate.steelGrade}</td>
                    <td className="px-1.5 py-1.5 border-r border-[#30363d]/50 text-center text-[#8b949e] font-mono">{plate.dimensions.length}</td>
                    <td className="px-1.5 py-1.5 border-r border-[#30363d]/50 text-center text-[#8b949e] font-mono">{plate.dimensions.width}</td>
                    <td className="px-1.5 py-1.5 border-r border-[#30363d]/50 text-[#8b949e] font-mono text-center">
                      {new Date(plate.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[11px] ${
                        plate.level === 'A' ? 'bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/30' :
                        plate.level === 'B' ? 'bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30' :
                        plate.level === 'C' ? 'bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/30' :
                        'bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/30'
                      }`}>
                        {plate.level === 'A' ? '一等' : plate.level === 'B' ? '二等' : plate.level === 'C' ? '三等' : '等外'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>

    {/* Central Map Strip (Vertical) */}
        <AnimatePresence>
          {surfaceFilter !== 'bottom' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 180, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-[#0d1117] flex flex-col border border-[#30363d] overflow-hidden whitespace-nowrap"
            >
             <div className="h-6 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-1 text-[9px]">
               <span>{surfaceFilter === 'all' ? '上表分布' : '纵向分布'}</span>
               <div className="flex gap-1">
                 <ZoomIn className="w-3 h-3" />
                 <ZoomOut className="w-3 h-3" />
               </div>
             </div>
             <div className="flex-1 relative flex justify-center bg-[#161b22]/30">
               {/* Viewport Indicator */}
               {activeNav === "图像分析" && (surfaceFilter === 'all' || surfaceFilter === 'top') && (
                 <div 
                   className="absolute left-0 right-0 border-2 border-[#58a6ff] bg-[#58a6ff]/20 pointer-events-none z-10"
                   style={{
                     top: `${(analysisScrollState.top / analysisScrollState.height) * 100}%`,
                     height: `${(analysisScrollState.clientHeight / analysisScrollState.height) * 100}%`
                   }}
                 />
               )}
               {/* Ruler */}
               <div className="absolute left-0 top-0 bottom-0 w-4 border-r border-[#30363d]/50 flex flex-col justify-between py-2 text-[8px] text-[#8b949e]">
                 <span>-900</span>
                 <span>0毫米</span>
                 <span>900</span>
               </div>
               {/* Map Grid */}
             <div 
               className="w-full h-full relative cursor-pointer group flex justify-center"
               onMouseDown={handleDistributionInteraction}
               onMouseMove={handleDistributionInteraction}
             >
               {/* Plate Visual Representation (Vertical Strip) */}
               <div className="w-[80%] h-full bg-[#161b22] relative border-x border-[#30363d]">
                 {/* Grid lines inside plate */}
                 <div className="w-px h-full bg-[#30363d]/50 absolute left-1/2 -translate-x-1/2" />
                 <div className="w-full h-px bg-[#30363d]/20 absolute top-[25%]" />
                 <div className="w-full h-px bg-[#30363d]/20 absolute top-[50%]" />
                 <div className="w-full h-px bg-[#30363d]/20 absolute top-[75%]" />
                 
                 {/* Real Defect points mapping */}
                 {plateDefects.map((defect) => {
                   const plateLength = selectedPlate?.dimensions.length || 8000;
                   const plateWidth = selectedPlate?.dimensions.width || 2000;
                   
                   // Fix: X is length (vertical), Y is width (horizontal) to match system coordinates
                   const topPos = (defect.x / plateLength) * 100;
                   const leftPos = (defect.y / plateWidth) * 100;
                   
                   return (
                     <div 
                       key={`dist-dot-${defect.id}`}
                       className={`absolute w-2 h-2 rounded-full border border-white/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 ${
                         defect.surface === 'top' ? 'bg-[#58a6ff]' : 'bg-[#f85149]'
                       }`}
                       style={{ 
                         top: `${topPos}%`, 
                         left: `${leftPos}%`,
                         boxShadow: `0 0 6px ${defect.surface === 'top' ? 'rgba(88,166,255,0.6)' : 'rgba(248,81,73,0.6)'}`
                       }}
                     />
                   );
                 })}

                 {/* Viewport Indicator inside plate */}
                 {analysisScrollState.height > 1 && (
                   <motion.div 
                     className="absolute left-0 w-full border-y-2 border-[#58a6ff] bg-[#58a6ff]/10 backdrop-blur-[1px] pointer-events-none z-20"
                     initial={false}
                     animate={{
                       top: `${(analysisScrollState.top / analysisScrollState.height) * 100}%`,
                       height: `${(analysisScrollState.clientHeight / analysisScrollState.height) * 100}%`
                     }}
                     transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                   />
                 )}
               </div>
             </div>
               {/* Side label */}
               <div className="absolute right-0 top-1/2 -rotate-90 origin-right text-[10px] text-[#8b949e] tracking-widest whitespace-nowrap translate-x-12">
                 纵向分布
               </div>
             </div>
             <div className="h-4 bg-[#161b22] text-[8px] flex items-center px-1 text-[#8b949e]">444.0</div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Center Panel: Image Viewer */}
        <div className="flex-1 flex flex-col gap-0.5">
          {/* Viewer Controls with Integrated Distribution Map */}
          <div className="h-8 bg-[#161b22] border border-[#30363d] flex items-center justify-between px-2 shrink-0 gap-4 relative">
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-0.5 items-center">
                <button 
                  className={`p-1 transition-colors ${isGridView ? 'bg-[#30363d] text-[#58a6ff]' : 'hover:bg-[#30363d] text-[#8b949e]'}`}
                  onClick={() => setIsGridView(!isGridView)}
                  title="列表模式"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <div className="w-px h-3 bg-[#30363d] mx-1 self-center" />
                
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                  <button 
                    className="p-1 hover:bg-[#30363d] text-[#c9d1d9] transition-colors disabled:opacity-30 disabled:hover:bg-transparent rounded-sm"
                    onClick={() => {
                      const idx = plates.findIndex(p => p.plateId === selectedPlate?.plateId);
                      if (idx > 0) setSelectedPlate(plates[idx - 1]);
                    }}
                    disabled={!selectedPlate || plates.findIndex(p => p.plateId === selectedPlate?.plateId) <= 0}
                    title="上一块 (Q)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-2 min-w-[100px] text-center">
                    <span className="text-[14px] font-mono font-bold text-[#58a6ff] tracking-tight leading-none">
                      {selectedPlate?.plateId || "H2255043006"}
                    </span>
                  </div>
                  <button 
                    className="p-1 hover:bg-[#30363d] text-[#c9d1d9] transition-colors disabled:opacity-30 disabled:hover:bg-transparent rounded-sm"
                    onClick={() => {
                      const idx = plates.findIndex(p => p.plateId === selectedPlate?.plateId);
                      if (idx < plates.length - 1) setSelectedPlate(plates[idx + 1]);
                    }}
                    disabled={!selectedPlate || plates.findIndex(p => p.plateId === selectedPlate?.plateId) >= plates.length - 1}
                    title="下一块 (E)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <span className="text-[12px] font-bold text-[#f0f6fc] tracking-tight ml-2 leading-none flex items-center">
                BN1D2 3.780 1530 I) {
                  surfaceFilter === 'all' ? '全表面' : surfaceFilter === 'top' ? '上表面' : '下表面'
                } 28/66
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex items-center gap-1.5 p-1 hover:bg-[#30363d] text-[#8b949e] disabled:opacity-50 mr-1 rounded-sm transition-colors"
                      title="人工判级"
                      disabled={!selectedPlate}
                    >
                      {selectedPlate?.level && (
                        <span className={`text-[12px] font-bold ${
                          selectedPlate.level === 'D' ? 'text-[#f85149]' : 
                          selectedPlate.level === 'C' ? 'text-[#e3b341]' : 
                          'text-[#3fb950]'
                        }`}>
                          {{ 'A': '一等品', 'B': '二等品', 'C': '三等品', 'D': '等外品' }[selectedPlate.level] || selectedPlate.level}
                        </span>
                      )}
                      <Gavel className={`w-3.5 h-3.5 ${(selectedPlate as any)?.isManual ? 'text-[#409eff]' : ''}`} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#161b22] border-[#30363d] text-[12px] min-w-[120px] p-1 shadow-2xl z-[150]">
                    <DropdownMenuLabel className="text-[#8b949e] py-1 px-2 text-[12px]">
                      自动判级: <span className="text-[#f0f6fc] font-bold">{selectedPlate?.level || '-'}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                    <DropdownMenuItem 
                      onClick={() => {
                         if (!selectedPlate) return;
                         toast.success("已清除判级结果");
                      }}
                      className="focus:bg-[#30363d] focus:text-[#f0f6fc] cursor-pointer py-1 px-2 rounded-sm text-[#8b949e]"
                    >
                      清除级别
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => toast.success("已标记为重点关注")}
                      className="focus:bg-[#30363d] focus:text-[#f0f6fc] cursor-pointer py-1 px-2 rounded-sm text-[#d29922]"
                    >
                      <Target className="w-3 h-3 mr-2 inline" />
                      重点标记
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#30363d]" />
                    {[
                      { l: 'A', t: '一等品', c: 'text-[#3fb950]' },
                      { l: 'B', t: '二等品', c: 'text-[#3fb950]' },
                      { l: 'C', t: '三等品', c: 'text-[#e3b341]' },
                      { l: 'D', t: '等外品', c: 'text-[#f85149]' },
                    ].map(item => (
                      <DropdownMenuItem 
                        key={item.l}
                        onClick={() => {
                          if (!selectedPlate) return;
                          const newPlate = { ...selectedPlate, level: item.l as any, isManual: true };
                          setSelectedPlate(newPlate);
                          setPlates(prev => prev.map(p => p.serialNumber === newPlate.serialNumber ? newPlate : p));
                          toast.success(`已判级为 ${item.t}`);
                        }}
                        className={`focus:bg-[#30363d] focus:text-[#f0f6fc] cursor-pointer py-1 px-2 rounded-sm ${item.c}`}
                      >
                        {item.t} ({item.l})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <button 
                  className="p-1 hover:bg-[#30363d] text-[#8b949e]"
                  onClick={() => { setImgScale(1); setImgOffset({ x: 0, y: 0 }); }}
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                <button 
                  className="p-1 hover:bg-[#30363d] text-[#8b949e]"
                  onClick={() => setImgScale(prev => Math.min(10, prev * 1.2))}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-[12px] px-2 flex items-center bg-[#0d1117] border border-[#30363d] min-w-[45px] justify-center">
                  {Math.round(imgScale * 100)}%
                </span>
                <button 
                  className="p-1 hover:bg-[#30363d] text-[#8b949e]"
                  onClick={() => setImgScale(prev => Math.max(0.1, prev * 0.8))}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1">
                <button 
                  className="p-1 hover:bg-[#30363d] text-[#8b949e]"
                  onClick={() => setIsImmersiveMode(!isImmersiveMode)}
                  title={isImmersiveMode ? "退出沉浸模式 (F)" : "全屏沉浸模式 (F)"}
                >
                  {isImmersiveMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded p-0.5 gap-0.5 ml-2">
                  {[
                    { id: 'all', label: '全部' },
                    { id: 'top', label: '上表' },
                    { id: 'bottom', label: '下表' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSurfaceFilter(item.id as any)}
                      className={`px-2 py-0.5 text-[12px] font-bold rounded transition-all ${
                        surfaceFilter === item.id 
                          ? "bg-[#58a6ff] text-white" 
                          : "text-[#8b949e] hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Detail Bar */}
          <div className="h-8 bg-[#161b22] border border-[#30363d] flex items-center justify-between px-1 shrink-0 overflow-hidden">
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1">
              {plateDefects.length > 0 ? (
                <>
                  <div className="flex items-center gap-1 bg-[#238636]/10 border border-[#238636]/30 px-2 py-0.5 rounded text-[10px] text-[#3fb950]">
                    <span>当前缺陷</span><span className="font-bold">{plateDefects[0].type}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#d29922]/10 border border-[#d29922]/30 px-2 py-0.5 rounded text-[10px] text-[#d29922]">
                    <span>置信度</span><span className="font-bold">{(plateDefects[0].confidence * 100).toFixed(1)}%</span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-[#8b949e] px-2 italic">无缺陷数据</div>
              )}
              <div className="flex items-center gap-1 bg-[#58a6ff]/10 border border-[#58a6ff]/30 px-2 py-0.5 rounded text-[10px] text-[#58a6ff]">
                <span>表面</span><span className="font-bold">{surfaceImages[0]?.surface === 'top' ? '上表面' : '下表面'}</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 ml-2 shrink-0 border-l border-[#30363d] pl-1.5">
              <button 
                onClick={() => setSelectedPlate(plates[0])}
                className="h-6 px-2 flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#30363d] rounded transition-colors" title="跳至开头"
              >
                <RefreshCcw className="w-3 h-3" />
                <span>开头</span>
              </button>
              <button 
                onClick={() => {
                  const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
                  if (idx > 0) setSelectedPlate(plates[idx - 1]);
                }}
                className="h-6 px-2 flex items-center gap-1 text-[10px] text-[#c9d1d9] hover:bg-[#30363d] rounded transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>上一个</span>
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`h-6 px-2 flex items-center gap-1 text-[10px] rounded border transition-colors ${
                  isPlaying 
                    ? 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30 hover:bg-[#f85149]/20' 
                    : 'bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/30 hover:bg-[#58a6ff]/20'
                }`}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? '停止播放' : '自动播放'}</span>
              </button>
              <button 
                onClick={() => {
                  const idx = plates.findIndex(p => p.serialNumber === selectedPlate?.serialNumber);
                  if (idx < plates.length - 1) setSelectedPlate(plates[idx + 1]);
                }}
                className="h-6 px-2 flex items-center gap-1 text-[10px] text-[#c9d1d9] hover:bg-[#30363d] rounded transition-colors"
              >
                <span>下一个</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <div className="w-px h-3 bg-[#30363d] mx-0.5" />
              <button className="h-6 px-3 text-[10px] text-[#3fb950] font-bold bg-[#238636]/10 border border-[#238636]/40 rounded hover:bg-[#238636]/20 transition-colors">
                确认
              </button>
              <button className="h-6 px-2 text-[10px] text-[#8b949e] border border-[#30363d] rounded hover:bg-[#30363d] transition-colors">
                自动确认
              </button>
              <button
                onClick={() => setIsDefectListOpen(!isDefectListOpen)}
                className={`h-6 w-7 flex items-center justify-center rounded border transition-colors ${
                  isDefectListOpen 
                    ? 'bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/30' 
                    : 'text-[#8b949e] border-[#30363d] hover:bg-[#30363d]'
                }`}
                title={isDefectListOpen ? "收起缺陷列表 (L)" : "展开缺陷列表 (L)"}
              >
                {isDefectListOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Image Display & Defect List Container */}
          <div className="flex-1 flex overflow-hidden">
            <div 
              className="flex-1 bg-black relative flex items-center justify-center overflow-hidden border border-[#30363d] cursor-crosshair"
              onWheel={activeNav !== "图像分析" && !isGridView ? handleImageWheel : undefined}
              onMouseDown={activeNav !== "图像分析" && !isGridView ? handleImageMouseDown : undefined}
              onMouseMove={activeNav !== "图像分析" && !isGridView ? (e => { handleMouseMove(e); handleImageMouseMove(e); }) : handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <AnimatePresence mode="wait">
                {activeNav === "图像分析" ? (
                  <motion.div
                    key="analysis-split-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#0d1117] flex flex-col"
                  >
                    {/* Top Surface Viewport */}
                    {(surfaceFilter === 'all' || surfaceFilter === 'top') && (
                      <div 
                        ref={topScrollRef}
                        onScroll={(e) => handleScrollSync(e, 'top')}
                        className={`relative w-full overflow-y-auto custom-scrollbar overflow-x-hidden ${
                          surfaceFilter === 'all' ? 'flex-1 border-b-2 border-[#30363d]/50' : 'h-full'
                        }`}
                      >
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-[10px] text-[#58a6ff] font-bold z-10 border border-[#58a6ff]/30 rounded-sm">TOP SURFACE</div>
                        <div className="flex flex-col w-full">
                          {Array.from({ length: Math.ceil((selectedPlate?.dimensions.length || 8000) / 1024) }).map((_, i) => (
                            <img
                              key={`top-tile-${i}`}
                              src={getTileImageUrl({
                                surface: 'top',
                                seqNo: parseInt(selectedPlate?.serialNumber || "0", 10),
                                level: 0,
                                tileX: 0,
                                tileY: i,
                                tileSize: 1024
                              })}
                              className="w-full h-auto grayscale brightness-90 contrast-110 bg-[#1c2128] aspect-square"
                              loading="lazy"
                              style={{ minHeight: '200px' }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Surface Viewport */}
                    {(surfaceFilter === 'all' || surfaceFilter === 'bottom') && (
                      <div 
                        ref={bottomScrollRef}
                        onScroll={(e) => handleScrollSync(e, 'bottom')}
                        className={`relative w-full overflow-y-auto custom-scrollbar overflow-x-hidden ${
                          surfaceFilter === 'all' ? 'flex-1' : 'h-full'
                        }`}
                      >
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-[10px] text-[#f85149] font-bold z-10 border border-[#f85149]/30 rounded-sm">BOTTOM SURFACE</div>
                        <div className="flex flex-col w-full">
                          {Array.from({ length: Math.ceil((selectedPlate?.dimensions.length || 8000) / 1024) }).map((_, i) => (
                            <img
                              key={`bottom-tile-${i}`}
                              src={getTileImageUrl({
                                surface: 'bottom',
                                seqNo: parseInt(selectedPlate?.serialNumber || "0", 10),
                                level: 0,
                                tileX: 0,
                                tileY: i,
                                tileSize: 1024
                              })}
                              className="w-full h-auto grayscale brightness-90 contrast-110 bg-[#1c2128] aspect-square"
                              loading="lazy"
                              style={{ minHeight: '200px' }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : isGridView ? (
                  <motion.div 
                    key="grid"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="absolute inset-0 p-4 overflow-y-auto grid gap-2 bg-[#0d1117] z-20 custom-scrollbar"
                    style={{ 
                      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` 
                    }}
                  >
                    {plateDefects.map((defect) => (
                      <motion.div 
                        key={defect.id}
                        whileHover={{ scale: 1.05, zIndex: 30 }}
                        onClick={() => {
                          setSelectedDefectId(defect.id);
                          setIsGridView(false);
                        }}
                        className="aspect-square bg-[#161b22] border border-[#30363d] relative group cursor-pointer overflow-hidden"
                      >
                        <img 
                          src={currentImageUrl}
                          className={`w-full h-full grayscale opacity-60 group-hover:opacity-100 transition-opacity ${isImageFit ? 'object-cover' : 'object-contain'}`}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="truncate font-bold">{defect.type}</div>
                          <div>{(defect.confidence * 100).toFixed(0)}%</div>
                        </div>
                      </motion.div>
                    ))}
                    {plateDefects.length === 0 && (
                      <div className="col-span-full h-full flex flex-col items-center justify-center text-[#8b949e]">
                        <LayoutGrid className="w-12 h-12 mb-2 opacity-20" />
                        <span className="text-xs">暂无缺陷数据</span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="single"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full relative flex items-center justify-center"
                    onDoubleClick={() => setIsGridView(true)}
                  >
                    {/* Blurred Grid Background */}
                    <div className="absolute inset-0 opacity-10 blur-2xl pointer-events-none overflow-hidden scale-110">
                      <div className="grid grid-cols-8 gap-2 w-full h-full">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} className="aspect-square bg-white/5 border border-white/5" />
                        ))}
                      </div>
                    </div>

                    <div className="w-full h-full opacity-50 absolute inset-0 bg-[radial-gradient(#30363d_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
                    
                    <div 
                      className="relative transition-transform duration-75 ease-out origin-center"
                      style={{
                        transform: `translate(${imgOffset.x}px, ${imgOffset.y}px) scale(${imgScale})`,
                        cursor: isPanning ? 'grabbing' : 'grab'
                      }}
                    >
                      <img 
                        src={currentImageUrl} 
                        alt="Surface Defect Detail"
                        className="max-h-[600px] grayscale brightness-90 contrast-110 pointer-events-none select-none"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop";
                        }}
                      />
                    </div>

                    {/* Scale Indicator Overlay */}
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 border border-white/10 text-[9px] text-[#8b949e] font-mono pointer-events-none">
                      SCALE: {imgScale.toFixed(2)}x
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Defect List Panel */}
            <AnimatePresence>
              {isDefectListOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="bg-[#161b22] border-l border-[#30363d] flex flex-col"
                >
                  <div className="h-8 border-b border-[#30363d] flex items-center px-3 justify-between shrink-0">
                    <span className="text-[11px] font-bold text-[#f0f6fc]">缺陷列表 ({plateDefects.length})</span>
                    <Activity className="w-3 h-3 text-[#58a6ff]" />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                    {plateDefects.map((defect, idx) => (
                      <div 
                        key={defect.id}
                        onClick={() => setSelectedDefectId(defect.id)}
                        className={`p-2 bg-[#0d1117] border rounded-sm transition-colors cursor-pointer group ${
                          selectedDefectId === defect.id ? 'border-[#58a6ff] bg-[#58a6ff]/5' : 'border-[#30363d] hover:border-[#58a6ff]/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold text-[#58a6ff]">#{idx + 1} {defect.type}</span>
                          <span className={`text-[9px] px-1 rounded-sm ${
                            defect.confidence > 0.9 ? 'bg-[#238636]/20 text-[#3fb950]' : 'bg-[#d29922]/20 text-[#d29922]'
                          }`}>
                            {(defect.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] text-[#8b949e] font-mono">
                          <div className="flex items-center gap-1">
                            <Locate className="w-2.5 h-2.5" />
                            <span>X: {defect.x.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Y: {defect.y.toFixed(0)}</span>
                          </div>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-[#30363d]/50 flex justify-end">
                          <button className="p-1 hover:bg-[#30363d] rounded text-[#8b949e] group-hover:text-[#58a6ff] transition-colors">
                            <Target className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {plateDefects.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-30 mt-10">
                        <Search className="w-8 h-8 mb-2" />
                        <span className="text-[10px]">无缺陷数据</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Defect Legend (Legend area at bottom) */}
          <div className="h-[120px] bg-[#0d1117] border border-[#30363d] flex overflow-hidden">
             {/* Left: Defect Grid */}
             <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-5 gap-x-1 gap-y-1.5">
                 {DEFECT_TYPES.map((item, i) => {
                   const isSelected = selectedDefectTypes.includes(item.label);
                   const count = plateDefects.filter(d => d.type === item.label).length;
                   const confirmedCount = plateDefects.filter(d => d.type === item.label && (d as any).isConfirmed).length;
                   const unconfirmedCount = count - confirmedCount;
                   const isDisabled = count === 0;

                   return (
                     <button 
                       key={item.label} 
                       disabled={isDisabled}
                       onClick={() => {
                         setSelectedDefectTypes(prev => 
                           prev.includes(item.label) 
                             ? prev.filter(l => l !== item.label)
                             : [...prev, item.label]
                         );
                       }}
                       className={`flex items-center gap-1.5 px-2 py-1.5 transition-all rounded-[1px] border ${
                         isDisabled
                           ? "bg-transparent border-transparent opacity-20 grayscale cursor-default"
                           : isSelected 
                             ? "bg-[#30363d]/70 border-[#58a6ff]/70 shadow-[inset_0_0_10px_rgba(88,166,255,0.1)]" 
                             : "bg-[#161b22]/40 border-transparent hover:border-[#30363d] hover:bg-[#161b22] cursor-pointer"
                       }`}
                     >
                       <div className="relative shrink-0">
                         <div 
                           className="w-2.5 h-2.5 rounded-full" 
                           style={{ backgroundColor: item.color }} 
                         />
                         {isSelected && count > 0 && (
                           <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: item.color }} />
                         )}
                       </div>
                       <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-[11px] font-bold truncate ${isDisabled ? 'text-[#8b949e]' : isSelected ? 'text-[#f0f6fc]' : 'text-[#c9d1d9]'}`}>
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            {isDisabled ? (
                              <span className="text-[10px] text-[#8b949e]/50 font-bold">无</span>
                            ) : (
                              <>
                                <span className="text-[10px] text-[#f0f6fc] font-mono font-bold bg-[#30363d] px-1.5 rounded-sm">{count}</span>
                                <span className="text-[10px] text-[#3fb950] font-mono font-bold">{confirmedCount}</span>
                                <span className="text-[10px] text-[#f85149] font-mono font-bold">{unconfirmedCount}</span>
                              </>
                            )}
                          </div>
                       </div>
                     </button>
                   );
                 })}
               </div>
             </div>

             {/* Right: Action Buttons (Vertical) */}
             <div className="w-[80px] bg-[#161b22] border-l border-[#30363d] flex flex-col p-1 gap-1">
               <button 
                 onClick={() => setSelectedDefectTypes(DEFECT_TYPES.map(t => t.label))}
                 className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] transition-all border border-[#30363d]"
               >
                 <Layout className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-bold">全选</span>
               </button>
               <button 
                 onClick={() => setSelectedDefectTypes([])}
                 className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#21262d] hover:bg-[#30363d] text-[#f85149] transition-all border border-[#30363d]"
               >
                 <Square className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-bold">清空</span>
               </button>
               <button 
                 className="h-6 flex items-center justify-center bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30 hover:bg-[#238636]/40 transition-colors"
               >
                 <RefreshCcw className="w-3 h-3" />
               </button>
             </div>
          </div>
        </div>

        {/* Right Map Strip (Vertical) */}
        <AnimatePresence>
          {surfaceFilter !== 'top' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 180, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-[#0d1117] flex flex-col border border-[#30363d] overflow-hidden whitespace-nowrap"
            >
             <div className="h-6 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-1 text-[9px]">
               <span>{surfaceFilter === 'all' ? '下表分布' : '传动侧分布'}</span>
               <div className="flex gap-1">
               <ZoomIn className="w-3 h-3" />
               <ZoomOut className="w-3 h-3" />
             </div>
           </div>
           <div className="flex-1 relative flex justify-center bg-[#161b22]/30">
              {/* Viewport Indicator */}
              {activeNav === "图像分析" && (surfaceFilter === 'all' || surfaceFilter === 'bottom') && (
                 <div 
                   className="absolute left-0 right-0 border-2 border-[#58a6ff] bg-[#58a6ff]/20 pointer-events-none z-10"
                   style={{
                     top: `${(analysisScrollState.top / analysisScrollState.height) * 100}%`,
                     height: `${(analysisScrollState.clientHeight / analysisScrollState.height) * 100}%`
                   }}
                 />
               )}
              <div className="w-px h-full bg-[#30363d] absolute" />
              <div className="absolute right-0 top-1/2 -rotate-90 origin-right text-[10px] text-[#8b949e] tracking-widest whitespace-nowrap translate-x-12">
                传动侧分布
              </div>
           </div>
           <div className="h-4 bg-[#161b22] text-[8px] flex items-center px-1 text-[#8b949e]">446.0</div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>

      {/* Footer / Status Bar */}
      <StatusBar />
      <DataSourceModal
        isOpen={isDataSourceOpen}
        onClose={() => setIsDataSourceOpen(false)}
        nodes={apiNodes}
        onRefresh={refreshDataSources}
        currentLineKey={apiNodes.find(n => n?.line_name?.includes("1780"))?.line_key || ""}
        onConfirm={(lineKey) => {
          const node = apiNodes.find(n => n.line_key === lineKey);
          if (node) {
            setCurrentLine(node.line_name);
            toast.success(`已切换至: ${node.line_name}`);
          }
          setIsDataSourceOpen(false);
        }}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={(user) => {
          setCurrentUser(user);
          saveUser(user);
          toast.success(`欢迎回来, ${user.username}`);
        }}
      />
    </div>
  );
}