———

# Web Defect Detection – Figma Make Guidelines (v2)

本项目是“钢板缺陷检测系统”的前端，使用 **React + Vite**。后端是 FastAPI，提供 `/api` 下的接口。本指南告诉你如何生成代
码，才能和现有后端、类型定义、Mock 体系配合良好。

---
## 1. 项目架构与目录约定

- 入口与页面：
  - `App.tsx`：主页面布局（侧边栏 + 顶部工具栏 + 主内容区）。
  - `components/`：页面使用的 UI 组件（如 `UploadZone`, `DefectList`, `ModeSwitch`）。
- 核心逻辑与配置（不要改变整体结构，只在其中扩展）：
  - `src/api/types.ts`：**唯一**的 API 类型定义与映射函数。
  - `src/api/mock.ts`：开发模式下的 Mock 数据。
  - `src/api/client.ts`：统一的 API 客户端，只在这里写 `fetch`。
  - `src/config/env.ts`：环境模式管理（development / production）。

从 `App.tsx` 或组件中引用时，使用：

```ts
import { listSteels, getDefects, getFrameImage, healthCheck } from './src/api/client';
import { env } from './src/config/env';

———

## 2. 环境模式与 API 调用规则

- 模式：
    - env.isDevelopment() 为 开发模式：使用 mock.ts 中的函数，不访问真实后端。
    - env.isProduction() 为 生产模式：通过 env.getApiBaseUrl() 调用 FastAPI。
- 后端约定的主要接口（真实后端）：
    - GET /api/steels?limit=20
    - GET /api/defects/{seq_no}
    - GET /api/images/frame?surface=top&seq_no=123&image_index=0
    - GET /health

生成新 API 函数时：

1. 在 src/api/types.ts 中补充 Raw 类型 / 前端类型 / 映射函数（snake_case → camelCase）。
2. 在 src/api/mock.ts 中添加对应的 mockXxx 函数，返回与真实接口兼容的数据结构。
3. 在 src/api/client.ts 中添加：
    - if (env.isDevelopment()) 分支调用 mockXxx。
    - 生产分支使用：

      const baseUrl = env.getApiBaseUrl(); // 生产为 '/api'
      const res = await fetch(`${baseUrl}/your_endpoint?...`);

———

## 3. 类型与状态管理约定

- 只在 src/api/types.ts 中定义：
    - SteelItemRaw, SteelItem, SteelListResponse
    - DefectItemRaw, DefectItem, DefectResponse
    - Surface, Severity, 以及 mapSteelItem, mapDefectItem
- UI 组件中不要重新定义这些接口，直接导入：

  import type { SteelItem, DefectItem } from './src/api/types';
- 列表状态、当前选中钢板、缺陷详情等使用 useState + useEffect，通过 client.ts 提供的函数更新。

———

## 4. 生成 UI 代码时的要求

- 不要在组件内部直接写 fetch('/api/xxx')，统一通过 client.ts 的函数访问数据。
- 保持现有页面布局结构（侧边栏、顶部工具栏、底部状态栏），在主内容区内新增或调整模块：
    - 如 SteelTable, DefectHeatmap, SystemStatusPanel, ApiModeCard 等。
- 所有“开发/生产模式”相关 UI，应调用 env.getMode(), env.setMode()，并监听 app_mode_change 事件，而不是重新实现模式切换
  逻辑。
- 加载和错误状态：
    - 数据加载中：显示 skeleton 或 spinner。
    - API 出错：显示非阻塞的错误提示（toast / banner），并在控制台打印详细错误信息。

———

## 5. 可直接使用的子提示示例

- “在 src/api/client.ts 中新增 searchSteels 函数，支持按钢板号和时间区间查询，遵循现有 listSteels 的开发/生产模式切换
  和类型映射规则。”
- “在 App.tsx 中，将钢板列表从本地模拟数组改为调用 listSteels，并使用 SteelItem 类型；保留现有筛选 UI，只改数据源和状
  态管理。”
- “在系统诊断对话框中，使用 healthCheck() 显示当前模式、后端健康状态、数据库连接信息（如果有），并在开发模式下标记为
  Mock 数据。”
```