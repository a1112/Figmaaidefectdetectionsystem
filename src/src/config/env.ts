/**
 * 环境配置
 * 用于切换开发模式（Mock数据）和生产模式（真实API）
 */

export type AppMode = "development" | "production";
export type ApiProfile = "default" | "small";

// 从 localStorage 读取用户偏好，默认为开发模式
const getInitialMode = (): AppMode => {
  const stored = localStorage.getItem("app_mode");
  return stored === "production" || stored === "development"
    ? stored
    : "development";
};

// 从 localStorage 读取 API Profile（标准 / small），默认为 default
const getInitialApiProfile = (): ApiProfile => {
  const stored = localStorage.getItem("api_profile");
  return stored === "small" ? "small" : "default";
};

class EnvironmentConfig {
  private mode: AppMode;
  private apiProfile: ApiProfile;

  constructor() {
    this.mode = getInitialMode();
    this.apiProfile = getInitialApiProfile();
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

  /**
   * 是否为开发模式
   */
  isDevelopment(): boolean {
    return this.mode === "development";
  }

  /**
   * 是否为生产模式
   */
  isProduction(): boolean {
    return this.mode === "production";
  }

  /**
   * 获取 API 基础路径
   */
  getApiBaseUrl(): string {
    // 开发模式使用 mock
    if (this.mode !== "production") {
      return "";
    }

    // 生产模式：根据 apiProfile 选择标准实例或 small 实例
    return this.apiProfile === "small" ? "/small-api" : "/api";
  }
}

export const env = new EnvironmentConfig();