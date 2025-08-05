# 🚀 Vue3 AI对话框进阶篇：自定义AI输出规则与预设会话，让AI成为你的专业编程助手！

还记得我们上期介绍的那款颜值与实力并存的 Vue3 AI 对话框吗？今天我们来深入探索它的高级功能——**自定义AI输出规则**和**预设会话**！这些功能让AI不再是简单的聊天工具，而是真正的专业编程助手。

## 🎯 核心亮点

### ✨ 智能预设会话系统
- 🔧 **CRUD页面配置助手**：专业的前端工程师助手
- 🎨 **自然语言转代码**：用中文描述，生成专业Vue3配置
- ⭐ **预设会话标识**：星标标记，一目了然
- 🔒 **预设保护机制**：预设会话不可删除，确保稳定性

### 🛠️ 强大的代码导出功能
- 📥 **一键导出代码**：智能识别代码块，支持多种格式
- 🎯 **智能文件命名**：根据代码类型自动生成文件名
- 📋 **多代码块合并**：自动合并多个代码片段
- 🔍 **代码类型识别**：支持TypeScript、JavaScript、Vue等

## 🔥 功能详解

### 1. 自定义AI输出规则

项目通过 `src/config/prompts.js` 实现了强大的AI输出规则定制：

```javascript
// 专业前端工程师助手提示词
export const CRUD_SYSTEM_PROMPT = `你是一名专业的前端工程师助手，专门帮助开发者生成Vue3 + Search + Table的配置代码。

## 你的专业领域：
- Vue3 Composition API
- Search搜索组件  
- Table表格组件
- TypeScript类型定义
- 表格和表单配置生成

## 工作规则：
1. **代码生成**：根据字段描述自动生成searchParams和tableColumns配置
2. **类型推断**：根据字段名称和描述智能推断合适的组件类型
3. **最佳实践**：遵循Vue3和Search/Table的最佳实践
4. **代码规范**：生成的代码要有良好的可读性和维护性
5. **中文注释**：为生成的代码添加清晰的中文注释`;
```

**🎯 智能规则映射：**
- 文本类字段 → `SEARCH_PARAM_TYPE.INPUT`
- 选择类字段 → `SEARCH_PARAM_TYPE.SELECT`
- 日期类字段 → `SEARCH_PARAM_TYPE.DATE_PICKER`
- 数字类字段 → `SEARCH_PARAM_TYPE.INPUT_NUMBER`
- 布尔类字段 → `SEARCH_PARAM_TYPE.SWITCH`

### 2. 预设会话系统

**🌟 预设会话特性：**
```javascript
const PRESET_SESSIONS = [
  {
    title: "CRUD页面配置",
    crtTime: new Date(),
    messages: [
      {
        role: "assistant",
        content: `欢迎使用CRUD页面配置助手！🎉
        
我是专业的前端工程师助手，专门帮助您生成Vue3 + Search + Table的配置代码。`
      }
    ],
    isPreset: true // 预设会话标记
  }
];
```

**✨ 预设会话优势：**
- 🎨 **视觉区分**：星标图标 + 特殊样式
- 🔒 **保护机制**：不可删除、不可重命名
- 🚀 **即开即用**：无需配置，开箱即用
- 💡 **专业指导**：内置详细使用说明

### 3. 智能代码导出

**📥 导出功能特色：**
- 🎯 **智能识别**：自动识别代码块类型和语言
- 📁 **自动命名**：`generated-code-{timestamp}.{ext}`
- 🔄 **多块合并**：支持多个代码块合并导出
- 🛡️ **安全过滤**：仅在AI回复且包含代码时显示
- 📋 **格式支持**：TypeScript、JavaScript、Vue、HTML、CSS等

## 🎨 实际使用场景

### 场景一：用户管理页面

**输入描述：**
```
用户管理表格，包含以下字段：
- 用户ID（数字）
- 用户名（文本）
- 邮箱（文本）
- 状态（选择：启用/禁用）
- 注册时间（日期）
```

**AI自动生成：**
```typescript
import { SEARCH_PARAM_TYPE, SEARCH_PARAM } from "@/components/Search/SearchDefine";
import { TABLE_COLUMN } from "@/components/Table/TableDefine";

// 搜索参数配置
export const searchParams: SEARCH_PARAM[] = [
  {
    label: "用户名",
    prop: "username", 
    type: SEARCH_PARAM_TYPE.INPUT,
    placeholder: "请输入用户名"
  },
  {
    label: "邮箱",
    prop: "email",
    type: SEARCH_PARAM_TYPE.INPUT,
    placeholder: "请输入邮箱"
  },
  {
    label: "状态",
    prop: "status",
    type: SEARCH_PARAM_TYPE.SELECT,
    options: [
      { label: "启用", value: 1 },
      { label: "禁用", value: 0 }
    ]
  }
];

// 表格列配置
export const tableColumns: TABLE_COLUMN[] = [
  {
    type: "selection",
    width: 50
  },
  {
    type: "index", 
    label: "序号",
    width: 60
  },
  {
    prop: "userId",
    label: "用户ID",
    minWidth: 80
  },
  {
    prop: "username",
    label: "用户名", 
    minWidth: 120
  },
  {
    prop: "email",
    label: "邮箱",
    minWidth: 180
  },
  {
    prop: "status",
    label: "状态",
    minWidth: 80,
    formatter: (row) => row.status === 1 ? "启用" : "禁用"
  },
  {
    prop: "registerTime",
    label: "注册时间",
    minWidth: 160
  }
];
```

### 场景二：商品管理页面

