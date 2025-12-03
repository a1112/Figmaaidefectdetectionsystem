# Web Defect Detection – Figma Make Guidelines

Use these prompts when generating or updating React code so it connects cleanly to the FastAPI backend in `Web-Defect-Detection-System`.

---

## 1. 高层提示（复制到 Figma Make 主提示）

> 这是一个“钢板缺陷检测系统”的前端。请使用 React + Vite，保持单页应用结构。  
> 后端是 FastAPI，基础路径为 `/api`，示例接口：
>
> - `GET /api/steels?limit=20` 获取最近钢板列表（按 seqNo / steelNo 排序）；
> - `GET /api/defects/{seq_no}` 获取指定序列号的缺陷列表；
> - `GET /api/images/frame?surface=top&seq_no=123&image_index=0` 获取缺陷图像；
> - `GET /health` 用于健康检查。
>
> 要求：
>
> - 不再使用随机模拟数据；通过 `fetch` 访问上述接口并用 TypeScript 类型约束数据结构。
> - 将 API 调用封装在 `src/api/client.ts` 中，使用小写驼峰函数名：`listSteels`, `getDefects`, `getFrameImage`。
> - 组件和状态命名尽量贴近领域：`SteelList`, `DefectList`, `DetectionDashboard`, `SystemDiagnosticPanel`。
> - UI 结构保持当前布局（侧边栏 + 顶部工具栏 + 主内容区），只替换数据源和交互逻辑。

---

## 2. 数据与类型约定

- 在 `src/api/types.ts` 中定义接口名称：`SteelItem`, `DefectItem`, `DefectResponse`, `SteelListResponse`，字段名采用后端 JSON 的 snake_case 映射为前端 camelCase。
- 所有日期字段转换为 `Date` 或 ISO 字符串后再在组件中格式化显示。
- 缺陷相关枚举：`surface` 使用 `'top' | 'bottom'`，严重程度使用 `'low' | 'medium' | 'high'`。

---

## 3. 组件与文件结构提示

- 新增或更新组件时，遵循现有结构：
  - 页面级：`DetectionDashboard` 放在 `App.tsx` 中组合。
  - 模块级：放在 `src/components` 下，例如 `SteelTable.tsx`, `DefectHeatmap.tsx`, `SystemStatusBar.tsx`。
- 保持样式使用 Tailwind 工具类和现有 `index.css` 中的主题设置（dark 模式基于 `document.documentElement.classList`）。
- 不要修改 Vite 入口文件结构（`main.tsx` + `App.tsx`），只在 `App.tsx` 内扩展逻辑。

---

## 4. 交互与状态管理

- 使用 `useState` + `useEffect` 管理：当前选中钢板、缺陷列表、加载状态、错误状态。
- 加载数据时显示 skeleton / spinner；失败时使用显眼但不打断操作的错误提示。
- 在移动端优先保持现有交互模式（折叠侧边栏、底部导航），不要引入复杂新组件。

---

## 5. 示例子提示（按功能使用）

- “将钢板列表面板改为从 `/api/steels` 拉取真实数据，并保持现有筛选/排序交互。”
- “在缺陷详情面板中，为选中的序列号从 `/api/defects/{seq_no}` 加载数据并覆盖当前随机缺陷生成逻辑。”
- “在系统诊断对话框中调用 `/health`，展示 API 在线状态和响应时间，而不是静态文案。”