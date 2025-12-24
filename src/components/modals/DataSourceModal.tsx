import { useEffect, useState } from "react";
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
  currentLineName: string;
  onConfirm: (lineKey: string) => void;
}

export function DataSourceModal({
  isOpen,
  onClose,
  nodes,
  currentLineName,
  onConfirm,
}: DataSourceModalProps) {
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (currentLineName) {
      setSelected(currentLineName);
      return;
    }
    if (nodes.length > 0) {
      setSelected(nodes[0].key);
    }
  }, [isOpen, currentLineName, nodes]);

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border">
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
          {nodes.map((node) => (
            <label
              key={node.key}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
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
                  onChange={() => setSelected(node.key)}
                />
                <span className="font-medium">
                  {node.name} ({node.key})
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {node.ip ? node.ip : "-"}:{node.port ?? "-"}
              </div>
            </label>
          ))}
        </div>

        <DialogFooter className="pt-2">
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
