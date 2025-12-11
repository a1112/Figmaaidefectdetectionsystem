// 应用核心类型定义

import type {
  DefectType,
  Severity,
  Surface,
} from "../src/api/types";

export interface Defect {
  id: string;
  type: DefectType;
  severity: Severity;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  surface: Surface; // 钢板表面：上表面或下表面
  imageIndex?: number; // 图像索引（从 API 获取，用于分布图定位）
}

export interface DetectionRecord {
  id: string;
  defectImageUrl: string; // 缺陷图像（单个缺陷特写）
  fullImageUrl: string; // 完整钢板图像
  timestamp: Date;
  defects: Defect[];
  status: "pass" | "warning" | "fail";
}

export interface SteelPlate {
  serialNumber: string; // 流水号
  plateId: string; // 8位钢板号
  steelGrade: string; // 5位钢种
  dimensions: {
    length: number;
    width: number;
    thickness: number;
  }; // 规格（长×宽×厚，单位：mm）
  timestamp: Date;
  level: "A" | "B" | "C" | "D"; // 质量级别
  defectCount: number; // 缺陷数量
}

export type ActiveTab =
  | "defects"
  | "images"
  | "plates"
  | "reports"
  | "settings"
  | "mockdata";
export type SurfaceFilter = "all" | "top" | "bottom";
export type DefectLogView = "list" | "chart";
export type ImageViewMode = "full" | "single";
export type ImageOrientation = "horizontal" | "vertical";
export type Theme = "light" | "dark";
export type ManualConfirmStatus =
  | "unprocessed"
  | "ignore"
  | "A"
  | "B"
  | "C"
  | "D"
  | null;
