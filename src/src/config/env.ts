/**
 * 环境配置
 * 用于切换开发模式（Mock数据）和生产模式（真实API）
 */

export type AppMode = 'development' | 'production';

// 从 localStorage 读取用户偏好，默认为开发模式
const getInitialMode = (): AppMode => {
  const stored = localStorage.getItem('app_mode');
  return (stored === 'production' || stored === 'development') ? stored : 'development';
};

class EnvironmentConfig {
  private mode: AppMode;

  constructor() {
    this.mode = getInitialMode();
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
    localStorage.setItem('app_mode', mode);
    // 触发自定义事件，让组件知道模式已变更
    window.dispatchEvent(new CustomEvent('app_mode_change', { detail: mode }));
  }

  /**
   * 是否为开发模式
   */
  isDevelopment(): boolean {
    return this.mode === 'development';
  }

  /**
   * 是否为生产模式
   */
  isProduction(): boolean {
    return this.mode === 'production';
  }

  /**
   * 获取 API 基础路径
   */
  getApiBaseUrl(): string {
    // 生产模式使用真实后端，开发模式返回空（使用 mock）
    return this.mode === 'production' ? '/api' : '';
  }
}

export const env = new EnvironmentConfig();
