<template>
  <div class="chat-message" :class="{ 'user-message': isUser, 'ai-message': !isUser }" :id="'message-' + index">
    <template v-if="isUser">
      <div class="message-content">
        <div class="message-text">
          <div v-if="message.content" v-html="renderMarkdown(message.content)" class="markdown-content"></div>
          <div v-else>思考中...</div>
        </div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
      <div class="message-avatar">
        <img :src="userAvatar" alt="User" />
      </div>
    </template>
    <template v-else>
      <div class="message-avatar">
        <img :src="aiAvatar" alt="AI" />
      </div>
      <div class="message-content">
        <div class="message-text">
          <div v-if="message.content" v-html="renderMarkdown(message.content)" class="markdown-content"></div>
          <div v-else>
            <template v-if="isLastLoading">
              <div class="loading-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </template>
            <template v-else>思考中...</template>
          </div>
        </div>
        <div class="export-actions" v-if="!isUser && hasCodeContent && !isPresetMessage">
          <el-button type="primary" size="small" :icon="View" @click="togglePreview" title="预览代码">
            预览代码
          </el-button>
          <el-button type="primary" size="small" :icon="Download" @click="handleExportCode" title="导出代码">
            导出代码
          </el-button>
        </div>
        <div v-if="showPreview" class="code-preview-container">
          <iframe ref="previewFrame" class="code-preview-iframe" sandbox="allow-scripts allow-same-origin"></iframe>
        </div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // 或者你喜欢的其他主题
import { Download, View } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import userAvatar from '../views/deepseek/images/user.png';
import aiAvatar from '../views/deepseek/images/ai.png';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      } catch (__) { }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});


const showPreview = ref(false);
const previewFrame = ref(null);

const renderMarkdown = (content) => {
  return md.render(content);
};

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  isLastLoading: {
    type: Boolean,
    default: false
  }
});

const isUser = computed(() => props.message.role === 'user');
const hasCodeContent = computed(() => {
  if (!props.message.content) return false;
  return props.message.content.includes('```') ||
    props.message.content.includes('export const') ||
    props.message.content.includes('import ');
});

const isPresetMessage = computed(() => {
  return props.index === 0 && props.message.content?.includes('欢迎 使用CRUD页面配置    助手');
});

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 切换预览
function togglePreview() {
  showPreview.value = !showPreview.value;
  if (showPreview.value) {
    nextTick(() => {
      renderPreview();
    });
  }
}

