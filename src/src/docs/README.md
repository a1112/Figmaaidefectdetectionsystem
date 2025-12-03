# 开发/生产模式系统 - 完整文档索引

> 📌 **核心理念**：前后端并行开发，互不阻塞，一键切换数据源

---

## 🎯 这是什么？

一个让前端可以在后端未就绪时继续开发的系统架构。通过简单的模式切换，前端可以：

- **开发模式**：使用 Mock 数据进行 UI 开发和测试
- **生产模式**：连接真实的 FastAPI 后端

所有切换都在 UI 界面完成，**无需修改代码**。

---

## 📚 文档导航

### 🚀 快速开始
- **我是前端开发者** → 阅读 [`快速开始.md`](./快速开始.md)
- **我是后端开发者** → 阅读 [`后端快速入门.md`](./后端快速入门.md)
- **我需要快速查找** → 阅读 [`快速参考.md`](./快速参考.md)

### 📖 详细指南
- **完整的 API 集成指南** → [`API集成指南.md`](./API集成指南.md)
- **代码集成示例** → [`集成示例.md`](./集成示例.md)
- **后端接口规范** → `../../../guidelines/Guidelines.md`

### 💻 核心文件
- **环境配置** → `src/config/env.ts`
- **类型定义** → `src/api/types.ts`
- **Mock 数据** → `src/api/mock.ts`
- **API 客户端** → `src/api/client.ts`
- **UI 组件** → `components/ModeSwitch.tsx`

---

## 🏗️ 系统架构

```
┌──────────────────────────────────────────────┐
│           React 前端应用                      │
│  ┌────────────────────────────────────┐     │
│  │       UI 组件层                     │     │
│  │  (App.tsx, 各种组件)                │     │
│  └────────────┬───────────────────────┘     │
│               ↓                              │
│  ┌────────────────────────────────────┐     │
│  │      API 客户端层                   │     │
│  │     (src/api/client.ts)             │     │
│  │                                     │     │
│  │  [自动路由] 根据环境配置选择：       │     │
│  └──────┬──────────────────┬───────────┘     │
│         ↓                  ↓                 │
│  ┌─────────────┐    ┌──────────────┐       │
│  │  Mock 数据   │    │  真实 API    │       │
│  │(开发模式)    │    │ (生产模式)   │       │
│  └─────────────┘    └──────┬───────┘       │
└──────────────────────────────┼──────────────┘
                               ↓
                    ┌─────────────────────┐
                    │   FastAPI 后端       │
                    │   + 数据库           │
                    └─────────────────────┘
```

---

## ✨ 核心特性

### 1. 环境自动切换
```typescript
// 环境配置自动管理
import { env } from '../config/env';

env.getMode();           // 'development' | 'production'
env.isDevelopment();     // true/false
env.isProduction();      // true/false
env.getApiBaseUrl();     // '/api' 或 ''
```

### 2. 统一的 API 调用
```typescript
// 所有 API 调用都通过 client.ts
import { listSteels, getDefects } from '../api/client';

// 开发模式：自动使用 Mock 数据
// 生产模式：自动调用真实 API
const steels = await listSteels(20);
const defects = await getDefects(1001);
```

### 3. 类型安全
```typescript
// 完整的 TypeScript 类型支持
import type { SteelItem, DefectItem } from '../api/types';

// 自动转换 snake_case ↔ camelCase
const steel: SteelItem = {
  serialNumber: '00001001',  // 前端格式
  plateId: 'SP001001',
  // ...
};
```

### 4. UI 一键切换
```
主界面 → ⚙️ 设置 → API模式配置 → 选择模式 → 刷新
```

---

## 📋 功能清单

### ✅ 已实现

- [x] 环境配置系统 (`src/config/env.ts`)
- [x] TypeScript 类型定义 (`src/api/types.ts`)
- [x] Mock 数据生成器 (`src/api/mock.ts`)
- [x] API 客户端封装 (`src/api/client.ts`)
- [x] UI 切换组件 (`components/ModeSwitch.tsx`)
- [x] 集成到系统设置界面
- [x] 数据格式自动转换 (snake_case ↔ camelCase)
- [x] 完整的文档和示例

### 🔜 待实现（可选）

- [ ] 在现有组件中替换 Mock 数据为 API 调用
- [ ] 添加请求缓存机制
- [ ] 添加请求重试逻辑
- [ ] 添加离线模式支持
- [ ] 性能监控和日志

---

## 🚀 快速上手

### 前端开发者

#### 1. 查看当前模式
打开应用 → 点击右上角 ⚙️ 设置 → 查看「API 模式配置」

#### 2. 在代码中使用 API
```typescript
import { listSteels, getDefects, getFrameImage } from '../api/client';

// 使用示例
async function loadData() {
  try {
    const steels = await listSteels(20);
    console.log('钢板列表:', steels);
  } catch (error) {
    console.error('加载失败:', error);
  }
}
```

#### 3. 切换模式测试
1. **开发模式**：验证 UI 和交互
2. **切换到生产模式**：测试真实数据对接
3. **发现问题**：切回开发模式继续开发

