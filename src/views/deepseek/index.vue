<template>
  <div class="inner-html-container">
    <div class="page">
      <div class="tips">
        <div class="title">{{ queryInfos.model }}</div>
        <div class="desc" v-if="!isMobile">
          本网站采用本地缓存模式运行，不会留存任何涉及您个人的信息数据，请放心使用。
        </div>
        <div @click="handleClearStorage" v-else class="pointer">清空</div>
      </div>
      <div class="grid-space-between" :class="!isMobile ? 'grid-box' : ''">
        <div class="left-container" v-if="!isMobile">
          <el-button
            type="primary"
            class="add-btn"
            :icon="Plus"
            size="large"
            @click="handleAddSession"
            >新建对话</el-button
          >
          <div class="session-area">
            <div
              class="session-item"
              :class="[
                activeIndex == index ? 'session-item-active' : '',
                item.isPreset ? 'session-item-preset' : '',
              ]"
              v-for="(item, index) in sessionList"
              :key="index"
              @click="handleChangeSessionIndex(index)"
            >
              <div class="session-title">
                <!-- 预设会话标识 -->
                <el-icon
                  v-if="item.isPreset"
                  class="preset-icon"
                  color="#fe2c55"
                >
                  <Star />
                </el-icon>
                <span
                  :class="activeIndex == index ? 'active-node' : 'normal-node'"
                  v-if="editIndex != index"
                  >{{ item.title }}</span
                >
                <el-input
                  :ref="`renameRef_${index}`"
                  autofocus
                  v-model="item.title"
                  v-else-if="!item.isPreset"
                  size="small"
                  style="width: 120px"
                  @blur="editIndex = -1"
                  @change="editIndex = -1"
                />
                <!-- 预设会话不允许重命名 -->
                <span
                  v-else
                  :class="activeIndex == index ? 'active-node' : 'normal-node'"
                  >{{ item.title }}</span
                >
              </div>
              <div class="icon-box">
                <el-icon
                  class="icon"
                  color="#fff"
                  @click.stop="handleClearSession(index)"
                >
                  <Brush />
                </el-icon>
                <!-- 预设会话不显示编辑和删除按钮 -->
                <el-icon
                  v-if="!item.isPreset"
                  class="icon"
                  color="#fff"
                  @click.stop="handleFocusInput(index)"
                >
                  <EditPen />
                </el-icon>
                <el-icon
                  v-if="!item.isPreset"
                  class="icon"
                  color="#fff"
                  @click.stop="handleDeleteSession(index)"
                >
                  <Delete />
                </el-icon>
              </div>
            </div>
          </div>
        </div>
        <div class="container">
          <div class="message-area">
            <MessageComp
              ref="messageRef"
              :message="queryInfos.messages"
              :loading="loading"
            ></MessageComp>
          </div>
          <div class="user-tokens" :class="isMobile ? 'left-space' : ''">
            <span v-if="queryInfos.model == 'deepseek-chat'">
              当前余额为：￥{{ totalAmt || 0 }}
            </span>
            <span v-else>免费</span>
          </div>
          <div class="input-area" :class="isMobile ? 'left-space' : ''">
            <el-input
              v-model="queryKeys"
              id="keyInput"
              placeholder="请输入内容"
              show-word-limit
              @keydown.enter="
                (e) => {
                  if (e.isComposing || loading) return;
                  handleRequest();
                }
              "
            />
            <div class="button-group">
              <el-select
                v-model="queryInfos.model"
                class="model-select"
                @change="handleModelChange"
                :disabled="queryInfos.messages.length > 0"
                :title="
                  queryInfos.messages.length > 0
                    ? '有聊天记录时无法切换模型'
                    : ''
                "
              >
                <el-option label="DeepSeek" value="deepseek-chat" />
                <el-option label="Gemini" value="gemini-chat" />
              </el-select>
              <el-button
                v-if="queryInfos.model === 'gemini-chat'"
                style="height: 40px"
                type="warning"
                @click="handleDiagnoseGemini"
                :loading="diagnosing"
                title="诊断Gemini API连接"
              >
                <el-icon>
                  <Tools />
                </el-icon>
              </el-button>
              <el-button
                style="height: 40px"
                type="primary"
                @click="handleRequest"
                :disabled="!queryKeys"
                :loading="loading"
              >
                <el-icon>
                  <Promotion />
                </el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import OpenAI from "openai";
