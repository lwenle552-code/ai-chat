# Vue3 DeepSeek & Gemini Chat 项目

这是一个基于 Vue3 和 Vite 构建的 AI 对话项目，支持 DeepSeek 和 Google Gemini 两种大语言模型。

## 项目简介

本项目是一个现代化的 AI 对话界面，具有以下特点：
- 支持 DeepSeek 和 Google Gemini 双模型切换
- 实现了虚拟滚动，优化大量消息的渲染性能
- 提供会话管理功能（新建、删除、重命名、清空）
- 响应式设计，适配移动端和桌面端
- 本地存储会话数据，保护用户隐私
- 支持 API 连接诊断功能

## 技术栈

- Vue 3 (Composition API)
- Vite
- Element Plus UI 组件库
- Sass 样式预处理器
- OpenAI SDK
- Markdown-It (代码高亮和渲染)

## 功能特性

### 1. 双模型支持
- **DeepSeek**: 支持 DeepSeek 大语言模型，可显示账户余额
- **Gemini**: 支持 Google Gemini 系列模型

### 2. 会话管理
- 新建对话会话
- 删除、重命名会话
- 清空会话内容
- 预设会话模板（如 CRUD 页面配置助手）
- 会话数据本地持久化存储

### 3. 消息交互
- 实时流式消息接收
- 虚拟滚动优化长消息列表性能
- Markdown 语法渲染
- 代码块高亮显示
- 响应式消息气泡设计

### 4. 其他功能
- API 连接诊断工具
- 移动端适配
- 主题样式定制

## 环境要求
- Node.js >= 16.0.0
- npm包管理器

## 安装依赖
```bash
 npm install
 ```

## 项目运行
```bash
npm run dev
```

## 配置 API 密钥
- 在 src/config/deepseek.js 中设置 DeepSeek API Key
- 在 src/config/gemini.js 中设置 Gemini API Key
