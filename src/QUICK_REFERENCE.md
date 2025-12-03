# 快速参考卡片

## 🔀 模式切换

### UI 操作
```
主界面 → ⚙️设置 → API模式配置 → 点击「开发/生产」→ 刷新
```

### 代码操作
```typescript
import { env } from './src/config/env';

// 切换模式
env.setMode('production');  // 或 'development'
window.location.reload();

// 查看当前模式
console.log(env.getMode());
console.log(env.isDevelopment());
console.log(env.isProduction());
```

---

## 📞 API 调用

### 导入
```typescript
import { listSteels, getDefects, getFrameImage, healthCheck } from './src/api/client';
```

### 使用示例
```typescript
// 获取钢板列表
const steels = await listSteels(20);

// 获取缺陷
const defects = await getDefects(1001);

// 获取图像
const url = await getFrameImage('top', 1001, 0);

// 健康检查
const health = await healthCheck();
```

---

## 🏷️ 数据类型

### 钢板数据
```typescript
interface SteelItem {
  serialNumber: string;  // 流水号
  plateId: string;       // 钢板号
  steelGrade: string;    // 钢种
  dimensions: {          // 规格
    length: number;
    width: number;
    thickness: number;
  };
  timestamp: Date;
  level: 'A' | 'B' | 'C' | 'D';
  defectCount: number;
}
```

### 缺陷数据
```typescript
interface DefectItem {
  id: string;
  type: DefectType;      // '纵向裂纹' | '横向裂纹' | ...
  severity: 'low' | 'medium' | 'high';
  x: number;             // 百分比位置
  y: number;
  width: number;
  height: number;
  confidence: number;    // 0.0 - 1.0
  surface: 'top' | 'bottom';
  imageIndex: number;
}
```

---

## 🛠️ 添加新 API

### 1. 定义类型 (`src/api/types.ts`)
```typescript
export interface NewDataRaw {
  field_name: string;  // 后端格式
}

export interface NewData {
  fieldName: string;   // 前端格式
}

export function mapNewData(raw: NewDataRaw): NewData {
  return { fieldName: raw.field_name };
}
```

### 2. 添加 Mock (`src/api/mock.ts`)
```typescript
export async function mockGetNewData(): Promise<NewDataRaw> {
  await new Promise(r => setTimeout(r, 200));
  return { field_name: 'mock value' };
}
```

### 3. 添加客户端 (`src/api/client.ts`)
```typescript
export async function getNewData(): Promise<NewData> {
  if (env.isDevelopment()) {
    const raw = await mock.mockGetNewData();
    return mapNewData(raw);
  }
  
  const response = await fetch(`${env.getApiBaseUrl()}/new-endpoint`);
  const raw = await response.json();
  return mapNewData(raw);
}
```

### 4. 组件中使用
```typescript
import { getNewData } from './src/api/client';

const data = await getNewData();
```

---

## 🐛 调试技巧

### 检查当前模式
```javascript
// 控制台执行
localStorage.getItem('app_mode')
```

### 强制切换模式
```javascript
// 开发模式
localStorage.setItem('app_mode', 'development');
location.reload();

// 生产模式
localStorage.setItem('app_mode', 'production');
location.reload();
```

### 查看 API 状态
```typescript
import { getApiStatus } from './src/api/client';
console.log(getApiStatus());
```

### 网络请求检查
- **开发模式**：Network 中无 `/api/*` 请求（使用 Mock）
- **生产模式**：Network 中可见 `/api/*` 请求

---

## ⚠️ 常见错误

### 错误 1: 直接使用 fetch
```typescript
// ❌ 错误
const res = await fetch('/api/steels');

// ✅ 正确
import { listSteels } from './src/api/client';
const steels = await listSteels();
```

### 错误 2: 不处理异步错误
```typescript
// ❌ 错误
const steels = await listSteels();

// ✅ 正确
try {
  const steels = await listSteels();
} catch (error) {
  console.error('Failed to load:', error);
  // 显示错误提示
}
```

### 错误 3: 使用错误的数据格式
```typescript
// ❌ 错误 - 使用后端格式
defect.defect_type

// ✅ 正确 - 使用前端格式
defect.type
```

---

## 📋 后端接口清单

| 接口 | 方法 | 说明 |
|-----|------|-----|
| `/api/steels?limit=N` | GET | 钢板列表 |
| `/api/defects/{seq_no}` | GET | 缺陷列表 |
| `/api/images/frame?...` | GET | 缺陷图像 |
| `/health` | GET | 健康检查 |

---

## 🎯 一键命令

### 查看模式
```bash
# 浏览器控制台
localStorage.getItem('app_mode')
```

### 切换到开发
```bash
localStorage.setItem('app_mode','development'); location.reload()
```

### 切换到生产
```bash
localStorage.setItem('app_mode','production'); location.reload()
```

---

## 📞 问题排查流程

```
遇到问题
  ↓
是否是数据问题？
  ↓ 是
切换到开发模式
  ↓
问题还在？ → 前端问题
问题消失？ → 后端问题
```

---

**需要详细信息？**  
→ 查看 `API_INTEGRATION_GUIDE.md`  
→ 查看 `DEV_PROD_MODE_README.md`