import MessageComp from "./components/messageComp.vue";
import { Promotion, Delete, EditPen, Brush, Plus, Tools, Star } from "@element-plus/icons-vue";
import { getTokens } from "@/api/modules/deepseek.js";
import { ElMessage, ElMessageBox } from "element-plus";
import MobileDetect from "mobile-detect";
import { API_CONFIG as DEEPSEEK_CONFIG, MODEL_CONFIG, STORAGE_KEYS } from '@/config/deepseek';
import { API_CONFIG as GEMINI_CONFIG, MODEL_CONFIG as GEMINI_MODEL_CONFIG } from '@/config/gemini';
import { validateGeminiConfig, testGeminiConnection, formatGeminiMessages, parseGeminiError } from '@/utils/geminiHelper';
// 导入提示词配置
import { getSystemPrompt } from '@/config/prompts';

// 响应式数据
const isMobile = ref(false);
const sessionList = ref([]);
const activeIndex = ref(-1);
const editIndex = ref(-1);
const totalAmt = ref(0);
const queryKeys = ref("");
const openai = ref(null);
const loading = ref(false);
const diagnosing = ref(false); // 诊断状态
const messageRef = ref(null);

const queryInfos = ref({
  messages: [],
  model:'deepseek-chat',
  ...MODEL_CONFIG
});

const currentConfig = ref(DEEPSEEK_CONFIG);

// 监听数据变化
watch(sessionList, (val) => {
  const list = val.map((o, i) => ({
    ...o,
    messages: i === activeIndex.value ? queryInfos.value.messages : o.messages
  }));
  localStorage.setItem(STORAGE_KEYS.sessionList, JSON.stringify(list));
}, { deep: true });

watch(activeIndex, (val) => {
  localStorage.setItem(STORAGE_KEYS.activeIndex, JSON.stringify(val));
}, { deep: true });

// 监听模型选择变化，缓存到本地存储
watch(() => queryInfos.value.model, (val) => {
  localStorage.setItem(STORAGE_KEYS.selectedModel, val);
});

// 方法
const handleClearStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.sessionList);
  localStorage.removeItem(STORAGE_KEYS.activeIndex);
  localStorage.removeItem(STORAGE_KEYS.selectedModel); // 清除模型选择缓存
  
  // 保留预设会话，清空其他会话
  sessionList.value = [...PRESET_SESSIONS];
  activeIndex.value = 0; // 默认选中第一个预设会话
  queryInfos.value.messages = sessionList.value[0].messages;
  queryInfos.value.model = 'deepseek-chat'; // 重置为默认模型
};

