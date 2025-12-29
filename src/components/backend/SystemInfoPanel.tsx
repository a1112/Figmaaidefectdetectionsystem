import { useEffect, useState } from "react";
import { Activity, Database, HardDrive, RefreshCcw, Server, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { getSystemInfo, type SystemInfoPayload } from "../../src/api/admin";

const formatBytes = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "N/A";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
};

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
};

const formatRate = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${formatBytes(value)}/s`;
};

export const SystemInfoPanel: React.FC = () => {
  const [info, setInfo] = useState<SystemInfoPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const payload = await getSystemInfo();
      setInfo(payload);
    } catch (err) {
      setInfo(null);
      setError(err instanceof Error ? err.message : "Failed to load system info");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        正在加载系统信息...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Server className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl">系统信息</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            当前产线与服务器运行状态概览
          </p>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadInfo}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            {isRefreshing ? "加载中..." : "刷新"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-destructive">
          {error}
        </div>
      )}

      {info && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                产线信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                产线数量: {info.line_names.length}
              </div>
              {info.line_names.length === 0 ? (
                <div className="text-xs text-muted-foreground">暂无产线配置</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {info.line_names.map((name) => (
                    <div
                      key={name}
                      className="rounded border border-border bg-muted/30 px-3 py-2"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                数据库情况
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">驱动</div>
                  <div className="font-mono">{info.database.drive}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">主库</div>
                  <div className="font-mono">
                    {info.database.host}
                    {info.database.port !== null ? `:${info.database.port}` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">业务库</div>
                  <div className="font-mono">{info.database.database_type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">管理库</div>
                  <div className="font-mono">{info.database.management_database}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">
                  主库状态:
                </div>
                <div className={info.database.main_status === "ok" ? "text-emerald-500" : "text-red-500"}>
                  {info.database.main_status}
                </div>
                {info.database.main_error && (
                  <div className="text-muted-foreground truncate">
                    {info.database.main_error}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">
                  管理库状态:
                </div>
                <div className={info.database.management_status === "ok" ? "text-emerald-500" : "text-red-500"}>
                  {info.database.management_status}
                </div>
                {info.database.management_error && (
                  <div className="text-muted-foreground truncate">
                    {info.database.management_error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4" />
                服务器参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">主机名</div>
                  <div className="font-mono">{info.server.hostname}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">系统名称</div>
                  <div className="font-mono">{info.server.os_name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">平台版本</div>
                  <div className="font-mono">{info.server.platform}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">系统版本</div>
                  <div className="font-mono">{info.server.platform_release}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">内核版本</div>
                  <div className="font-mono break-all">{info.server.platform_version}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">CPU 核心</div>
                  <div className="font-mono">{info.server.cpu_count}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">CPU 型号</div>
                  <div className="font-mono break-all">{info.server.cpu_model}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                运行环境
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <div className="text-muted-foreground">Python 版本</div>
                <div className="font-mono">{info.runtime.python_version}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Python 路径</div>
                <div className="font-mono break-all">{info.runtime.python_executable}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                硬件使用率
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-mono">{formatPercent(info.resources.cpu_percent)}</span>
                </div>
                <Progress value={info.resources.cpu_percent ?? 0} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">内存</span>
                  <span className="font-mono">
                    {formatPercent(info.resources.memory_percent)} (
                    {formatBytes(info.resources.memory_used_bytes)} / {formatBytes(info.resources.memory_total_bytes)})
                  </span>
                </div>
                <Progress value={info.resources.memory_percent ?? 0} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground">网络接收</div>
                  <div className="font-mono">{formatRate(info.resources.network_rx_bytes_per_sec)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">网络发送</div>
                  <div className="font-mono">{formatRate(info.resources.network_tx_bytes_per_sec)}</div>
                </div>
              </div>
              {info.resources.notes && info.resources.notes.length > 0 && (
                <div className="text-muted-foreground">
                  说明: {info.resources.notes.join(", ")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