### 后端开发者

#### 1. 了解接口规范
阅读 [`后端快速入门.md`](./后端快速入门.md)

#### 2. 实现 4 个接口
- `GET /api/steels?limit=N`
- `GET /api/defects/{seq_no}`
- `GET /api/images/frame?surface=...&seq_no=...&image_index=...`
- `GET /health`

#### 3. 验证对接
1. 启动后端服务
2. 通知前端切换到生产模式
3. 一起测试数据流

---

## 📊 开发流程

### 阶段 1: 前端独立开发（当前）
```
状态: 后端还未就绪
模式: 开发模式 (Mock 数据)
工作: 完成 UI、交互、状态管理
```

### 阶段 2: 后端 API 开发
```
状态: 前后端并行开发
前端: 继续使用开发模式完善功能
后端: 实现 API 接口
```

### 阶段 3: 前后端联调
```
状态: API 已完成
模式: 切换到生产模式
工作: 测试真实数据流，修复问题
```

### 阶段 4: 集成测试
```
状态: 基本功能正常
工作: 两种模式都测试，确保兼容
      添加错误处理和边界情况
```

### 阶段 5: 生产部署
```
状态: 准备上线
模式: 默认生产模式
备用: 可通过设置切回开发模式调试
```

---

## 🔧 实用技巧

### 快速切换模式（开发者工具）
```javascript
// 浏览器控制台快速命令

// 切换到开发模式
localStorage.setItem('app_mode','development'); location.reload()

// 切换到生产模式
localStorage.setItem('app_mode','production'); location.reload()

// 查看当前模式
localStorage.getItem('app_mode')
```

### 调试 API 调用
```typescript
import { getApiStatus } from '../api/client';

// 查看当前 API 状态
console.log(getApiStatus());
// { 
//   mode: 'development',
//   description: '开发模式 - 使用模拟数据',
//   baseUrl: 'Mock Data'
// }
```

### 检查网络请求
- **开发模式**：Network 面板中不会有 `/api/*` 请求
- **生产模式**：可以看到真实的 HTTP 请求

---

## ⚠️ 注意事项

### ❌ 不要做的事

1. **不要直接使用 fetch**
   ```typescript
   // ❌ 错误
   const res = await fetch('/api/steels');
   
   // ✅ 正确
   const steels = await listSteels();
   ```

2. **不要硬编码 Mock 数据**
   ```typescript
   // ❌ 错误
   const mockData = [{ id: 1, name: '...' }];
   
   // ✅ 正确
   const data = await listSteels();
   ```

3. **不要忘记错误处理**
   ```typescript
   // ❌ 错误
   const data = await listSteels();
   
   // ✅ 正确
   try {
     const data = await listSteels();
   } catch (error) {
     // 处理错误
   }
   ```

### ✅ 推荐做法

1. **始终通过 `client.ts` 调用 API**
2. **添加加载状态和错误处理**
3. **两种模式都要测试**
4. **保持数据格式一致（使用 TypeScript 类型）**

---

## 🎓 学习路径

### 第 1 天：了解概念
- [ ] 阅读 `快速开始.md`
- [ ] 理解为什么需要两种模式
- [ ] 在 UI 中尝试切换模式

### 第 2 天：查看代码
- [ ] 阅读 `src/config/env.ts`
- [ ] 阅读 `src/api/types.ts`
- [ ] 阅读 `src/api/client.ts`

### 第 3 天：实践集成
- [ ] 阅读 `集成示例.md`
- [ ] 选择一个简单的功能开始改造
- [ ] 测试开发和生产模式

### 第 4 天：完整集成
- [ ] 改造所有数据获取逻辑
- [ ] 添加错误处理
- [ ] 完整测试

---

## 📞 常见问题

### Q: 我应该用哪种模式？
**A**: 
- 开发 UI 时 → 开发模式
- 测试后端对接时 → 生产模式
- 演示功能时 → 开发模式（数据更完整）

### Q: 如何知道 API 调用成功了？
**A**: 
1. 打开浏览器开发者工具
2. 查看 Console 面板（错误会显示在这里）
3. 查看 Network 面板（生产模式下可见请求）

### Q: Mock 数据和真实数据格式不一样怎么办？
**A**: 
1. 检查 `src/api/types.ts` 的类型定义
2. 确保 Mock 数据符合类型定义
3. 确保后端返回的数据符合类型定义
4. 使用映射函数转换格式

### Q: 切换模式后为什么要刷新页面？
**A**: 
因为很多组件在初始化时就决定了数据源。刷新页面可以确保所有组件使用新的模式。

---

## 🎉 总结

这套系统让你可以：

✅ **前后端并行开发** - 互不等待  
✅ **快速切换数据源** - 一键操作  
✅ **类型安全** - TypeScript 全程保护  
✅ **易于调试** - 清晰的错误提示  
✅ **易于维护** - 统一的 API 调用方式  

---

**开始使用吧！有问题随时查阅文档。** 🚀

*最后更新: 2024-12-03*