// 渲染预览
function renderPreview() {
  if (!previewFrame.value || !props.message.content) return;

  const codeBlocks = extractCodeBlocks(props.message.content);
  let htmlContent = '';
  let cssContent = '';

  codeBlocks.forEach(block => {
    if (block.language === 'html') {
      htmlContent += block.content;
    } else if (block.language === 'css') {
      cssContent += block.content;
    }
  });

  const iframeDoc = previewFrame.value.contentDocument || previewFrame.value.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>代码预览</title>
        <style>${cssContent}</style>
    </head>
    <body>
        ${htmlContent}
    </body>
    </html>
  `);
  iframeDoc.close();
}

// 提取代码块
function extractCodeBlocks(content) {
  const codeBlocks = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    let language = match[1] ? match[1].toLowerCase() : 'text';
    const codeContent = match[2].trim();

    // 尝试推断语言，如果未明确指定
    if (language === 'text' || language === '') {
      if (codeContent.includes('<') && codeContent.includes('>') && !codeContent.includes('{') && !codeContent.includes('}')) {
        language = 'html';
      } else if (codeContent.includes('{') && codeContent.includes('}') && !codeContent.includes('<') && !codeContent.includes('>')) {
        language = 'css';
      } else if (codeContent.includes('import ') || codeContent.includes('export ')) {
        language = 'typescript'; // 默认推断为 TypeScript/JavaScript
      }
    }

    codeBlocks.push({
      language: language,
      content: codeContent
    });
  }

  // 移除旧的推断逻辑，因为现在在代码块提取时已经处理
  // if (codeBlocks.length === 0) {
  //   const lines = content.split('\n');
  //   const codeLines = [];
  //   let inCodeSection = false;
  //
  //   for (const line of lines) {
  //     if (line.includes('import ') || line.includes('export const') || line.includes('export default')) {
  //       inCodeSection = true;
  //     }
  //
  //     if (inCodeSection) {
  //       codeLines.push(line);
  //
  //       if (line.trim() === '' && codeLines.length > 5) {
  //         const nextLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 3);
  //         if (nextLines.every(l => !l.includes('export') && !l.includes('import') && !l.trim().startsWith('//'))) {
  //           break;
  //         }
  //       }
  //     }
  //   }
  //
  //   if (codeLines.length > 0) {
  //     codeBlocks.push({
  //       language: 'typescript',
  //       content: codeLines.join('\n').trim()
  //     });
  //   }
  // }

  return codeBlocks;
}

// 获取文件扩展名
function getFileExtension(language) {
  const extensionMap = {
    'typescript': '.ts',
    'javascript': '.js',
    'vue': '.vue',
    'html': '.html',
    'css': '.css',
    'scss': '.scss',
    'json': '.json',
    'markdown': '.md',
    'text': '.txt'
  };

  return extensionMap[language?.toLowerCase()] || '.ts';
}

// 下载文件
function downloadFile(content, fileName) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 导出代码
function handleExportCode() {
  if (!props.message.content) {
    ElMessage.warning('没有可导出的内容');
    return;
  }

  try {
    const codeBlocks = extractCodeBlocks(props.message.content);

    if (codeBlocks.length === 0) {
      ElMessage.warning('未找到可导出的代码块');
      return;
    }

    const exportContent = codeBlocks.length === 1
      ? codeBlocks[0].content
      : codeBlocks.map((block, i) => {
        const header = block.language
          ? `// ${block.language.toUpperCase()} 代码块 ${i + 1}`
          : `// 代码块 ${i + 1}`;
        return `${header}\n${block.content}`;
      }).join('\n\n');

    const fileExtension = getFileExtension(codeBlocks[0].language);
    const fileName = `generated-code-${Date.now()}${fileExtension}`;

    downloadFile(exportContent, fileName);
    ElMessage.success(`代码已导出为 ${fileName}`);
  } catch (error) {
    console.error('导出代码失败:', error);
    ElMessage.error('导出代码失败，请重试');
  }
}
</script>

<style scoped>
.chat-message {
  display: flex;
  padding: 12px 16px;
  gap: 12px;
  transition: background-color 0.2s;
}

.user-message {
  justify-content: flex-end;
}

.ai-message {
  justify-content: flex-start;
}

.chat-message:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.message-avatar {
  flex-shrink: 0;
}

.message-avatar img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #121212;
  border: 2px solid #fe2c55;
  padding: 4px;
}

.message-content {
  flex: 1;
  max-width: 70%;
  /* 调整最大宽度 */
  background-color: #f5f5f5;
  border-radius: 8px;
  position: relative;
  padding: 12px;
  color: #000;
}

.user-message .message-content {
  background-color: #e0f7fa;
  /* 用户消息背景色 */
}

.ai-message .message-content {
  background-color: #f5f5f5;
  /* AI消息背景色 */
}

.message-content :deep(*) {
  color: #000;
}

.message-text {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: #000;
}

.message-text :deep(p) {
  margin: 0.5rem 0;
  color: #000;
}

.message-text :deep(pre) {
  margin: 0.5rem 0;
  font-size: 0.8125rem;
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #000;
}

.message-text :deep(code) {
  font-size: 0.8125rem;
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #000;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  text-align: right;
}

.ai-message .message-time {
  text-align: left;
}

.export-actions {
  padding: 8px 0 0;
  border-top: 1px solid #e0e0e0;
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.export-actions .el-button {
  --el-button-size: 28px;
  --el-button-padding: 8px 12px;
}

.code-preview-container {
  margin-top: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  height: 300px;
  /* 可根据需要调整高度 */
}

.code-preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.loading-dots {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.loading-dots .dot {
  width: 8px;
  height: 8px;
  background-color: #666;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots .dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {

  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1);
  }
}
</style>