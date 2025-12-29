import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, Factory, RefreshCcw, Play } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner@2.0.3";
import {
  getLineConfig,
  saveLineConfig,
  getConfigApiList,
  restartLine,
  type ConfigApiNode,
} from "../../src/api/admin";

type LineItem = {
  name?: string;
  key?: string;
  mode?: string;
  ip?: string;
  port?: number | string;
  profile?: string;
  [key: string]: any;
};

const defaultLine: LineItem = {
  name: "",
  key: "",
  mode: "direct",
  ip: "",
  port: 8200,
  profile: "default",
};

export const LineConfigTable: React.FC = () => {
  const [lines, setLines] = useState<LineItem[]>([]);
  const [defaults, setDefaults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<Record<string, ConfigApiNode>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAll = async () => {
    setIsRefreshing(true);
    try {
      const [payload, status] = await Promise.all([
        getLineConfig(),
        getConfigApiList(),
      ]);
      setLines(payload.lines ?? []);
      setDefaults(payload.defaults ?? {});
      const statusMap: Record<string, ConfigApiNode> = {};
      status.forEach((item) => {
        if (item.key) statusMap[item.key] = item;
      });
      const latencyMap = await measureLatencies(statusMap);
      const merged = Object.keys(statusMap).reduce<Record<string, ConfigApiNode>>((acc, key) => {
        acc[key] = { ...statusMap[key], latency_ms: latencyMap[key] ?? null };
        return acc;
      }, {});
      setApiStatus(merged);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "加载产线配置失败";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAll();
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLineChange = (index: number, key: string, value: any) => {
    setLines((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [{ ...defaultLine }, ...prev]);
  };

  const handleDeleteLine = (index: number) => {
    if (!confirm("确定要删除该产线吗？")) return;
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveLineConfig({ lines, defaults });
      toast.success("产线配置已保存");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存产线配置失败";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const modeOptions = useMemo(() => ["direct", "proxy"], []);

  const formatAge = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return "--";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const remaining = minutes % 60;
      return `${hours}h${remaining}m`;
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
      const remainingHours = hours % 24;
      return `${days}d${remainingHours}h`;
    }
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return `${months}mo${remainingDays}d`;
  };

  const getLineKey = (line: LineItem) => line.key || line.name || "";
  const getHealthPath = (line: LineItem, status?: ConfigApiNode) => {
    const key = getLineKey(line);
    if (status?.path) {
      return `${status.path}/health`;
    }
    return `/api/${encodeURIComponent(key)}/health`;
  };

  const measureLatencies = async (statusMap: Record<string, ConfigApiNode>) => {
    const entries = Object.entries(statusMap);
    const results = await Promise.allSettled(
      entries.map(async ([key, status]) => {
        const line = lines.find((item) => (item.key || item.name) === key);
        const healthPath = getHealthPath(line || { key }, status);
        const start = typeof performance !== "undefined" ? performance.now() : Date.now();
        const response = await fetch(healthPath, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("health failed");
        }
        const end = typeof performance !== "undefined" ? performance.now() : Date.now();
        return { key, latency: Math.round(end - start) };
      }),
    );
    const latencyMap: Record<string, number> = {};
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        latencyMap[result.value.key] = result.value.latency;
      } else {
        const key = entries[index]?.[0];
        if (key) latencyMap[key] = -1;
      }
    });
    return latencyMap;
  };

  const handleTestLine = async (line: LineItem) => {
    const key = getLineKey(line);
    const status = apiStatus[key];
    const healthPath = getHealthPath(line, status);
    try {
      const response = await fetch(healthPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`接口返回 ${response.status}`);
      }
      toast.success(`产线 ${line.name || key} 测试通过`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "测试失败";
      toast.error(`产线 ${line.name || key} 测试失败: ${message}`);
    }
  };

  const handleRestartLine = async (line: LineItem) => {
    const key = getLineKey(line);
    if (!key) {
      toast.error("缺少产线 key");
      return;
    }
    try {
      await restartLine(key);
      toast.success(`产线 ${line.name || key} 已重启`);
      await loadAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "重启失败";
      toast.error(`产线 ${line.name || key} 重启失败: ${message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        正在加载产线配置...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl">产线编辑</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              数据来源：net_tabel/map.json
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleAddLine}>
            <Plus className="w-4 h-4 mr-2" />
            新增产线
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={loadAll}
            disabled={isRefreshing}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {isRefreshing ? "刷新中..." : "刷新状态"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "保存中..." : "保存配置"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">产线列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>模式</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>端口</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => {
                const key = getLineKey(line);
                const status = key ? apiStatus[key] : undefined;
                const online = status?.online ?? false;
                const ageText = formatAge(status?.latest_age_seconds ?? null);
                const latency =
                  status?.latency_ms === undefined || status?.latency_ms === null
                    ? "--"
                    : status?.latency_ms < 0
                      ? "--"
                      : `${status.latency_ms}ms`;
                return (
                  <TableRow key={`${line.key || line.name || "line"}-${index}`}>
                  <TableCell>
                    <Input
                      value={line.name ?? ""}
                      onChange={(e) => handleLineChange(index, "name", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.key ?? ""}
                      onChange={(e) => handleLineChange(index, "key", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.mode || "direct"}
                      onValueChange={(value) => handleLineChange(index, "mode", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modeOptions.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.ip ?? ""}
                      onChange={(e) => handleLineChange(index, "ip", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.port ?? ""}
                      onChange={(e) =>
                        handleLineChange(index, "port", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.profile ?? ""}
                      onChange={(e) =>
                        handleLineChange(index, "profile", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div className={online ? "text-emerald-500" : "text-muted-foreground"}>
                        {online ? "在线" : "离线"}
                      </div>
                      <div className="text-muted-foreground">最新: {ageText}</div>
                      <div className="text-muted-foreground">延迟: {latency}</div>
                    </div>
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestLine(line)}
                      title="测试接口"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestartLine(line)}
                      title="重启产线"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteLine(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
              {lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">
                    暂无产线数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