**输入描述：**
```
商品管理页面配置：

搜索条件：
- 商品名称：文本输入框，支持模糊搜索
- 商品分类：下拉选择，来源字典表
- 价格范围：数字输入框，支持区间查询
- 上架状态：单选（上架/下架/草稿）
- 创建时间：日期范围选择器

表格列：
- 商品ID：数字，宽度80px
- 商品名称：文本，最小宽度120px
- 商品图片：图片显示，宽度100px
- 分类名称：文本，需要格式化显示
- 价格：数字，保留2位小数，右对齐
- 库存：数字，库存不足时红色显示
- 状态：状态标签，不同状态不同颜色
- 创建时间：日期时间格式
- 操作：编辑、删除、上架/下架按钮
```

**AI会生成完整的搜索和表格配置代码，包括：**
- 🔍 完整的搜索参数配置
- 📊 详细的表格列定义
- 🎨 自定义格式化函数
- 🔧 操作按钮配置
- 📝 清晰的中文注释

## 🛠️ 技术实现亮点

### 1. 模块化提示词管理
```javascript
// 提示词配置映射
export const PROMPT_CONFIG = {
  deepseek: {
    general: GENERAL_SYSTEM_PROMPT,
    crud: CRUD_SYSTEM_PROMPT
  },
  gemini: {
    general: GEMINI_GENERAL_PROMPT, 
    crud: GEMINI_CRUD_PROMPT
  }
};

// 动态获取系统提示词
export const getSystemPrompt = (model, sessionType = 'general') => {
  const modelKey = model === 'gemini-chat' ? 'gemini' : 'deepseek';
  return PROMPT_CONFIG[modelKey][sessionType] || PROMPT_CONFIG[modelKey].general;
};
```

### 2. 预设会话初始化机制
```javascript
const initSessionList = () => {
  const savedSessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessionList) || "[]");
  
  // 检查是否已有预设会话
  const hasPresetSession = savedSessions.some(session => session.isPreset);
  
  if (!hasPresetSession) {
    // 如果没有预设会话，添加到开头
    sessionList.value = [...PRESET_SESSIONS, ...savedSessions];
  } else {
    // 如果已有预设会话，保持原有顺序
    sessionList.value = savedSessions;
  }
};
```

### 3. 核心技术实现
```javascript
// 智能代码检测
const hasCodeContent = (content) => {
  if (!content) return false;
  return content.includes('```') || 
         content.includes('export const') || 
         content.includes('import ');
};

// 一键导出功能
const handleExportCode = (content, index) => {
  const codeBlocks = extractCodeBlocks(content);
  const fileExtension = getFileExtension(codeBlocks[0].language);
  const fileName = `generated-code-${Date.now()}${fileExtension}`;
  
  downloadFile(exportContent, fileName);
  ElMessage.success(`代码已导出为 ${fileName}`);
};
```

## 🎨 UI/UX 设计亮点

### 1. 预设会话视觉标识
```scss
.session-item-preset {
  background: rgba(254, 44, 85, 0.15);
  border: 1px solid rgba(254, 44, 85, 0.2);
  
  .preset-icon {
    font-size: 14px;
    animation: twinkle 2s infinite; // 星标闪烁动画
  }
}

@keyframes twinkle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}
```

### 2. 代码导出按钮设计
```scss
.export-actions {
  padding: 8px 12px 12px 12px;
  border-top: 1px solid #404040;
  background-color: rgba(255, 255, 255, 0.05);
  
  .el-button {
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
    }
  }
}
```

## 🚀 快速体验

### 1. 克隆项目
```bash
git clone https://github.com/cxz520299/vue3-deepseek-gemini.git
cd vue3-deepseek-gemini
```

### 2. 安装依赖
```bash
npm install
# 或者
pnpm install
```

### 3. 配置API Key
```javascript
// src/config/deepseek.js 或 src/config/gemini.js
export default {
  API_KEY: 'YOUR_API_KEY', // 替换为你的API Key
  // ... 其他配置
};
```

### 4. 启动项目
```bash
npm run dev
```

### 5. 体验预设会话
1. 打开应用后，左侧会看到带星标的"CRUD页面配置"会话
2. 点击进入，按照提示描述你的页面需求
3. AI会自动生成专业的Vue3配置代码
4. 点击"导出代码"按钮，一键下载生成的代码文件

## 🌟 在线体验

立即访问：[https://euzhi.com/](https://euzhi.com/) 在线体验完整功能！

## 🔮 未来规划

- 🎯 **更多预设模板**：React、Angular等框架支持
- 🔧 **自定义预设**：用户可创建个人专属预设会话
- 📊 **代码统计**：生成代码的统计分析
- 🎨 **主题定制**：更多UI主题选择
- 🔗 **插件系统**：支持第三方插件扩展

## 💡 总结

这款Vue3 AI对话框不仅仅是一个聊天工具，更是一个强大的编程助手平台。通过自定义AI输出规则和预设会话系统，它能够：

- 🎯 **精准理解需求**：通过专业提示词，AI能准确理解开发需求
- 🚀 **快速生成代码**：从自然语言描述到专业代码，一步到位
- 📥 **便捷导出功能**：智能识别代码块，支持多格式导出
- 🎨 **优雅用户体验**：预设会话标识、动画效果、响应式设计

如果这个项目对你有帮助，别忘了给个 ⭐ Star！让我们一起打造更强大的AI编程助手！

---

**项目地址：** [https://github.com/cxz520299/vue3-deepseek-gemini](https://github.com/cxz520299/vue3-deepseek-gemini)

**在线体验：** [https://euzhi.com/](https://euzhi.com/)

**技术栈：** Vue3 + DeepSeek + Gemini 2.0 + Element Plus + SCSS