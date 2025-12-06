# 🔧 后端连接问题诊断指南

## 错误症状

```
Failed to fetch steels: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
❌ 加载钢板列表失败: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## 🎯 问题诊断

这个错误意味着：**后端返回了 HTML 页面而不是 JSON 数据**

这通常由以下原因造成：

### ❌ 原因 1：后端服务器没有运行（最常见）

**症状：**
- 浏览器 Network 标签显示 404 Not Found
- 访问 `http://localhost:8120/health` 无法打开

**解决方法：**
```bash
# 1. 启动后端服务器
cd <后端项目目录>
python run_server.bat

# 或者
python main.py

# 2. 验证后端运行成功
# 浏览器访问: http://localhost:8120/health
# 应该返回 JSON 数据，例如：
# {"status": "healthy", "timestamp": "...", "version": "1.0.0"}
```

---

### ❌ 原因 2：后端运行在错误的端口

**症状：**
- 后端正在运行，但不在 8120 端口
- 控制台显示类似 "Running on http://127.0.0.1:8000"

**解决方法：**

**方式 A：修改前端配置（推荐）**

编辑 `/vite.config.ts`：
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8000', // 改成实际端口
    changeOrigin: true,
    secure: false,
  },
  '/health': {
    target: 'http://localhost:8000', // 改成实际端口
    changeOrigin: true,
    secure: false,
  },
},
```

**方式 B：修改后端端口**

在后端项目中修改端口为 8120

---

### ❌ 原因 3：Vite 代理配置缺失或错误

**症状：**
- 后端运行正常
- 直接访问 `http://localhost:8120/api/steels?limit=5` 能正常返回 JSON
- 但前端请求失败

**解决方法：**

1. **检查 vite.config.ts 是否存在**
   ```bash
   ls vite.config.ts
   ```

2. **检查代理配置是否正确**
   ```typescript
   // vite.config.ts 应该包含：
   export default defineConfig({
     plugins: [react()],
     server: {
       port: 3000,
       open: true,
       proxy: {
         '/api': {
           target: 'http://localhost:8120',
           changeOrigin: true,
           secure: false,
         },
         '/health': {
           target: 'http://localhost:8120',
           changeOrigin: true,
           secure: false,
         },
       },
     },
   });
   ```

3. **重启 Vite 开发服务器**
   ```bash
   # 停止当前服务器 (Ctrl+C)
   # 重新启动
   npm run dev
   ```

---

### ❌ 原因 4：API 路径不匹配

**症状：**
- 后端运行正常
- 但 API 路径和前端请求的路径不一致

**检查方法：**

1. **前端请求的路径**
   - 打开浏览器开发者工具
   - Network 标签
   - 查看实际请求的 URL：`http://localhost:3000/api/steels?limit=50`

2. **后端实际的路径**
   - 查看后端代码或文档
   - 确认后端注册的路由是 `/api/steels` 还是其他路径

3. **如果路径不匹配，修改其中一方**

   **修改前端（在 /src/api/client.ts）：**
   ```typescript
   // 如果后端路径是 /steels 而不是 /ui/steels
   const url = `${baseUrl}/steels?limit=${limit}`;  // 去掉 /ui
   ```

---

## 🧪 快速诊断步骤

### 步骤 1：测试后端健康检查

```bash
# 方法 1：浏览器访问
http://localhost:8120/health

# 方法 2：命令行测试
curl http://localhost:8120/health

# 期望结果（JSON）：
{
  "status": "healthy",
  "timestamp": "2024-12-03T10:30:00.000Z",
  "version": "1.0.0"
}
```

**如果无法访问：**
→ 后端没有运行，请启动后端

**如果返回 404：**
→ 后端运行在不同端口或路径错误

---

### 步骤 2：测试钢板列表 API

```bash
# 直接访问后端
http://localhost:8120/api/steels?limit=5

# 或使用 curl
curl http://localhost:8120/api/steels?limit=5

# 期望结果（JSON）：
{
  "steels": [
    {
      "serial_number": "00000001",
      "plate_id": "SP240001",
      ...
    }
  ],
  "total": 20
}
```

