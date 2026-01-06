import { useEffect, useState } from "react";
import { Database, HardDrive, RefreshCcw, Server, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { getSystemInfo, type SystemInfoPayload } from "../../api/admin";
import { useSystemMetrics } from "../../hooks/useSystemMetrics";
import {
  SystemMetricsBlocks,
  DiskUsagePanel,
  NetworkStatusPanel,
  ServerResourcesPanel,
} from "../system/SystemMetricsBlocks";

export const SystemInfoPanel: React.FC = () => {
  const [info, setInfo] = useState<SystemInfoPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { metrics, history } = useSystemMetrics({ enabled: true });

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

  const resourceMetrics = metrics?.resources ?? info?.resources ?? null;
  const diskList = metrics?.disks ?? info?.disks ?? [];
  const networkInterfaces = metrics?.network_interfaces ?? info?.network_interfaces ?? [];

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        正在加载系统信息...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tighter uppercase">System Information</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              Live Health Status & Server Metrics
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadInfo}
            disabled={isRefreshing}
            className="h-8 text-[11px] font-bold"
          >
            <RefreshCcw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            REFRESH
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="p-4 mb-4 rounded-sm bg-destructive/10 border border-destructive/20 text-xs text-destructive font-mono uppercase">
            [ERROR]: {error}
          </div>
        )}

        {info && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
            <div className="lg:col-span-2">
              <ServerResourcesPanel
                resources={resourceMetrics}
                variant="chart"
                history={history}
              />
            </div>
            <NetworkStatusPanel interfaces={networkInterfaces} />
            <DiskUsagePanel disks={diskList} maxHeightClass="max-h-48" />
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Line Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Lines: {info.line_names.length}
                </div>
                {info.line_names.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No lines configured.</div>
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
                  Database Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground">Driver</div>
                    <div className="font-mono">{info.database.drive}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Main DB</div>
                    <div className="font-mono">
                      {info.database.host}
                      {info.database.port !== null ? `:${info.database.port}` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">App DB</div>
                    <div className="font-mono">{info.database.database_type}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Mgmt DB</div>
                    <div className="font-mono">{info.database.management_database}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-muted-foreground">Main Status</div>
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
                  <div className="text-muted-foreground">Mgmt Status</div>
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
                  Server Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground">Hostname</div>
                    <div className="font-mono">{info.server.hostname}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">OS</div>
                    <div className="font-mono">{info.server.os_name}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Platform</div>
                    <div className="font-mono">{info.server.platform}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Release</div>
                    <div className="font-mono">{info.server.platform_release}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Kernel</div>
                    <div className="font-mono break-all">{info.server.platform_version}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">CPU Cores</div>
                    <div className="font-mono">{info.server.cpu_count}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">CPU Model</div>
                    <div className="font-mono break-all">{info.server.cpu_model}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Runtime
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Python Version</div>
                  <div className="font-mono">{info.runtime.python_version}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Python Path</div>
                  <div className="font-mono break-all">{info.runtime.python_executable}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};