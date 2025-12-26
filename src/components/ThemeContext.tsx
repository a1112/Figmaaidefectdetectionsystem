import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

export const themePresets: ThemePreset[] = [
  {
    id: "industrial-blue",
    name: "深蓝工业风",
    description: "经典工业界面，专业稳重",
    colors: {
      primary: "#3b82f6",
      accent: "#8b5cf6",
      background: "#0a0a0a",
      foreground: "#ffffff",
      muted: "#1a1a1a",
      border: "#2a2a2a",
    },
  },
  {
    id: "midnight-dark",
    name: "暗夜黑色",
    description: "纯黑背景，减少眼部疲劳",
    colors: {
      primary: "#60a5fa",
      accent: "#a78bfa",
      background: "#000000",
      foreground: "#e5e5e5",
      muted: "#0f0f0f",
      border: "#1f1f1f",
    },
  },
  {
    id: "cyber-purple",
    name: "赛博紫色",
    description: "未来科技感，赛博朋克风格",
    colors: {
      primary: "#a855f7",
      accent: "#ec4899",
      background: "#0d0a1f",
      foreground: "#f0e7ff",
      muted: "#1a1229",
      border: "#2d1f4a",
    },
  },
  {
    id: "military-green",
    name: "军事绿色",
    description: "军工级配色，坚固可靠",
    colors: {
      primary: "#22c55e",
      accent: "#84cc16",
      background: "#0a0f0a",
      foreground: "#e8ffe8",
      muted: "#121812",
      border: "#1f2e1f",
    },
  },
  {
    id: "alert-orange",
    name: "橙色警戒",
    description: "高对比度，适合监控场景",
    colors: {
      primary: "#f97316",
      accent: "#eab308",
      background: "#0f0a05",
      foreground: "#fff5e5",
      muted: "#1a1208",
      border: "#2e1f0f",
    },
  },
  {
    id: "arctic-blue",
    name: "极光蓝",
    description: "冷色调，清爽专注",
    colors: {
      primary: "#06b6d4",
      accent: "#0ea5e9",
      background: "#05111a",
      foreground: "#e0f7ff",
      muted: "#0a1929",
      border: "#1a2e3d",
    },
  },
  {
    id: "sunset-red",
    name: "日落橙红",
    description: "温暖色调，醒目提醒",
    colors: {
      primary: "#ef4444",
      accent: "#f59e0b",
      background: "#1a0a05",
      foreground: "#ffe5e5",
      muted: "#2a1208",
      border: "#3d1f0f",
    },
  },
  {
    id: "business-light",
    name: "浅色商务",
    description: "明亮简洁，适合办公环境",
    colors: {
      primary: "#2563eb",
      accent: "#7c3aed",
      background: "#ffffff",
      foreground: "#0a0a0a",
      muted: "#f5f5f5",
      border: "#e5e5e5",
    },
  },
  {
    id: "slate-gray",
    name: "石板灰",
    description: "中性灰调，平衡视觉",
    colors: {
      primary: "#64748b",
      accent: "#94a3b8",
      background: "#0f172a",
      foreground: "#f1f5f9",
      muted: "#1e293b",
      border: "#334155",
    },
  },
  {
    id: "ruby-red",
    name: "宝石红",
    description: "高贵典雅，适合展示场景",
    colors: {
      primary: "#dc2626",
      accent: "#f43f5e",
      background: "#1a0505",
      foreground: "#ffe5e5",
      muted: "#2a0a0a",
      border: "#3d1515",
    },
  },
  {
    id: "emerald-green",
    name: "翡翠绿",
    description: "自然清新，护眼舒适",
    colors: {
      primary: "#10b981",
      accent: "#34d399",
      background: "#051a0f",
      foreground: "#e5fff0",
      muted: "#0a2a1a",
      border: "#153d25",
    },
  },
  {
    id: "gold-luxury",
    name: "奢华金",
    description: "金色点缀，高端大气",
    colors: {
      primary: "#eab308",
      accent: "#fbbf24",
      background: "#1a1505",
      foreground: "#fffbe5",
      muted: "#2a2208",
      border: "#3d3310",
    },
  },
];

interface ThemeContextType {
  currentTheme: ThemePreset;
  applyTheme: (preset: ThemePreset) => void;
  applyThemeById: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

// 将颜色转换为RGB值
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0 0";
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(() => {
    // 从localStorage加载保存的主题
    const saved = localStorage.getItem("app_theme_preset");
    if (saved) {
      const preset = themePresets.find((p) => p.id === saved);
      if (preset) return preset;
    }
    return themePresets[0]; // 默认主题
  });

  const applyTheme = (preset: ThemePreset) => {
    setCurrentTheme(preset);
    localStorage.setItem("app_theme_preset", preset.id);

    // 应用CSS变量到根元素
    const root = document.documentElement;
    const colors = preset.colors;

    // 设置HSL颜色变量（Tailwind使用HSL格式）
    root.style.setProperty("--primary", hexToRgb(colors.primary));
    root.style.setProperty("--accent", hexToRgb(colors.accent));
    root.style.setProperty("--background", hexToRgb(colors.background));
    root.style.setProperty("--foreground", hexToRgb(colors.foreground));
    root.style.setProperty("--muted", hexToRgb(colors.muted));
    root.style.setProperty("--border", hexToRgb(colors.border));

    // 设置额外的变量供直接使用
    root.style.setProperty("--color-primary", colors.primary);
    root.style.setProperty("--color-accent", colors.accent);
    root.style.setProperty("--color-background", colors.background);
    root.style.setProperty("--color-foreground", colors.foreground);
    root.style.setProperty("--color-muted", colors.muted);
    root.style.setProperty("--color-border", colors.border);

    // 判断是浅色还是深色主题
    const bgBrightness = parseInt(colors.background.slice(1, 3), 16);
    if (bgBrightness > 128) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }

    console.log(`🎨 应用主题: ${preset.name}`);
  };

  const applyThemeById = (id: string) => {
    const preset = themePresets.find((p) => p.id === id);
    if (preset) {
      applyTheme(preset);
    }
  };

  // 初始化时应用主题
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, applyTheme, applyThemeById }}>
      {children}
    </ThemeContext.Provider>
  );
};
