# 钢板缺陷检测系统 - 文档中心

本目录包含项目的所有技术文档和指南。

## 📚 文档索引

### 核心指南
- **Guidelines.md** - 项目开发指南（v2）
  - 项目架构与目录约定
  - 环境模式与 API 调用规则
  - 类型与状态管理约定
  - UI 代码生成要求

- **QUICK_START.md** - 快速开始指南
  - 开发模式快速启动
  - 生产模式配置
  - 常见问题解决

### 重构文档
- **REFACTORING.md** - App.tsx 拆分重构文档
  - 新的文件结构
  - 已完成的拆分
  - 使用方式说明

- **REFACTORING_COMPLETE.md** - 拆分完成报告
  - 拆分成果对比
  - 使用方式详解
  - 效果对比

### 技术说明
- **TILE_SYSTEM_EXPLANATION.md** - 瓦片系统架构说明
  - 画布大小确定机制
  - 三层坐标系统
  - 瓦片创建逻辑
  - LOD 等级计算
  - 性能优化策略

- **SURFACE_BORDER_UPDATE.md** - 表面边框绘制优化
  - 移除上下表面间隙
  - 表面轮廓边框绘制
  - 缩放适配机制

- **SURFACE_FILTER_UPDATE.md** - 表面过滤器联动优化
  - 表面渲染控制
  - 动态坐标系调整
  - 瓦片过滤逻辑
  - 性能优化

### 集成指南
- **INTEGRATION_GUIDE.md** - 生产模式接口适配集成指南
  - 数据类型更新
  - 新组件创建
  - API 集成步骤
  - 测试清单

- **API_INTEGRATION_COMPLETE.md** - 前后端打通完成文档
  - API 接入方式
  - Vite 代理配置
  - 测试步骤
  - 常见问题排查

### 测试数据
- **TestData_README.md** - 测试数据说明
  - 数据来源
  - 采集方式
  - 复现命令

## 🎯 快速导航

### 我是前端开发者
1. 先阅读 **Guidelines.md** 了解项目规范
2. 查看 **QUICK_START.md** 快速启动项目
3. 参考 **REFACTORING_COMPLETE.md** 了解代码结构

### 我是后端开发者
1. 阅读 **Guidelines.md** 了解接口规范
2. 查看 **API_INTEGRATION_COMPLETE.md** 了解接口要求

### 我需要理解瓦片系统
1. 阅读 **TILE_SYSTEM_EXPLANATION.md** 了解核心架构
2. 查看 **SURFACE_BORDER_UPDATE.md** 和 **SURFACE_FILTER_UPDATE.md** 了解最新优化

### 我需要集成生产环境
1. 查看 **INTEGRATION_GUIDE.md** 获取详细步骤
2. 参考 **API_INTEGRATION_COMPLETE.md** 完成配置
3. 使用 **QUICK_START.md** 中的生产模式启动

## 📖 文档使用建议

1. **按顺序阅读**：从 Guidelines → QUICK_START → 具体技术文档
2. **善用搜索**：使用 Ctrl+F / Cmd+F 在文档中搜索关键词
3. **参考代码**：文档中的示例代码都可以直接使用
4. **保持同步**：文档更新时，检查相关代码是否需要调整

## 🔄 文档更新日志

- 2025-12-09: 将所有md文件移动到 /docs 目录
- 2024-12-03: 完成表面过滤器联动功能文档
- 2024-12-03: 完成瓦片系统架构文档
- 2024-12-03: 完成前后端打通文档

---

📝 *本文档中心持续更新中...*
