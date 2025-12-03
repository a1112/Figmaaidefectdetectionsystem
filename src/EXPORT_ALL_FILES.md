# 完整文件导出 - 复制粘贴指南

如果您在本地项目中看不到文件，请按照以下步骤手动创建。

---

## 📋 使用说明

1. 在您的项目根目录创建对应的文件
2. 复制下面对应的代码到文件中
3. 保存并提交到 Git

---

## 文件 1: `src/config/env.ts`

```typescript
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
```

---

## 📝 快速命令

### 创建所有目录
```bash
mkdir -p src/config src/api components
```

### Git 添加
```bash
git add src/config/env.ts src/api/ components/ModeSwitch.tsx
git add *.md
git commit -m "feat: 添加开发/生产模式切换系统"
git push
```

---

## ⚠️ 重要提示

由于篇幅限制，我无法在一个文件中包含所有代码。

**推荐方案**：

### 方案 A: 逐个请求文件内容（推荐）
告诉我您需要哪个具体文件，我为您完整显示。例如：
- "显示 src/api/types.ts 的内容"
- "显示 components/ModeSwitch.tsx 的内容"

### 方案 B: 批量下载
如果 Figma Make 支持，使用其导出/下载功能。

### 方案 C: 从当前会话复制
在 Figma Make 界面中：
1. 点击左侧文件树
2. 选择文件查看内容
3. 复制到您的本地项目

---

## 📂 文件优先级

### ⭐ 最高优先级（核心功能）
1. `src/config/env.ts` ← 已显示在上面
2. `src/api/types.ts`
3. `src/api/client.ts`
4. `src/api/mock.ts`
5. `components/ModeSwitch.tsx`

### ⭐ 次要优先级（文档）
6. `README_DEV_PROD_MODE.md` - 总览
7. `BACKEND_QUICKSTART.md` - 后端指南
8. `QUICK_REFERENCE.md` - 快速参考

### ⭐ 可选优先级
9. 其他文档文件

---

## 🆘 需要帮助？

**请告诉我**：
1. 您具体需要哪个文件的内容？
2. 或者您想要我按优先级逐个显示所有文件？

**我会立即为您提供完整的文件内容！**