// 预设会话配置
const PRESET_SESSIONS = [
  {
    title: "CRUD页面配置",
    crtTime: new Date(),
    messages: [
      {
        role: "assistant",
        content: `欢迎使用CRUD页面配置助手！🎉

我是专业的前端工程师助手，专门帮助您生成Vue3 + Search + Table的配置代码。

## 🚀 我能为您做什么：
- 🔧 **智能代码生成**：根据字段描述自动生成searchParams和tableColumns配置
- 🎯 **类型推断**：智能推断合适的组件类型（输入框、选择器、日期等）
- 📝 **中文注释**：生成带有清晰注释的代码
- 🎨 **最佳实践**：遵循Vue3和Search/Table规范

## 📖 使用方法：

### 方式一：简单描述
\`\`\`
用户管理表格，包含以下字段：
- 用户ID（数字）
- 用户名（文本）
- 邮箱（文本）
- 状态（选择：启用/禁用）
- 注册时间（日期）
\`\`\`

### 方式二：详细配置
\`\`\`
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
\`\`\`

## 💡 使用技巧：
- 📋 **字段类型**：明确说明是文本、数字、日期、选择等
- 🎛️ **组件属性**：可指定宽度、格式、验证规则等
- 🔗 **数据来源**：说明选择项来源（字典、接口等）
- 🎨 **显示样式**：可指定颜色、对齐方式、格式化等
- 🔧 **特殊功能**：如排序、筛选、自定义渲染等

我会为您生成完整的搜索、表格代码！✨`
      }
    ],
    isPreset: true // 标记为预设会话
  }
];

// 初始化函数
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

const initIndex = () => {
  const listLen = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessionList) || "[]").length;
  const lastIndex = JSON.parse(localStorage.getItem(STORAGE_KEYS.activeIndex) || "-1");
  if (listLen) {
    activeIndex.value = lastIndex || 0;
  } else {
    activeIndex.value = -1;
  }
  if (activeIndex.value != -1) {
    queryInfos.value.messages = sessionList.value[activeIndex.value].messages || [];
  }
};

// 初始化模型选择，从缓存中读取
const initModel = () => {
  const cachedModel = localStorage.getItem(STORAGE_KEYS.selectedModel);
  if (cachedModel && (cachedModel === 'deepseek-chat' || cachedModel === 'gemini-chat')) {
    queryInfos.value.model = cachedModel;
    // 根据模型切换配置
    handleModelChange(cachedModel);
  }
};

const handleAddSession = () => {
  if (loading.value) {
    ElMessage({ type: "warning", message: "请当前问题查询完成后重试！" });
    return;
  }
  // 创建普通对话会话，不包含预设配置
  sessionList.value.push({
    title: `对话${sessionList.value.length + 1}`,
    crtTime: new Date(),
    messages: [],
    isPreset: false, // 明确标记为非预设会话
  });
  queryInfos.value.messages = [];
  activeIndex.value = sessionList.value.length - 1;
};

const handleDeleteSession = (index = 0) => {
  // 检查是否为预设会话，不允许删除
  if (sessionList.value[index]?.isPreset) {
    ElMessage({
      type: "warning",
      message: "CRUD页面配置是固定会话，不能删除！",
    });
    return;
  }

  ElMessageBox.confirm("确认删除当前对话？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      sessionList.value.splice(index, 1);
      if (index == activeIndex.value) {
        activeIndex.value = sessionList.value[index] ? index : --index;
      } else if (index < activeIndex.value) {
        activeIndex.value = --activeIndex.value;
      }
      queryInfos.value.messages =
        activeIndex.value > -1
          ? sessionList.value[activeIndex.value].messages
          : [];
      handleChangeSessionIndex(activeIndex.value);
    })
    .catch(() => {});
};

const handleClearSession = (index) => {
  // 如果是预设会话，恢复到初始状态而不是完全清空
  if (sessionList.value[index]?.isPreset) {
    const presetSession = PRESET_SESSIONS.find(
      (session) => session.title === sessionList.value[index].title
    );
    if (presetSession) {
      sessionList.value[index].messages = [...presetSession.messages];
    }
  } else {
    sessionList.value[index].messages = [];
  }
  queryInfos.value.messages = sessionList.value[index].messages;
  activeIndex.value = index;
};

const handleFocusInput = (index) => {
  editIndex.value = index;
};

const handleChangeSessionIndex = async (index) => {
  if (loading.value) {
    ElMessage({ type: "warning", message: "请当前问题查询完成后重试！" });
    return;
  }
  activeIndex.value = index;
  queryInfos.value.messages =
    sessionList.value[activeIndex.value]?.messages || [];
  await nextTick();
  messageRef.value.scrollBottom();
};