**如果返回 404：**
→ API 路径错误，检查后端路由配置

**如果返回 HTML：**
→ 路径错误，后端返回了错误页面

---

### 步骤 3：测试 Vite 代理

```bash
# 1. 确保前端正在运行
npm run dev

# 2. 浏览器访问（通过 Vite 代理）
http://localhost:3000/api/steels?limit=5

# 3. 查看浏览器 Network 标签
# - 请求 URL: http://localhost:3000/api/steels?limit=5
# - 状态: 200 OK
# - 响应: JSON 数据
```

**如果返回 404 或 HTML：**
→ Vite 代理配置有问题，检查 vite.config.ts

---

## 📋 完整检查清单

### ✅ 后端检查

- [ ] 后端服务器正在运行
- [ ] 运行在正确的端口（8120）
- [ ] 健康检查返回 JSON：`http://localhost:8120/health`
- [ ] API 端点可访问：`http://localhost:8120/api/steels?limit=5`
- [ ] 后端控制台没有错误

### ✅ 前端检查

- [ ] Vite 开发服务器正在运行（端口 3000）
- [ ] `vite.config.ts` 文件存在
- [ ] 代理配置正确（target: 'http://localhost:8120'）
- [ ] 已重启 Vite 服务器
- [ ] 浏览器控制台的实际请求 URL 正确

### ✅ 网络检查

- [ ] 浏览器 Network 标签显示请求已发送
- [ ] 响应的 Content-Type 是 `application/json`
- [ ] 没有 CORS 错误
- [ ] 响应状态码是 200

---

## 🔄 标准工作流程

### 开发模式（无需后端）

```bash
# 1. 启动前端
npm run dev

# 2. 在应用中切换到「开发模式」
# → 系统设置 → API 模式 → 开发模式

# 3. 使用 Mock 数据进行开发
# ✅ 不需要启动后端
# ✅ 立即可用
```

### 生产模式（需要后端）

```bash
# 1. 启动后端
cd <后端目录>
python run_server.bat

# 2. 验证后端
# 浏览器访问: http://localhost:8120/health

# 3. 启动前端
cd <前端目录>
npm run dev

# 4. 在应用中切换到「生产模式」
# → 系统设置 → API 模式 → 生产模式

# 5. 确认数据加载
# ✅ 浏览器 Network 标签应显示请求
# ✅ 后端控制台应显示收到请求
```

---

## 🆘 仍然无法解决？

### 使用可视化测试工具

打开 `/test-api-connection.html`：

1. 点击"运行所有测试"
2. 查看哪些测试失败
3. 根据失败的测试定位问题

### 启用详细日志

浏览器控制台现在会显示：
```
🌐 [生产模式] 请求钢板列表: /api/steels?limit=50
✅ 成功加载 20 条钢板记录 (production 模式)
```

或错误时：
```
❌ 加载钢板列表失败: 后端返回了无效的响应（可能是 HTML 错误页面）

📋 请检查：
1. 后端是否正在运行？
   → 执行: python run_server.bat
   → 访问: http://localhost:8120/health
...
```

### 临时解决方案

**如果您现在需要继续开发：**

1. 切换回「开发模式」
2. 使用 Mock 数据进行开发
3. 稍后再配置生产模式连接

---

## 📞 获取帮助

如果以上方法都无法解决问题，请提供以下信息：

1. **后端状态**
   - 是否正在运行？
   - 运行在哪个端口？
   - 访问 `/health` 的结果？

2. **浏览器 Network 信息**
   - 请求的 URL
   - 响应状态码
   - 响应的 Content-Type
   - 响应内容的前几行

3. **配置文件**
   - `vite.config.ts` 的内容
   - 后端的端口配置

4. **控制台日志**
   - 前端浏览器控制台的完整错误
   - 后端控制台的输出

---

📅 更新时间：2024-12-03  
🔧 适用版本：前后端打通版本
