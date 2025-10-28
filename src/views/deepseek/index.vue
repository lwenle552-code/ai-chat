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
          <el-button type="primary" class="add-btn" :icon="Plus" size="large" @click="handleAddSession">新建对话</el-button>
          <div class="session-area">
            <div class="session-item" :class="[
              activeIndex == index ? 'session-item-active' : '', // 选中样式
              item.isPreset ? 'session-item-preset' : '', // 预设会话样式
            ]" v-for="(item, index) in sessionList" :key="index" @click="handleChangeSessionIndex(index)">
              <div class="session-title">
                <el-icon v-if="item.isPreset" class="preset-icon" color="#fe2c55">
                  <Star />
                </el-icon>
                <span :class="activeIndex == index ? 'active-node' : 'normal-node'" v-if="editIndex != index">{{
                  item.title }}</span>
                <el-input :ref="`renameRef_${index}`" autofocus v-model="item.title" v-else-if="!item.isPreset"
                  size="small" style="width: 120px" @blur="editIndex = -1" @change="editIndex = -1" />
                <span v-else :class="activeIndex == index ? 'active-node' : 'normal-node'">{{ item.title }}</span>
              </div>
              <div class="icon-box">
                <el-tooltip content="清空对话内容" placement="bottom">
                  <el-icon class="icon" color="#fff" @click.stop="handleClearSession(index)">
                    <Brush />
                  </el-icon>
                </el-tooltip>
                <el-tooltip content="重命名" placement="bottom">
                  <el-icon v-if="!item.isPreset" class="icon" color="#fff" @click.stop="handleFocusInput(index)">
                    <EditPen />
                  </el-icon>
                </el-tooltip>
                <el-tooltip content="删除" placement="bottom">
                  <el-icon v-if="!item.isPreset" class="icon" color="#fff" @click.stop="handleDeleteSession(index)">
                    <Delete />
                  </el-icon>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
        <div class="container">
          <div class="message-area">
            <VirtualChat ref="virtualChatRef" :messages="queryInfos.messages" :estimated-item-height="100"
              :buffer-size="5" :loading="loading" />
          </div>
          <div class="user-tokens" :class="isMobile ? 'left-space' : ''">
            <span v-if="queryInfos.model == 'deepseek-chat'">
              当前余额为：￥{{ totalAmt || 0 }}
            </span>
            <span v-else>免费</span>
          </div>
          <div class="input-area" :class="isMobile ? 'left-space' : ''">
            <el-input v-model="queryKeys" id="keyInput" placeholder="请输入内容" show-word-limit @keydown.enter="
              (e) => {
                if (e.isComposing || loading) return; // 忽略中文输入法合成和加载状态
                handleRequest(); // 调用消息发送函数
              }
            " />
            <div class="button-group">
              <el-select v-model="queryInfos.model" class="model-select" @change="handleModelChange"
                :disabled="queryInfos.messages.length > 0" :title="queryInfos.messages.length > 0
                  ? '有聊天记录时无法切换模型' // 聊天记录存在时禁用切换
                  : ''
                  ">
                <el-option label="DeepSeek" value="deepseek-chat" />
                <el-option label="Gemini" value="gemini-chat" />
              </el-select>

              <el-button v-if="queryInfos.model === 'gemini-chat'" style="height: 40px" type="warning"
                @click="handleDiagnoseGemini" :loading="diagnosing" title="诊断Gemini API连接">
                <el-icon>
                  <Tools />
                </el-icon>
              </el-button>

              <el-button v-if="queryInfos.model === 'deepseek-chat'" style="height: 40px" type="warning"
                @click="handleDiagnoseDeepSeek" :loading="diagnosing" title="诊断DeepSeek API连接">
                <el-icon>
                  <Tools />
                </el-icon>
              </el-button>

              <el-button style="height: 40px" type="primary" @click="handleRequest" :disabled="!queryKeys"
                :loading="loading">
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
import OpenAI from "openai"; // 导入 OpenAI SDK，用于 DeepSeek/GPT 的 API 调用
import { Promotion, Delete, EditPen, Brush, Plus, Tools, Star } from "@element-plus/icons-vue"; // 导入 Element-Plus 图标
import { getTokens } from "@/api/modules/deepseek.js"; // 导入获取 DeepSeek 余额的 API
import { ElMessage, ElMessageBox } from "element-plus"; // 导入 Element-Plus 消息和弹框组件
import MobileDetect from "mobile-detect"; // 导入移动端检测工具
import { API_CONFIG as DEEPSEEK_CONFIG, MODEL_CONFIG, STORAGE_KEYS } from '@/config/deepseek'; // 导入 DeepSeek 配置
import { API_CONFIG as GEMINI_CONFIG, MODEL_CONFIG as GEMINI_MODEL_CONFIG } from '@/config/gemini'; // 导入 Gemini 配置
import { validateGeminiConfig, testGeminiConnection, formatGeminiMessages, parseGeminiError } from '@/utils/geminiHelper'; // 导入 Gemini 辅助函数
import { validateDeepSeekConfig, parseDeepSeekError, testDeepSeekConnection } from '@/utils/deepseekHelper'; // 导入 DeepSeek 辅助函数
import { getSystemPrompt } from '@/config/prompts'; // 导入提示词配置
import { ElTooltip } from 'element-plus';
import VirtualChat from '@/components/VirtualChat.vue';