const initOpenAI = () => {
  openai.value = new OpenAI({
    ...currentConfig.value,
  });
};

const handleModelChange = (value) => {
  currentConfig.value =
    value === "deepseek-chat" ? DEEPSEEK_CONFIG : GEMINI_CONFIG;
  initOpenAI();
};

// 诊断Gemini API连接
const handleDiagnoseGemini = async () => {
  diagnosing.value = true;

  try {
    // 验证配置
    const configValidation = validateGeminiConfig();

    if (!configValidation.isValid) {
      ElMessage({
        type: "error",
        message: `配置错误: ${configValidation.errors.join(", ")}`,
        duration: 5000,
      });
      return;
    }

    if (configValidation.warnings.length > 0) {
      ElMessage({
        type: "warning",
        message: `配置警告: ${configValidation.warnings.join(", ")}`,
        duration: 3000,
      });
    }

    // 测试连接
    const testResult = await testGeminiConnection();

    if (testResult.success) {
      ElMessage({
        type: "success",
        message: "Gemini API连接测试成功！",
        duration: 3000,
      });
      console.log("Gemini API测试响应:", testResult.data);
    } else {
      ElMessage({
        type: "error",
        message: `连接测试失败: ${parseGeminiError(
          new Error(testResult.error)
        )}`,
        duration: 5000,
      });
      console.error("Gemini API测试失败:", testResult);
    }
  } catch (error) {
    ElMessage({
      type: "error",
      message: `诊断过程出错: ${error.message}`,
      duration: 5000,
    });
    console.error("诊断错误:", error);
  } finally {
    diagnosing.value = false;
  }
};

const initToken = async () => {
  const res = await getTokens({
    deepseek: "Y",
    gptToken: DEEPSEEK_CONFIG.apiKey,
  });
  const { balance_infos = [] } = res;
  balance_infos.forEach((o) => {
    totalAmt.value += Number(o.total_balance);
  });
};

// 获取当前会话的系统提示词 - 使用统一的配置
const getCurrentSystemPrompt = () => {
  const currentSession = sessionList.value[activeIndex.value];
  const sessionType = currentSession?.isPreset ? 'crud' : 'general';
  return getSystemPrompt(queryInfos.value.model, sessionType);
};

// 获取Gemini模型的初始回复消息 - 简化逻辑
const getGeminiInitialResponse = () => {
  const currentSession = sessionList.value[activeIndex.value];
  return currentSession?.isPreset 
    ? '我是您的专业前端工程师助手，专门帮助您生成Vue3配置代码。请告诉我您需要什么帮助？'
    : '我是您的智能AI助手，很高兴为您服务！请告诉我您需要什么帮助？';
};

