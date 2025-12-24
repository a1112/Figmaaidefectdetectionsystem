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
import { Database } from "lucide-react";

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
  const hasUserSelectedRef = useRef(false);

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

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected);
    }
    onClose();
  };

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[520px]  bg-card border-border"

      >
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
                <div className={`text-xs ${isOffline ? "text-red-500" : "text-muted-foreground"}`}>
                  {node.ip ? node.ip : "-"}:{node.port ?? "-"}
                </div>
              </label>
              );
            })}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" type="button" onClick={onRefresh}>
            刷新
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selected}>
            切换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