// --- 响应式数据 (Reactive State) ---

const isMobile = ref(false); // 是否为移动端
const sessionList = ref([]); // 会话列表
const activeIndex = ref(-1); // 当前激活会话的索引
const editIndex = ref(-1); // 正在重命名的会话索引
const totalAmt = ref(0); // DeepSeek 账户余额
const queryKeys = ref(""); // 用户输入的内容
const openai = ref(null); // OpenAI 客户端实例
const loading = ref(false); // API 请求加载状态
const diagnosing = ref(false); // API 诊断状态
const virtualChatRef = ref(null); // 消息组件的引用

// 存储当前会话信息和模型配置
const queryInfos = ref({
  messages: [], // 消息数组
  model: 'deepseek-chat', // 默认模型
  ...MODEL_CONFIG // DeepSeek 模型参数
});

const currentConfig = ref(DEEPSEEK_CONFIG); // 当前模型的 API 配置

// --- 监听数据变化 (Watchers) ---

// 监听会话列表变化，同步更新本地存储
watch(sessionList, (val) => {
  const list = val.map((o, i) => ({
    ...o,
    // 确保当前活跃会话的消息是最新的 queryInfos.messages
    messages: i === activeIndex.value ? queryInfos.value.messages : o.messages
  }));
  localStorage.setItem(STORAGE_KEYS.sessionList, JSON.stringify(list));
}, { deep: true });

// 监听当前激活索引变化，同步更新本地存储
watch(activeIndex, (val) => {
  localStorage.setItem(STORAGE_KEYS.activeIndex, JSON.stringify(val));
}, { deep: true });

// 监听模型选择变化，缓存到本地存储
watch(() => queryInfos.value.model, (val) => {
  localStorage.setItem(STORAGE_KEYS.selectedModel, val);
});

// --- 方法 (Methods) ---

/**
 * 清空所有本地缓存（会话列表、索引、模型选择），并重置为预设会话。
 */
const handleClearStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.sessionList);
  localStorage.removeItem(STORAGE_KEYS.activeIndex);
  localStorage.removeItem(STORAGE_KEYS.selectedModel);

  // 保留预设会话并重置状态
  sessionList.value = [...PRESET_SESSIONS];
  activeIndex.value = 0;
  queryInfos.value.messages = sessionList.value[0].messages;
  queryInfos.value.model = 'deepseek-chat';
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
... (省略欢迎词内容)
我会为您生成完整的搜索、表格代码！✨`
      }
    ],
    isPreset: true // 标记为预设会话，不可删除/重命名
  }
];

/**
 * 初始化会话列表，从本地存储加载，并确保预设会话存在。
 */
const initSessionList = () => {
  const savedSessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessionList) || "[]");

  // 检查已保存的会话中是否包含预设会话
  const hasPresetSession = savedSessions.some(session => session.isPreset);

  if (!hasPresetSession) {
    // 如果没有预设会话，将预设会话添加到列表开头
    sessionList.value = [...PRESET_SESSIONS, ...savedSessions];
  } else {
    // 否则保持原有顺序
    sessionList.value = savedSessions;
  }
};

/**
 * 初始化当前激活的会话索引。
 */
const initIndex = () => {
  const listLen = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessionList) || "[]").length;
  const lastIndex = JSON.parse(localStorage.getItem(STORAGE_KEYS.activeIndex) || "-1");
  if (listLen) {
    activeIndex.value = lastIndex || 0;
  } else {
    activeIndex.value = -1;
  }
  // 如果有激活的会话，加载其消息
  if (activeIndex.value != -1) {
    queryInfos.value.messages = sessionList.value[activeIndex.value].messages || [];
  }
};

/**
 * 初始化模型选择，从缓存中读取并应用。
 */
const initModel = () => {
  const cachedModel = localStorage.getItem(STORAGE_KEYS.selectedModel);
  if (cachedModel && (cachedModel === 'deepseek-chat' || cachedModel === 'gemini-chat')) {
    queryInfos.value.model = cachedModel;
    handleModelChange(cachedModel); // 切换配置
  }
};

/**
 * 新建一个普通对话会话。
 */
const handleAddSession = () => {
  if (loading.value) {
    ElMessage({ type: "warning", message: "请当前问题查询完成后重试！" });
    return;
  }
  // 创建新的非预设会话
  sessionList.value.push({
    title: `对话${sessionList.value.length + 1}`,
    crtTime: new Date(),
    messages: [],
    isPreset: false,
  });
  queryInfos.value.messages = [];
  activeIndex.value = sessionList.value.length - 1; // 激活新会话
};

/**
 * 删除指定的对话会话。
 * @param {number} index - 待删除会话的索引
 */
const handleDeleteSession = (index = 0) => {
  // 预设会话不允许删除
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
      sessionList.value.splice(index, 1); // 删除会话
      // 调整 activeIndex 的逻辑，确保始终指向一个有效的会话
      if (index == activeIndex.value) {
        activeIndex.value = sessionList.value[index] ? index : --index;
      } else if (index < activeIndex.value) {
        activeIndex.value = --activeIndex.value;
      }
      // 更新当前消息列表
      queryInfos.value.messages =
        activeIndex.value > -1
          ? sessionList.value[activeIndex.value].messages
          : [];
      handleChangeSessionIndex(activeIndex.value);
    })
    .catch(() => { });
};

/**
 * 清空指定会话的消息内容。
 * @param {number} index - 待清空会话的索引
 */
const handleClearSession = (index) => {
  // 如果是预设会话，则恢复到初始的欢迎语
  if (sessionList.value[index]?.isPreset) {
    const presetSession = PRESET_SESSIONS.find(
      (session) => session.title === sessionList.value[index].title
    );
    if (presetSession) {
      sessionList.value[index].messages = [...presetSession.messages];
    }
  } else {
    // 否则直接清空消息数组
    sessionList.value[index].messages = [];
  }
  queryInfos.value.messages = sessionList.value[index].messages;
  activeIndex.value = index;
};

/**
 * 激活输入框以开始重命名会话。
 * @param {number} index - 待重命名会话的索引
 */
const handleFocusInput = (index) => {
  editIndex.value = index;
};

/**
 * 切换当前活跃的会话。
 * @param {number} index - 目标会话的索引
 */
const handleChangeSessionIndex = async (index) => {
  if (loading.value) {
    ElMessage({ type: "warning", message: "请当前问题查询完成后重试！" });
    return;
  }
  activeIndex.value = index;
  queryInfos.value.messages =
    sessionList.value[activeIndex.value]?.messages || [];
  await nextTick();
  virtualChatRef.value?.scrollToBottom(); // 滚动到底部
};

/**
 * 初始化或重新初始化 OpenAI 客户端（用于 DeepSeek）。
 */
const initOpenAI = () => {
  openai.value = new OpenAI({
    ...currentConfig.value, // 使用当前模型的配置
  });
};

/**
 * 处理模型切换事件，更新配置并重新初始化 OpenAI 客户端。
 * @param {string} value - 选中的模型名称
 */
const handleModelChange = (value) => {
  currentConfig.value =
    value === "deepseek-chat" ? DEEPSEEK_CONFIG : GEMINI_CONFIG;
  initOpenAI();
};

/**
 * 诊断 Gemini API 连接。
 */
const handleDiagnoseGemini = async () => {
  diagnosing.value = true;

  try {
    // 1. 验证配置
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

    // 2. 测试连接
    const testResult = await testGeminiConnection();

    if (testResult.success) {
      ElMessage({
        type: "success",
        message: "Gemini API连接测试成功！",
        duration: 3000,
      });
      console.log("Gemini API测试响应:", testResult.data);
    } else {
      // 3. 失败时解析错误
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

/**
 * 诊断 DeepSeek API 连接。
 */
const handleDiagnoseDeepSeek = async () => {
  diagnosing.value = true;

  try {
    // 1. 验证配置
    const configValidation = validateDeepSeekConfig();

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

    // 2. 测试连接
    const testResult = await testDeepSeekConnection();

    if (testResult.success) {
      ElMessage({
        type: "success",
        message: "DeepSeek API连接测试成功！",
        duration: 3000,
      });
      console.log("DeepSeek API测试响应:", testResult.data);
    } else {
      // 3. 失败时解析错误（例如 402 Payment Required）
      ElMessage({
        type: "error",
        message: `连接测试失败: ${parseDeepSeekError(
          new Error(testResult.error)
        )}`,
        duration: 5000,
      });
      console.error("DeepSeek API测试失败:", testResult);
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

/**
 * 初始化 DeepSeek 余额（Token）。
 */
const initToken = async () => {
  const res = await getTokens({
    deepseek: "Y",
    gptToken: DEEPSEEK_CONFIG.apiKey,
  });
  const { balance_infos = [] } = res;
  // 累加所有余额信息
  balance_infos.forEach((o) => {
    totalAmt.value += Number(o.total_balance);
  });
};

/**
 * 获取当前会话的系统提示词，根据模型和会话类型确定。
 * @returns {string} 系统提示词
 */
const getCurrentSystemPrompt = () => {
  const currentSession = sessionList.value[activeIndex.value];
  // 如果是预设会话，类型为 'crud'，否则为 'general'
  const sessionType = currentSession?.isPreset ? 'crud' : 'general';
  return getSystemPrompt(queryInfos.value.model, sessionType);
};

/**
 * 获取 Gemini 模型的初始回复消息（用于构建消息历史）。
 * @returns {string} 初始回复消息
 */
const getGeminiInitialResponse = () => {
  const currentSession = sessionList.value[activeIndex.value];
  return currentSession?.isPreset
    ? '我是您的专业前端工程师助手，专门帮助您生成Vue3配置代码。请告诉我您需要什么帮助？'
    : '我是您的智能AI助手，很高兴为您服务！请告诉我您需要什么帮助？';
};

/**
 * 发送 API 请求（核心逻辑）。
 */
const handleRequest = async () => {
  if (!queryKeys.value) return; // 输入为空则返回
  if (!openai.value) initOpenAI(); // 确保 OpenAI 客户端已初始化
  if (!sessionList.value.length) {
    await handleAddSession(); // 确保有会话
  }

  // 1. 将用户消息添加到 messages 数组
  queryInfos.value.messages.push({
    role: "user",
    content: queryKeys.value,
    name: '小智'
  });
  queryKeys.value = null;
  virtualChatRef.value?.scrollToBottom();

  try {
    loading.value = true;
    // 2. 添加一个空的 assistant 消息占位符
    queryInfos.value.messages.push({ role: "assistant", content: "" });

    // --- Gemini API 调用逻辑 ---
    if (queryInfos.value.model === 'gemini-chat') {

      const configValidation = validateGeminiConfig();
      if (!configValidation.isValid) {
        throw new Error(`配置错误: ${configValidation.errors.join(', ')}`);
      }

      // 格式化用户消息为 Gemini API 结构
      const userMessages = formatGeminiMessages(queryInfos.value.messages.slice(0, -1));

      const systemPrompt = getCurrentSystemPrompt();
      const initialResponse = getGeminiInitialResponse();

      // 构建完整的 contents 数组，包含系统提示词和初始回复
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }] // 将系统提示词作为 user 消息发送（Gemini 约定）
        },
        {
          role: 'model',
          parts: [{ text: initialResponse }] // 初始回复作为 model 消息
        },
        ...userMessages // 历史对话消息
      ];

      const requestBody = {
        ...GEMINI_MODEL_CONFIG,
        contents
      };

      // 使用原生 Fetch 发送请求
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
        throw new Error(`Gemini API请求失败 (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();

      // 处理响应数据
      if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
        // 成功获取回复
        queryInfos.value.messages[queryInfos.value.messages.length - 1].content = responseData.candidates[0].content.parts[0].text;
      } else if (responseData?.error) {
        // API 返回错误信息
        throw new Error(`Gemini API错误: ${responseData.error.message || '未知错误'}`);
      } else {
        // 检查是否因安全策略被阻止
        if (responseData?.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error('消息内容触发了安全过滤器，请修改内容后重试');
        }
        throw new Error('Gemini API返回了无效的响应格式');
      }
    }
    // --- DeepSeek API 调用逻辑 ---
    else {

      const configValidation = validateDeepSeekConfig();
      if (!configValidation.isValid) {
        throw new Error(`配置错误: ${configValidation.errors.join(', ')}`);
      }

      const systemPrompt = getCurrentSystemPrompt();

      // 为 DeepSeek 添加系统提示词 (role: 'system')
      const messagesWithSystemPrompt = [
        {
          role: 'system',
          content: systemPrompt
        },
        // 包含所有历史用户消息和上一个 assistant 回复
        ...queryInfos.value.messages.slice(0, -1) // 排除最后一条空的 assistant 占位符
      ];

      const requestConfig = {
        model: "deepseek-chat",
        ...queryInfos.value,
        messages: messagesWithSystemPrompt,
        stream: true // 开启流式传输
      };

      // 使用 OpenAI 客户端发送请求
      const response = await openai.value.chat.completions.create(requestConfig);
      // 流式处理响应
      for await (const part of response) {
        // 拼接流式返回的内容
        queryInfos.value.messages[queryInfos.value.messages.length - 1].content += part.choices[0].delta.content;
      }
    }

    messageRef.value.scrollBottom();
    // 更新会话列表中的消息
    sessionList.value[activeIndex.value].messages = queryInfos.value.messages;
    loading.value = false;
  } catch (error) {
    loading.value = false;
    console.error('API请求错误:', error);

    // 根据模型使用不同的错误解析工具
    let errorMessage;
    if (queryInfos.value.model === 'gemini-chat') {
      errorMessage = parseGeminiError(error);
    } else {
      errorMessage = parseDeepSeekError(error);
    }

    // 将错误信息显示在消息区
    queryInfos.value.messages[queryInfos.value.messages.length - 1].content = `❌ 错误: ${errorMessage}`;

    // 显示 Element-Plus 错误提示
    ElMessage({
      type: 'error',
      message: errorMessage,
      duration: 5000,
      showClose: true
    });
  }
};

// --- 生命周期钩子 (Lifecycle Hooks) ---
onMounted(async () => {
  // 设置移动端视口 meta 标签
  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content =
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
  document.head.appendChild(meta);

  initSessionList(); // 1. 初始化会话列表
  initIndex(); // 2. 初始化激活索引
  initModel(); // 3. 初始化模型选择
  initOpenAI(); // 4. 初始化 API 客户端
  initToken(); // 5. 初始化 DeepSeek 余额

  // 检测是否为移动设备
  const md = new MobileDetect(window.navigator.userAgent);
  isMobile.value = md.mobile();
  await nextTick();
  virtualChatRef.value?.scrollToBottom(); // 滚动到底部
});
</script>

<style scoped lang="scss">
@use "./styles/common.scss" as *;

.message-area {
  height: calc(100vh - 200px);
  /* 调整具体数值以适应您的布局 */
  overflow: hidden;
  /* 让 VirtualChat 组件来控制滚动 */
}
</style>