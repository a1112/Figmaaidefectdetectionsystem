# 🚀 快速开始指南

## 方式 1：开发模式（无需后端，立即开始）⚡

```bash
# 1. 启动前端
npm run dev

# 2. 在应用中选择「开发模式」
# → 系统设置 → API 模式 → 开发模式

# 3. 开始开发！
# ✅ Mock 数据自动加载
# ✅ 所有功能立即可用
# ✅ 无需等待后端
```

**适合：**
- 🎨 前端 UI 开发
- 🧪 功能测试
- 📱 响应式设计调试
- 🚀 快速原型开发

---

## 方式 2：生产模式（连接真实后端）🔗

```bash
# 1. 启动后端
cd <后端目录>
python run_server.bat
# 后端将运行在 http://localhost:8120

# 2. 验证后端（在浏览器中打开）
http://localhost:8120/health
# 应该看到: {"status": "healthy", ...}

# 3. 启动前端
cd <前端目录>
npm run dev

# 4. 在应用中选择「生产模式」
# → 系统设置 → API 模式 → 生产模式

# 5. 开始使用真实数据！
# ✅ 连接到后端 API
# ✅ 使用数据库数据
# ✅ 测试完整流程
```

**适合：**
- 🔌 API 集成测试
- 📊 真实数据验证
- 🐛 后端联调
- 🚢 部署前测试

---

## 🆘 遇到问题？

### 问题：后端连接失败

**解决方案：**
```bash
# 1. 检查后端是否运行
# 浏览器访问: http://localhost:8120/health

# 2. 如果无法访问，启动后端
python run_server.bat

# 3. 重启前端（Ctrl+C 然后）
npm run dev

# 4. 点击应用中的"重试连接"按钮
```

---

### 问题：看到 SyntaxError: Unexpected token '<'

**这意味着后端没有运行！**

**快速解决：**
```bash
# 选项 A：启动后端
python run_server.bat

# 选项 B：切换到开发模式
# 在应用中点击「切换到开发模式」按钮
```

---

### 问题：端口被占用

**前端端口冲突（3000）：**
```bash
# 修改 vite.config.ts 中的端口
server: {
  port: 3001,  // 改成其他端口
  ...
}
```

**后端端口冲突（8120）：**
```bash
# 修改后端端口配置，然后更新 vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:8000',  // 改成新端口
    ...
  }
}
```

---

## 📖 更多帮助

- 📘 **完整诊断：** `/BACKEND_CONNECTION_GUIDE.md`
- 📗 **前后端打通：** `/前后端打通说明.md`
- 📙 **错误修复：** `/ERROR_FIX_SUMMARY.md`
- 🧪 **测试工具：** 打开 `/test-api-connection.html`

---

## 🎯 推荐流程（第一次使用）

### Step 1: 先用开发模式熟悉界面 ✅
```bash
npm run dev
# → 选择「开发模式」
# → 探索所有功能
```

### Step 2: 再配置生产模式连接 ✅
```bash
python run_server.bat  # 启动后端
# → 选择「生产模式」
# → 测试真实数据
```

### Step 3: 根据需要自由切换 ✅
```
开发 UI → 开发模式
测试 API → 生产模式
```

---

## ⚡ 一行命令启动

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
# 终端 1
python run_server.bat

# 终端 2
npm run dev
```

---

🎉 **就这么简单！** 开始您的开发之旅吧！
