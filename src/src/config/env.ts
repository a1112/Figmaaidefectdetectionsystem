/**
 * 环境配置
 * 用于切换开发模式（Mock数据）和生产模式（真实API）
 */

export type AppMode = "development" | "production" | "cors";
export type ApiProfile = "default" | "small";
const LINE_COOKIE = "line_name";

// 从 localStorage 读取用户偏好，默认为开发模式
const getInitialMode = (): AppMode => {
  const stored = localStorage.getItem("app_mode") as AppMode;
  return ["development", "production", "cors"].includes(stored)
    ? stored
    : "development";
};

// 从 localStorage 读取 API Profile（标准 / small），默认为 default
const getInitialApiProfile = (): ApiProfile => {
  const stored = localStorage.getItem("api_profile");
  return stored === "small" ? "small" : "default";
};

const getCookieValue = (name: string): string | null => {
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const [rawKey, ...rest] = cookie.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
};

const setCookieValue = (name: string, value: string, days: number = 30): void => {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const getInitialLineName = (): string => {
  return getCookieValue(LINE_COOKIE) || "";
};

class EnvironmentConfig {
  private mode: AppMode;
  private apiProfile: ApiProfile;
  private lineName: string;

  constructor() {
    this.mode = getInitialMode();
    this.apiProfile = getInitialApiProfile();
    this.lineName = getInitialLineName();
  }

  /**
   * 获取当前模式
   */
  getMode(): AppMode {
    return this.mode;
  }

  /**
   * 设置模式并持久化
   */
  setMode(mode: AppMode): void {
    this.mode = mode;
    localStorage.setItem("app_mode", mode);
    // 触发自定义事件，让组件知道模式已变更
    window.dispatchEvent(
      new CustomEvent("app_mode_change", { detail: mode }),
    );
  }

  /**
   * 获取当前 API Profile（标准 / small 实例）
   */
  getApiProfile(): ApiProfile {
    return this.apiProfile;
  }

  /**
   * 设置 API Profile（切换 standard / small 实例）
   */
  setApiProfile(profile: ApiProfile): void {
    this.apiProfile = profile;
    localStorage.setItem("api_profile", profile);
    window.dispatchEvent(
      new CustomEvent("api_profile_change", {
        detail: profile,
      }),
    );
  }

  getLineName(): string {
    return this.lineName;
  }

  setLineName(name: string): void {
    this.lineName = name;
    if (name) {
      setCookieValue(LINE_COOKIE, name);
    }
    window.dispatchEvent(
      new CustomEvent("line_change", {
        detail: name,
      }),
    );
  }

  /**
   * 是否为开发模式
   */
  isDevelopment(): boolean {
    return this.mode === "development";
  }

  /**
   * 是否为生产模式 (连接真实后端，包括本地生产和跨域模式)
   */
  isProduction(): boolean {
    return this.mode === "production" || this.mode === "cors";
  }

  /**
   * 获取 API 基础路径
   */
  getApiBaseUrl(): string {
    // 开发模式使用 mock
    if (this.mode === "development") {
      return "";
    }

    // 跨域模式：使用指定远程地址
    if (this.mode === "cors") {
      return "https://111.230.72.96:8230/api";
    }

    // 生产模式：根据产线与 apiProfile 选择标准实例或 small 实例
    const suffix = this.apiProfile === "small" ? "/small-api" : "/api";
    if (this.lineName) {
      return `/${encodeURIComponent(this.lineName)}${suffix}`;
    }
    return suffix;
  }
}

export const env = new EnvironmentConfig();
