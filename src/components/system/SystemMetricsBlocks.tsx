import { ReactNode } from "react";
import { HardDrive, Gauge, LineChart, Network, ArrowDown, ArrowUp } from "lucide-react";
import { Area, AreaChart as RechartsAreaChart, XAxis, YAxis } from "recharts@2.15.2";
import { Progress } from "../ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { cn } from "../ui/utils";
import type { NetworkInterfaceMetrics, SystemDiskUsage, SystemMetricsPayload } from "../../api/admin";
import type { ResourceSample } from "../../hooks/useSystemMetrics";

export const formatBytes = (value: number | null) => {
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

export const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
};

export const formatRate = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${formatBytes(value)}/s`;
};

export const formatSpeed = (value: number | null) => {
  if (value === null || Number.isNaN(value) || value <= 0) return "N/A";
  return `${value} Mbps`;
};

const SectionHeader = ({ icon, title }: { icon: ReactNode; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    {icon}
    <h4 className="font-bold text-xs uppercase tracking-wide">{title}</h4>
  </div>
);

export const DiskUsagePanel = ({
  disks,
  maxHeightClass = "max-h-40",
}: {
  disks: SystemDiskUsage[] | undefined;
  maxHeightClass?: string;
}) => (
  <div className="bg-muted/30 border border-border/50 p-3">
    <SectionHeader
      icon={<HardDrive className="w-4 h-4 text-purple-400" />}
      title="Disk Usage"
    />
    <div className={cn("space-y-2 overflow-y-auto pr-1", maxHeightClass)}>
      {disks && disks.length > 0 ? (
        disks.map((disk) => (
          <div key={`${disk.device}-${disk.mountpoint}`} className="bg-background/50 border border-border/30 p-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="font-mono">
                {disk.device || disk.mountpoint}
              </div>
              <div className="text-muted-foreground">
                {formatBytes(disk.used_bytes)} / {formatBytes(disk.total_bytes)}
              </div>
            </div>
            <Progress value={disk.percent} className="mt-2 h-2" />
          </div>
        ))
      ) : (
        <div className="text-xs text-muted-foreground">No disks detected.</div>
      )}
    </div>
  </div>
);

export const ServerResourcesPanel = ({
  resources,
  variant = "summary",
  history = [],
}: {
  resources: SystemMetricsPayload["resources"] | null;
  variant?: "summary" | "chart";
  history?: ResourceSample[];
}) => {
  const headerIcon =
    variant === "chart" ? (
      <LineChart className="w-4 h-4 text-orange-400" />
    ) : (
      <Gauge className="w-4 h-4 text-orange-400" />
    );

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-muted/30 border border-border/50 p-3">
        <SectionHeader
          icon={
            variant === "chart" ? (
              <LineChart className="w-4 h-4 text-orange-400" />
            ) : (
              <Gauge className="w-4 h-4 text-orange-400" />
            )
          }
          title="CPU Resources"
        />
        {variant === "chart" ? (
          <div className="space-y-3">
            <ChartContainer
              config={{
                cpu: { label: "CPU", color: "hsl(var(--chart-1))" },
              }}
              className="h-40 w-full"
            >
              <RechartsAreaChart data={history}>
                <XAxis dataKey="timestamp" hide />
                <YAxis domain={[0, 100]} hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="var(--color-cpu)"
                  fill="var(--color-cpu)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RechartsAreaChart>
            </ChartContainer>
            <div className="bg-background/50 border border-border/30 p-2 text-xs">
              <div className="text-muted-foreground mb-1">CPU Usage</div>
              <div className="font-mono font-bold">
                {formatPercent(resources?.cpu_percent ?? null)}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">CPU Usage</span>
                <span className="font-mono font-bold">
                  {formatPercent(resources?.cpu_percent ?? null)}
                </span>
              </div>
              <Progress value={resources?.cpu_percent ?? 0} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/30 border border-border/50 p-3">
        <SectionHeader
          icon={
            variant === "chart" ? (
              <LineChart className="w-4 h-4 text-blue-400" />
            ) : (
              <Gauge className="w-4 h-4 text-blue-400" />
            )
          }
          title="Memory Resources"
        />
        {variant === "chart" ? (
          <div className="space-y-3">
            <ChartContainer
              config={{
                memory: { label: "Memory", color: "hsl(var(--chart-2))" },
              }}
              className="h-40 w-full"
            >
              <RechartsAreaChart data={history}>
                <XAxis dataKey="timestamp" hide />
                <YAxis domain={[0, 100]} hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="var(--color-memory)"
                  fill="var(--color-memory)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RechartsAreaChart>
            </ChartContainer>
            <div className="bg-background/50 border border-border/30 p-2 text-xs">
              <div className="text-muted-foreground mb-1">Memory Usage</div>
              <div className="font-mono font-bold">
                {formatPercent(resources?.memory_percent ?? null)}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Memory Usage</span>
                <span className="font-mono font-bold">
                  {formatPercent(resources?.memory_percent ?? null)}
                </span>
              </div>
              <Progress value={resources?.memory_percent ?? 0} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const NetworkStatusPanel = ({
  interfaces,
}: {
  interfaces: NetworkInterfaceMetrics[] | undefined;
}) => (
  <div className="bg-muted/30 border border-border/50 p-3">
    <SectionHeader
      icon={<Network className="w-4 h-4 text-green-400" />}
      title="Network Status"
    />
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 text-[10px] text-muted-foreground uppercase">
        <span>Name</span>
        <span>RX</span>
        <span>TX</span>
        <span>Max</span>
      </div>
      {interfaces && interfaces.length > 0 ? (
        interfaces.map((item) => (
          <div
            key={item.name}
            className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 bg-background/50 border border-border/30 p-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  item.is_up ? "bg-green-500" : "bg-muted-foreground",
                )}
              />
              <span className="font-mono">{item.name}</span>
            </div>
            <div className="font-mono flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-blue-400" />
              {formatRate(item.rx_bytes_per_sec)}
            </div>
            <div className="font-mono flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-purple-400" />
              {formatRate(item.tx_bytes_per_sec)}
            </div>
            <div className="font-mono">{formatSpeed(item.speed_mbps)}</div>
          </div>
        ))
      ) : (
        <div className="text-muted-foreground text-xs">No interfaces detected.</div>
      )}
    </div>
  </div>
);