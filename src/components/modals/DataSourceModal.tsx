import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import type { ApiNode } from "../../src/api/types";
import { Database, Gauge } from "lucide-react";
import { getConfigSpeedTestUrl } from "../../src/api/admin";

const SPEED_TEST_DURATION_MS = 60_000;
const SPEED_SAMPLE_INTERVAL_MS = 1_000;

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ApiNode[];
  currentLineKey: string;
  onConfirm: (lineKey: string) => void;
  onRefresh: () => void;
}

export function DataSourceModal({
  isOpen,
  onClose,
  nodes,
  currentLineKey,
  onConfirm,
  onRefresh,
}: DataSourceModalProps) {
  const [selected, setSelected] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isSpeedTestOpen, setIsSpeedTestOpen] = useState(false);
  const [isSpeedTesting, setIsSpeedTesting] = useState(false);
  const [speedSamples, setSpeedSamples] = useState<number[]>([]);
  const [speedElapsed, setSpeedElapsed] = useState(0);
  const [speedError, setSpeedError] = useState<string | null>(null);
  const hasUserSelectedRef = useRef(false);
  const speedBytesRef = useRef(0);
  const speedLastBytesRef = useRef(0);
  const speedIntervalRef = useRef<number | null>(null);
  const speedTimeoutRef = useRef<number | null>(null);
  const speedAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasUserSelectedRef.current = false;
      return;
    }
    onRefresh();
    if (currentLineKey) {
      setSelected(currentLineKey);
    } else if (nodes.length > 0) {
      setSelected(nodes[0].key);
    } else {
      setSelected("");
    }
  }, [isOpen, onRefresh]);

  useEffect(() => {
    if (!isOpen) return;
    if (hasUserSelectedRef.current) return;
    if (!selected && nodes.length > 0) {
      setSelected(nodes[0].key);
    }
  }, [isOpen, nodes, selected]);

  useEffect(() => {
    if (!isOpen) return;
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, [isOpen]);

  useEffect(() => {
    if (!isSpeedTestOpen) {
      stopSpeedTest();
    }
  }, [isSpeedTestOpen]);

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected);
    }
    onClose();
  };

  const stopSpeedTest = (finalElapsed?: number) => {
    if (speedAbortRef.current) {
      speedAbortRef.current.abort();
      speedAbortRef.current = null;
    }
    if (speedIntervalRef.current != null) {
      window.clearInterval(speedIntervalRef.current);
      speedIntervalRef.current = null;
    }
    if (speedTimeoutRef.current != null) {
      window.clearTimeout(speedTimeoutRef.current);
      speedTimeoutRef.current = null;
    }
    setIsSpeedTesting(false);
    if (typeof finalElapsed === "number") {
      setSpeedElapsed(finalElapsed);
    }
  };

  const startSpeedTest = async () => {
    if (isSpeedTesting) return;
    setSpeedError(null);
    setSpeedSamples([]);
    setSpeedElapsed(0);
    speedBytesRef.current = 0;
    speedLastBytesRef.current = 0;
    setIsSpeedTesting(true);
    const controller = new AbortController();
    speedAbortRef.current = controller;
    const startAt = performance.now();
    const endAt = startAt + SPEED_TEST_DURATION_MS;

    speedIntervalRef.current = window.setInterval(() => {
      const now = performance.now();
      const elapsedSeconds = Math.min(
        60,
        Math.floor((now - startAt) / SPEED_SAMPLE_INTERVAL_MS),
      );
      setSpeedElapsed(elapsedSeconds);
      const deltaBytes = speedBytesRef.current - speedLastBytesRef.current;
      speedLastBytesRef.current = speedBytesRef.current;
      const mbps = (deltaBytes * 8) / 1_000_000;
      setSpeedSamples((prev) => [...prev, mbps].slice(-60));
    }, SPEED_SAMPLE_INTERVAL_MS);

    speedTimeoutRef.current = window.setTimeout(() => {
      stopSpeedTest(60);
    }, SPEED_TEST_DURATION_MS);

    try {
      const response = await fetch(
        getConfigSpeedTestUrl({ chunkKb: 1024, totalMb: 1024 }),
        {
        cache: "no-store",
        signal: controller.signal,
        },
      );
      if (!response.ok || !response.body) {
        throw new Error("测速接口不可用");
      }
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          speedBytesRef.current += value.byteLength;
        }
        if (performance.now() >= endAt) {
          controller.abort();
          break;
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setSpeedError("测速失败，请检查配置中心接口");
      }
    } finally {
      stopSpeedTest(Math.min(60, Math.floor((performance.now() - startAt) / 1000)));
    }
  };

  const formatMbps = (value: number) => {
    if (!Number.isFinite(value)) return "-";
    if (value < 10) return value.toFixed(2);
    if (value < 100) return value.toFixed(1);
    return value.toFixed(0);
  };

  const buildSpeedPath = (values: number[], width: number, height: number) => {
    if (!values.length) return "";
    const maxValue = Math.max(...values, 1);
    const step = width / Math.max(values.length - 1, 1);
    const points = values.map((value, index) => {
      const x = index * step;
      const y = height - (value / maxValue) * height;
      return { x, y };
    });
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      path += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    path += ` T ${last.x} ${last.y}`;
    return path;
  };

  const speedMax = speedSamples.length
    ? Math.max(...speedSamples)
    : 0;
  const speedAvg = speedSamples.length
    ? speedSamples.reduce((sum, value) => sum + value, 0) / speedSamples.length
    : 0;
  const speedCurrent = speedSamples.length
    ? speedSamples[speedSamples.length - 1]
    : 0;

  const formatAge = (seconds?: number) => {
    if (seconds == null || !Number.isFinite(seconds)) return "-";
    if (seconds < 60) return "刚刚";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    const months = Math.floor(days / 30);
    return `${months} 个月前`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[520px]  bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Database className="w-5 h-5 text-primary" />
            切换数据源
          </DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <div className="space-y-3 py-4">
          {nodes.length === 0 && (
            <div className="text-sm text-muted-foreground">
              暂无可用数据源，请确认后端已启动并提供 /config/api_list。
            </div>
          )}
          <div
            className="space-y-2 overflow-y-auto pr-1 overscroll-contain"
            style={{
              maxHeight: isMobile ? "calc(100vh - 240px)" : "320px",
            }}
          >
            {nodes.map((node) => {
              const isOffline = node.online === false;
              const isStale =
                node.latest_age_seconds != null &&
                Number.isFinite(node.latest_age_seconds) &&
                node.latest_age_seconds > 86400;
              const statusColor = isOffline
                ? "text-red-500"
                : isStale
                  ? "text-yellow-500"
                  : "text-muted-foreground";
              return (
              <label
                key={node.key}
                className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                  selected === node.key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="data-source"
                    value={node.key}
                    checked={selected === node.key}
                    onChange={() => {
                      hasUserSelectedRef.current = true;
                      setSelected(node.key);
                    }}
                  />
                  <div className="flex flex-col">
                    <span className={`font-medium ${isOffline ? "text-red-500" : ""}`}>
                      {node.name} ({node.key})
                    </span>
                    <span className={`text-[11px] ${statusColor}`}>
                      {node.online ? "在线" : "离线"} · 最新数据 {formatAge(node.latest_age_seconds)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                      node.small_port
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "border-red-500/30 bg-red-500/10 text-red-500"
                    }`}
                  >
                    SMALL
                  </span>
                  <div
                    className={`text-xs ${isOffline ? "text-red-500" : "text-muted-foreground"}`}
                  >
                    {node.ip ? node.ip : "-"}:{node.port ?? "-"}
                  </div>
                </div>
              </label>
              );
            })}
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="测速"
            onClick={() => setIsSpeedTestOpen(true)}
          >
            <Gauge className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={onRefresh}>
              刷新
            </Button>
            <Button variant="outline" type="button" onClick={onClose}>
              取消
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!selected}>
              切换
            </Button>
          </div>
        </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSpeedTestOpen} onOpenChange={setIsSpeedTestOpen}>
        <DialogContent className="sm:max-w-[560px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Gauge className="h-5 w-5 text-primary" />
            下载带宽测试
          </DialogTitle>
          <DialogDescription>
            1分钟下行带宽测试，结果仅作参考。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>进度: {speedElapsed}s / 60s</span>
              <span>峰值: {formatMbps(speedMax)} Mbps</span>
            </div>
            <div className="mt-3 h-[140px] w-full">
              <svg viewBox="0 0 520 140" className="h-full w-full">
                <defs>
                  <linearGradient id="speedLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <path
                  d={buildSpeedPath(speedSamples, 520, 120)}
                  fill="none"
                  stroke="url(#speedLine)"
                  strokeWidth="3"
                />
                <line x1="0" y1="120" x2="520" y2="120" stroke="currentColor" opacity="0.2" />
              </svg>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-muted-foreground">当前</div>
                <div className="text-base font-semibold text-foreground">
                  {formatMbps(speedCurrent)} Mbps
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">平均</div>
                <div className="text-base font-semibold text-foreground">
                  {formatMbps(speedAvg)} Mbps
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">样本</div>
                <div className="text-base font-semibold text-foreground">
                  {speedSamples.length} / 60
                </div>
              </div>
            </div>
          </div>

          {speedError && (
            <div className="text-sm text-red-500">{speedError}</div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSpeedTestOpen(false)}
          >
            关闭
          </Button>
          {isSpeedTesting ? (
            <Button type="button" variant="outline" onClick={() => stopSpeedTest()}>
              停止
            </Button>
          ) : (
            <Button type="button" onClick={startSpeedTest}>
              开始测速
            </Button>
          )}
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
