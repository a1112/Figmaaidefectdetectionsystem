import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCcw, Trash2, Lock, EyeOff } from "lucide-react";
import { toast } from "sonner@2.0.3";
import {
  clearConfigStatusLogs,
  getConfigStatus,
  getConfigStatusLogs,
  type LineStatusItem,
  type ServiceStatus,
  type SystemMonitor,
} from "../api/status";

const stateColor = (state?: string | null) => {
  const normalized = (state || "").toLowerCase();
  if (normalized === "error") return "bg-red-500/10 text-red-400 border-red-500/30";
  if (normalized === "running") return "bg-blue-500/10 text-blue-300 border-blue-500/30";
  if (normalized === "warning") return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
};

export default function StatusCenterPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LineStatusItem[]>([]);
  const [monitor, setMonitor] = useState<SystemMonitor | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [lockedService, setLockedService] = useState<string | null>(null);
  const [hiddenServices, setHiddenServices] = useState<string[]>([]);
  const [logService, setLogService] = useState<string>("all");
  const [logs, setLogs] = useState<any[]>([]);
  const [logCursor, setLogCursor] = useState(0);
  const logCursorRef = useRef(0);

  const currentItem = useMemo(() => {
    if (!selectedKey || !selectedKind) return items[0] || null;
    return items.find((item) => item.key === selectedKey && item.kind === selectedKind) || null;
  }, [items, selectedKey, selectedKind]);

  const serviceList = useMemo(() => {
    const services = currentItem?.services || [];
    let filtered = services;
    if (lockedService) {
      filtered = filtered.filter((svc) => svc.name === lockedService);
    } else if (hiddenServices.length) {
      filtered = filtered.filter((svc) => !hiddenServices.includes(svc.name));
    }
    return filtered;
  }, [currentItem, hiddenServices, lockedService]);

  const loadItems = async () => {
    try {
      const payload = await getConfigStatus();
      setItems(payload.items);
      setMonitor(payload.system_monitor || null);
      if (!selectedKey || !selectedKind) {
        if (payload.items.length) {
          setSelectedKey(payload.items[0].key);
          setSelectedKind(payload.items[0].kind || "2D");
        }
      }
    } catch {
      toast.error("状态列表加载失败");
    }
  };

  useEffect(() => {
    void loadItems();
    const timer = window.setInterval(loadItems, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentItem?.key || !currentItem?.kind) return;
    const loadLogs = async () => {
      try {
        const resp = await getConfigStatusLogs(
          currentItem.key,
          currentItem.kind,
          logService,
          logCursorRef.current,
          200,
        );
        const nextItems = resp.items || [];
        if (logCursorRef.current === 0) {
          setLogs(nextItems);
        } else if (nextItems.length) {
          setLogs((prev) => [...prev, ...nextItems].slice(-500));
        }
        const nextCursor = resp.cursor || logCursorRef.current;
        logCursorRef.current = nextCursor;
        setLogCursor(nextCursor);
      } catch {
        if (logCursorRef.current === 0) {
          setLogs([]);
        }
      }
    };
    void loadLogs();
    const timer = window.setInterval(loadLogs, 2000);
    return () => window.clearInterval(timer);
  }, [currentItem?.key, currentItem?.kind, logService]);

  const resetLogs = async () => {
    logCursorRef.current = 0;
    setLogCursor(0);
    if (!currentItem?.key || !currentItem?.kind) return;
    try {
      const resp = await getConfigStatusLogs(currentItem.key, currentItem.kind, logService, 0, 200);
      setLogs(resp.items || []);
      logCursorRef.current = resp.cursor || 0;
      setLogCursor(logCursorRef.current);
    } catch {
      setLogs([]);
    }
  };

  const clearLogs = async () => {
    if (!currentItem?.key || !currentItem?.kind) return;
    await clearConfigStatusLogs(currentItem.key, currentItem.kind, logService);
    logCursorRef.current = 0;
    setLogCursor(0);
    setLogs([]);
    toast.success("日志已清空");
  };

  const toggleHidden = (service: ServiceStatus) => {
    setHiddenServices((prev) => {
      if (prev.includes(service.name)) {
        return prev.filter((name) => name !== service.name);
      }
      return [...prev, service.name];
    });
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-tighter">返回</span>
          </button>
          <div className="h-6 w-[1px] bg-border mx-1" />
          <div className="text-sm font-bold">状态监控</div>
        </div>
        <button
          onClick={loadItems}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-xs"
        >
          <RefreshCcw className="w-3 h-3" />
          刷新
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-border bg-card/60 p-3 overflow-auto">
          <div className="text-xs font-semibold mb-2">API 列表</div>
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const active = item.key === selectedKey && item.kind === selectedKind;
              return (
                <button
                  key={`${item.key}-${item.kind}`}
                  onClick={() => {
                    setSelectedKey(item.key);
                    setSelectedKind(item.kind || "2D");
                    setLockedService(null);
                    setHiddenServices([]);
                    setLogService("all");
                    logCursorRef.current = 0;
                    setLogCursor(0);
                  }}
                  className={`text-left rounded-sm border px-3 py-2 text-xs transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="font-semibold">
                    {item.name || item.key} ({item.kind || "2D"})
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {item.host}:{item.port}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {!currentItem ? (
            <div className="text-sm text-muted-foreground">暂无状态数据</div>
          ) : (
            <div className="flex flex-col gap-4">
              {monitor && (
                <div className="border border-border rounded-sm p-3 bg-card/70 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>系统监控</span>
                    <span>更新时间：{monitor.updated_at || "--"}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span>CPU：{monitor.cpu_percent ?? "--"}%</span>
                    <span>内存：{monitor.memory?.percent ?? "--"}%</span>
                    <span>磁盘：{monitor.disk_updated_at || "--"}</span>
                  </div>
                </div>
              )}
              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">
                      {currentItem.name || currentItem.key} / {currentItem.kind || "2D"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {currentItem.host}:{currentItem.port}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    数据时间：{currentItem.latest_timestamp || "--"}
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span>服务状态</span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <button
                      onClick={() => {
                        setLockedService(null);
                        setHiddenServices([]);
                      }}
                      className="px-2 py-1 border border-border rounded-sm"
                    >
                      恢复默认
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {serviceList.map((service) => (
                    <div
                      key={service.name}
                      className="border border-border rounded-sm p-2 bg-background/60 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{service.label || service.name}</span>
                        <span className={`px-2 py-0.5 rounded-sm border ${stateColor(service.state)}`}>
                          {service.state || "ready"}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {service.message || "系统就绪"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        更新时间：{service.updated_at || "--"}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() =>
                            setLockedService((prev) => (prev === service.name ? null : service.name))
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-[11px]"
                        >
                          <Lock className="w-3 h-3" />
                          {lockedService === service.name ? "取消锁定" : "锁定"}
                        </button>
                        <button
                          onClick={() => toggleHidden(service)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-[11px]"
                        >
                          <EyeOff className="w-3 h-3" />
                          {hiddenServices.includes(service.name) ? "取消屏蔽" : "屏蔽"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-card/70">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span>服务日志</span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <button
                      onClick={resetLogs}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      刷新日志
                    </button>
                    <button
                      onClick={clearLogs}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-destructive/40 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                      清空日志
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs mb-2">
                  <span className="text-muted-foreground">服务筛选</span>
                  <select
                    value={logService}
                    onChange={(e) => {
                      setLogService(e.target.value);
                      logCursorRef.current = 0;
                      setLogCursor(0);
                    }}
                    className="h-7 rounded-sm border border-border bg-background px-2 text-xs"
                  >
                    <option value="all">全部</option>
                    {(currentItem.services || []).map((service) => (
                      <option key={service.name} value={service.name}>
                        {service.label || service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="h-56 overflow-auto border border-border rounded-sm bg-[#0b0f14] text-[#c9d1d9] font-mono text-[11px]">
                  {logs.length === 0 ? (
                    <div className="px-3 py-4 text-muted-foreground">暂无日志</div>
                  ) : (
                    logs.map((item, idx) => (
                      <div key={`status-log-${idx}`} className="px-3 py-2 border-b border-white/5">
                        <div className="text-[#8b949e]">
                          [{item.id}] {item.time} {item.level}
                        </div>
                        <div className="text-[#7aa2f7]">
                          {item.service ? `服务: ${item.service} ` : ""}
                          {item.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
