import { RefObject, useEffect, useState } from "react";
import {
  X,
  Camera,
  HardDrive,
  Cpu,
  Wifi,
  RefreshCw,
  Power,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";

interface SystemDiagnosticDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
}

export function SystemDiagnosticDialog({
  isOpen,
  onClose,
  triggerRef,
}: SystemDiagnosticDialogProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [cameraStatus, setCameraStatus] = useState({
    online: true,
    fps: 30,
    resolution: "1920x1080",
    temperature: 42,
  });
  const [diskUsage, setDiskUsage] = useState({
    used: 458,
    total: 1024,
    percentage: 45,
  });
  const [serverResources, setServerResources] = useState({
    cpu: 35,
    memory: 62,
    temperature: 58,
  });
  const [network, setNetwork] = useState({
    status: "connected",
    latency: 12,
    bandwidth: 95.6,
  });

  // 模拟实时数据更新
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      // 模拟轻微波动
      setCameraStatus((prev) => ({
        ...prev,
        fps: 30 + Math.floor(Math.random() * 2),
        temperature: 42 + Math.floor(Math.random() * 3),
      }));

      setServerResources((prev) => ({
        cpu: Math.max(
          30,
          Math.min(40, prev.cpu + (Math.random() - 0.5) * 5),
        ),
        memory: Math.max(
          60,
          Math.min(65, prev.memory + (Math.random() - 0.5) * 3),
        ),
        temperature: Math.max(
          55,
          Math.min(
            62,
            prev.temperature + (Math.random() - 0.5) * 4,
          ),
        ),
      }));

      setNetwork((prev) => ({
        ...prev,
        latency: Math.max(
          10,
          Math.min(
            15,
            prev.latency + (Math.random() - 0.5) * 2,
          ),
        ),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left - 500 + rect.width,
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  const handleResetSystem = () => {
    alert("执行一键恢复...");
  };

  const handleRestartCamera = () => {
    setCameraStatus((prev) => ({ ...prev, online: false }));
    setTimeout(() => {
      setCameraStatus((prev) => ({
        ...prev,
        online: true,
        fps: 30,
      }));
      alert("相机重启完成");
    }, 2000);
  };

  const handleRestartServer = () => {
    alert("确认重启服务器？此操作将中断当前所有检测任务。");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed z-50 bg-card border-2 border-primary shadow-2xl shadow-primary/20"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: "550px",
        }}
      >
        {/* Header */}
        <div className="bg-primary/20 border-b-2 border-primary px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-wider">
              系统诊断 / SYSTEM DIAGNOSTIC
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-primary/30 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {/* 相机状态 */}
          <div className="bg-muted/30 border border-border/50 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-xs uppercase tracking-wide">
                  相机状态 / CAMERA
                </h4>
              </div>
              {cameraStatus.online ? (
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>在线</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>离线</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  帧率 FPS
                </div>
                <div className="font-mono font-bold text-lg">
                  {cameraStatus.fps} fps
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  分辨率
                </div>
                <div className="font-mono font-bold text-sm">
                  {cameraStatus.resolution}
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  温度
                </div>
                <div
                  className={`font-mono font-bold text-lg ${
                    cameraStatus.temperature > 50
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {cameraStatus.temperature}°C
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  状态
                </div>
                <div className="text-green-400 font-bold">
                  正常
                </div>
              </div>
            </div>

            <button
              onClick={handleRestartCamera}
              className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border border-blue-500/50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重启相机
            </button>
          </div>

          {/* 磁盘使用 */}
          <div className="bg-muted/30 border border-border/50 p-3">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <h4 className="font-bold text-xs uppercase tracking-wide">
                磁盘使用 / DISK USAGE
              </h4>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  已用空间
                </span>
                <span className="font-mono font-bold">
                  {diskUsage.used}GB / {diskUsage.total}GB
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-6 bg-background border border-border/50 rounded-sm overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-500 ${
                    diskUsage.percentage > 80
                      ? "bg-red-500/70"
                      : diskUsage.percentage > 60
                        ? "bg-yellow-500/70"
                        : "bg-green-500/70"
                  }`}
                  style={{ width: `${diskUsage.percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {diskUsage.percentage}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                <div className="bg-background/50 border border-border/30 p-2 text-center">
                  <div className="text-muted-foreground mb-1">
                    可用
                  </div>
                  <div className="font-mono font-bold text-green-400">
                    {diskUsage.total - diskUsage.used}GB
                  </div>
                </div>
                <div className="bg-background/50 border border-border/30 p-2 text-center">
                  <div className="text-muted-foreground mb-1">
                    已用
                  </div>
                  <div className="font-mono font-bold text-yellow-400">
                    {diskUsage.used}GB
                  </div>
                </div>
                <div className="bg-background/50 border border-border/30 p-2 text-center">
                  <div className="text-muted-foreground mb-1">
                    总容量
                  </div>
                  <div className="font-mono font-bold">
                    {diskUsage.total}GB
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 服务器资源 */}
          <div className="bg-muted/30 border border-border/50 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-orange-400" />
              <h4 className="font-bold text-xs uppercase tracking-wide">
                服务器资源 / SERVER RESOURCES
              </h4>
            </div>

            <div className="space-y-3">
              {/* CPU */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    CPU使用率
                  </span>
                  <span className="font-mono font-bold">
                    {serverResources.cpu.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-4 bg-background border border-border/50 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full bg-blue-500/70 transition-all duration-500"
                    style={{ width: `${serverResources.cpu}%` }}
                  />
                </div>
              </div>

              {/* Memory */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    内存使用率
                  </span>
                  <span className="font-mono font-bold">
                    {serverResources.memory.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-4 bg-background border border-border/50 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full bg-purple-500/70 transition-all duration-500"
                    style={{
                      width: `${serverResources.memory}%`,
                    }}
                  />
                </div>
              </div>

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    服务器温度
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      serverResources.temperature > 70
                        ? "text-red-400"
                        : serverResources.temperature > 60
                          ? "text-yellow-400"
                          : "text-green-400"
                    }`}
                  >
                    {serverResources.temperature.toFixed(0)}°C
                  </span>
                </div>
                <div className="w-full h-4 bg-background border border-border/50 rounded-sm overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-500 ${
                      serverResources.temperature > 70
                        ? "bg-red-500/70"
                        : serverResources.temperature > 60
                          ? "bg-yellow-500/70"
                          : "bg-green-500/70"
                    }`}
                    style={{
                      width: `${(serverResources.temperature / 100) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleRestartServer}
              className="w-full mt-3 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold border border-red-500/50 transition-colors flex items-center justify-center gap-2"
            >
              <Power className="w-3.5 h-3.5" />
              重启服务器
            </button>
          </div>

          {/* 网络状态 */}
          <div className="bg-muted/30 border border-border/50 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-green-400" />
                <h4 className="font-bold text-xs uppercase tracking-wide">
                  网络状态 / NETWORK
                </h4>
              </div>
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>已连接</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  延迟 PING
                </div>
                <div
                  className={`font-mono font-bold text-lg ${
                    network.latency < 20
                      ? "text-green-400"
                      : network.latency < 50
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {network.latency.toFixed(0)} ms
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  带宽
                </div>
                <div className="font-mono font-bold text-lg text-blue-400">
                  {network.bandwidth} Mbps
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  协议
                </div>
                <div className="font-mono font-bold">
                  TCP/IP
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  端口
                </div>
                <div className="font-mono font-bold">8080</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t-2 border-primary bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSystem}
              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold border border-yellow-500/50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              一键恢复
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-muted hover:bg-accent text-foreground text-xs font-bold border border-border transition-colors"
            >
              关闭
            </button>
          </div>
          <div className="mt-2 text-[9px] text-muted-foreground text-center">
            最后更新: {new Date().toLocaleTimeString("zh-CN")} |
            系统版本: v2.0.1
          </div>
        </div>
      </div>
    </>
  );
}