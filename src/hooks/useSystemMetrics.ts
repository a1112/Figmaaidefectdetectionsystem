import { useEffect, useMemo, useState } from "react";
import { env } from "../config/env";
import {
  getSystemMetricsWsUrl,
  getSystemInfo,
  type SystemMetricsPayload,
} from "../api/admin";

export type ResourceSample = {
  timestamp: string;
  cpu: number | null;
  memory: number | null;
};

type UseSystemMetricsOptions = {
  enabled?: boolean;
  historySize?: number;
  mockIntervalMs?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const buildSample = (payload: SystemMetricsPayload): ResourceSample => ({
  timestamp: payload.timestamp,
  cpu: payload.resources.cpu_percent,
  memory: payload.resources.memory_percent,
});

const createMockPayload = (prev?: SystemMetricsPayload): SystemMetricsPayload => {
  const cpu = clamp(
    (prev?.resources.cpu_percent ?? 30) + (Math.random() - 0.5) * 8,
    15,
    85,
  );
  const memory = clamp(
    (prev?.resources.memory_percent ?? 60) + (Math.random() - 0.5) * 4,
    35,
    90,
  );
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    resources: {
      cpu_percent: cpu,
      memory_percent: memory,
      memory_total_bytes: 16 * 1024 * 1024 * 1024,
      memory_used_bytes: Math.round((memory / 100) * 16 * 1024 * 1024 * 1024),
      network_rx_bytes_per_sec: 2.2 * 1024 * 1024,
      network_tx_bytes_per_sec: 1.7 * 1024 * 1024,
      notes: [],
    },
    disks: [
      {
        device: "C:",
        mountpoint: "C:\\",
        fstype: "NTFS",
        total_bytes: 512 * 1024 * 1024 * 1024,
        used_bytes: 245 * 1024 * 1024 * 1024,
        free_bytes: 267 * 1024 * 1024 * 1024,
        percent: 47.8,
      },
      {
        device: "D:",
        mountpoint: "D:\\",
        fstype: "NTFS",
        total_bytes: 1024 * 1024 * 1024 * 1024,
        used_bytes: 560 * 1024 * 1024 * 1024,
        free_bytes: 464 * 1024 * 1024 * 1024,
        percent: 54.7,
      },
    ],
    network_interfaces: [
      {
        name: "Ethernet",
        is_up: true,
        speed_mbps: 1000,
        rx_bytes_per_sec: 2.2 * 1024 * 1024,
        tx_bytes_per_sec: 1.7 * 1024 * 1024,
      },
      {
        name: "Wi-Fi",
        is_up: false,
        speed_mbps: 300,
        rx_bytes_per_sec: 0,
        tx_bytes_per_sec: 0,
      },
    ],
  };
};

export const useSystemMetrics = (options: UseSystemMetricsOptions = {}) => {
  const { enabled = true, historySize = 60, mockIntervalMs = 1200 } = options;
  const [metrics, setMetrics] = useState<SystemMetricsPayload | null>(null);
  const [history, setHistory] = useState<ResourceSample[]>([]);

  const pushHistory = (payload: SystemMetricsPayload) => {
    const sample = buildSample(payload);
    setHistory((prev) => [...prev, sample].slice(-historySize));
  };

  const isLive = useMemo(() => enabled && !env.isDevelopment(), [enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (!isLive) {
      let active = true;
      let current = createMockPayload(metrics ?? undefined);
      setMetrics(current);
      pushHistory(current);

      const timer = window.setInterval(() => {
        if (!active) return;
        current = createMockPayload(current);
        setMetrics(current);
        pushHistory(current);
      }, mockIntervalMs);

      return () => {
        active = false;
        window.clearInterval(timer);
      };
    }

    const ws = new WebSocket(getSystemMetricsWsUrl());
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SystemMetricsPayload;
        setMetrics(payload);
        pushHistory(payload);
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      ws.close();
    };
  }, [enabled, isLive, mockIntervalMs, historySize]);

  return { metrics, history };
};