const handleRequest = async () => {
  if (!queryKeys.value) return;
  if (!openai.value) initOpenAI();
  if (!sessionList.value.length) {
    await handleAddSession();
  }

  queryInfos.value.messages.push({
    role: "user",
    content: queryKeys.value,
    name: '小智'
  });
  queryKeys.value = null;
  messageRef.value.scrollBottom();

  try {
    loading.value = true;
    queryInfos.value.messages.push({ role: "assistant", content: "" });
    
    if (queryInfos.value.model === 'gemini-chat') {
      // 验证Gemini配置
      const configValidation = validateGeminiConfig();
      if (!configValidation.isValid) {
        throw new Error(`配置错误: ${configValidation.errors.join(', ')}`);
      }
      
      // 显示配置警告
      if (configValidation.warnings.length > 0) {
        console.warn('Gemini配置警告:', configValidation.warnings);
      }
      
      // 使用辅助工具格式化消息
      const userMessages = formatGeminiMessages(queryInfos.value.messages.slice(0, -1));
    
      // 确保至少有一条用户消息
      if (userMessages.length === 0) {
        throw new Error('没有有效的对话内容');
      }
    
      // 根据会话类型获取系统提示词
      const systemPrompt = getCurrentSystemPrompt();
      const initialResponse = getGeminiInitialResponse();
      
      // 构建包含系统提示词的完整对话内容
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model', 
          parts: [{ text: initialResponse }]
        },
        ...userMessages
      ];
    
      const requestBody = {
        ...GEMINI_MODEL_CONFIG,
        contents
      };
    
      console.log('Gemini请求参数:', JSON.stringify(requestBody, null, 2));
    
      const response = await fetch(currentConfig.value.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API错误响应:', errorText);
        throw new Error(`Gemini API请求失败 (${response.status}): ${errorText}`);
      }
    
      const responseData = await response.json();
      console.log('Gemini响应数据:', responseData);
      
      // 处理Gemini API响应
      if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
        queryInfos.value.messages[queryInfos.value.messages.length - 1].content = responseData.candidates[0].content.parts[0].text;
      } else if (responseData?.error) {
        throw new Error(`Gemini API错误: ${responseData.error.message || '未知错误'}`);
      } else {
        // 检查是否被安全过滤器阻止
        if (responseData?.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error('消息内容触发了安全过滤器，请修改内容后重试');
        }
        throw new Error('Gemini API返回了无效的响应格式');
      }
    } else {
      // 根据会话类型获取系统提示词
      const systemPrompt = getCurrentSystemPrompt();
      
      // 为DeepSeek添加系统提示词
      const messagesWithSystemPrompt = [
        {
          role: 'system',
          content: systemPrompt
        },
        // 包含所有用户消息，但不包含最后一条空的assistant消息
        ...queryInfos.value.messages.slice(0, -1)
      ];
      
      const requestConfig = {
        ...queryInfos.value,
        messages: messagesWithSystemPrompt,
        stream: true
      };

      const response = await openai.value.chat.completions.create(requestConfig);
      for await (const part of response) {
        queryInfos.value.messages[queryInfos.value.messages.length - 1].content += part.choices[0].delta.content;
      }
    }
    
    messageRef.value.scrollBottom();
    sessionList.value[activeIndex.value].messages = queryInfos.value.messages;
    loading.value = false;
  } catch (error) {
    loading.value = false;
    console.error('API请求错误:', error);
    
    // 使用专门的错误解析工具
    let errorMessage;
    if (queryInfos.value.model === 'gemini-chat') {
      errorMessage = parseGeminiError(error);
    } else {
      // DeepSeek错误处理
      errorMessage = error.message;
      if (error.message.includes('400')) {
        errorMessage = '请求参数错误，请检查API配置和消息格式';
      } else if (error.message.includes('401')) {
        errorMessage = 'API密钥无效，请检查配置文件中的API_KEY';
      } else if (error.message.includes('403')) {
        errorMessage = 'API访问被拒绝，请检查API密钥权限或配额';
      } else if (error.message.includes('429')) {
        errorMessage = 'API请求频率过高，请稍后重试';
      } else if (error.message.includes('500')) {
        errorMessage = 'API服务器内部错误，请稍后重试';
      }
    }
    
    queryInfos.value.messages[queryInfos.value.messages.length - 1].content = `❌ 错误: ${errorMessage}`;
    
    // 显示错误提示
    ElMessage({
      type: 'error',
      message: errorMessage,
      duration: 5000,
      showClose: true
    });
  }
};

// 生命周期钩子
onMounted(async () => {
  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content =
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
  document.head.appendChild(meta);

  initSessionList();
  initIndex();
  initModel(); // 初始化模型选择缓存
  initOpenAI();
  initToken();

  const md = new MobileDetect(window.navigator.userAgent);
  isMobile.value = md.mobile();
  await nextTick();
  messageRef.value.scrollBottom();
});
</script>

<style scoped lang="scss">
@use "./styles/common.scss" as *;
</style>
