<template>
  <div class="container-message" id="messageCompBox">
    <template v-if="message.length">
      <div class="box-item" v-for="(item, index) in message" :key="`message_${index}`">
        <div :class="['message-item', item.role === 'assistant' ? 'message-item--assistant' : 'message-item--user']" v-if="item.role === 'assistant' || item.content">
          <el-avatar class="message-item__avatar" v-if="item.role === 'assistant'">
            <img src="../images/ai.png" />
          </el-avatar>
          <div v-else></div>
          <div :class="['message-item__content', item.role === 'assistant' ? 'message-item__content--left' : 'message-item__content--right']">
            <div class="message-item__text">
              <Markdown v-loading :source="item.content || '思考中...'" />
            </div>
            <!-- 导出代码按钮 - 仅在AI回复且包含代码时显示，预设会话不显示 -->
            <div class="export-actions" v-if="item.role === 'assistant' && hasCodeContent(item.content) && !isPresetMessage(index)">
              <el-button 
                type="primary" 
                size="small" 
                :icon="Download" 
                @click="handleExportCode(item.content, index)"
                title="导出代码">
                导出代码
              </el-button>
            </div>
          </div>
          <el-avatar class="message-item__avatar" v-if="item.role !== 'assistant'">
            <img src="../images/user.png" />
          </el-avatar>
          <div v-else></div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="empty-box">
        <el-empty description="暂无对话信息"></el-empty>
      </div>
    </template>
  </div>
</template>

<script setup>
import { nextTick } from 'vue';
import Markdown from "vue3-markdown-it";
import { Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  message: {
    type: Array,
    default: () => [],
  },
});

const scrollBottom = () => {
  nextTick(() => {
    const div = document.getElementById("messageCompBox");
    div.scrollTop = div.scrollHeight - div.clientHeight;
  });
};

// 检测消息内容是否包含代码块
const hasCodeContent = (content) => {
  if (!content) return false;
  // 检测是否包含代码块标记
  return content.includes('```') || content.includes('export const') || content.includes('import ');
};

// 判断是否为预设会话的消息（第一条消息通常是预设的欢迎消息）
const isPresetMessage = (index) => {
  // 如果是第一条消息且包含欢迎内容，则认为是预设消息
  if (index === 0 && props.message[0]?.content?.includes('欢迎使用CRUD页面配置助手')) {
    return true;
  }
  return false;
};

// 导出代码功能
const handleExportCode = (content, index) => {
  if (!content) {
    ElMessage.warning('没有可导出的内容');
    return;
  }

  try {
    // 提取代码块内容
    const codeBlocks = extractCodeBlocks(content);
    
    if (codeBlocks.length === 0) {
      ElMessage.warning('未找到可导出的代码块');
      return;
    }

    // 如果有多个代码块，合并导出
    const exportContent = codeBlocks.length === 1 
      ? codeBlocks[0].content 
      : codeBlocks.map((block, i) => {
          const header = block.language ? `// ${block.language.toUpperCase()} 代码块 ${i + 1}` : `// 代码块 ${i + 1}`;
          return `${header}\n${block.content}`;
        }).join('\n\n');

    // 确定文件扩展名
    const fileExtension = getFileExtension(codeBlocks[0].language);
    const fileName = `generated-code-${Date.now()}${fileExtension}`;

    // 创建并下载文件
    downloadFile(exportContent, fileName);
    
    ElMessage.success(`代码已导出为 ${fileName}`);
  } catch (error) {
    console.error('导出代码失败:', error);
    ElMessage.error('导出代码失败，请重试');
  }
};

// 提取代码块内容
const extractCodeBlocks = (content) => {
  const codeBlocks = [];
  
  // 匹配 ```language 代码块
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      content: match[2].trim()
    });
  }
  
  // 如果没有找到标准代码块，尝试提取包含关键字的内容
  if (codeBlocks.length === 0) {
    const lines = content.split('\n');
    const codeLines = [];
    let inCodeSection = false;
    
    for (const line of lines) {
      // 检测代码开始标志
      if (line.includes('import ') || line.includes('export const') || line.includes('export default')) {
        inCodeSection = true;
      }
      
      if (inCodeSection) {
        codeLines.push(line);
        
        // 检测代码结束（空行或非代码内容）
        if (line.trim() === '' && codeLines.length > 5) {
          const nextLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 3);
          if (nextLines.every(l => !l.includes('export') && !l.includes('import') && !l.trim().startsWith('//'))) {
            break;
          }
        }
      }
    }
    
    if (codeLines.length > 0) {
      codeBlocks.push({
        language: 'typescript',
        content: codeLines.join('\n').trim()
      });
    }
  }
  
  return codeBlocks;
};

// 根据语言确定文件扩展名
const getFileExtension = (language) => {
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
};

// 下载文件
const downloadFile = (content, fileName) => {
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
};

defineExpose({
  scrollBottom
});
</script>

<style scoped lang="scss">
.container-message {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.empty-box {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.box-item {
  margin-bottom: 12px;
}

.message-item {
  display: grid;
  column-gap: 8px;

  &--user {
    grid-template-columns: 0% auto 40px;
    justify-content: end;
  }

  &--assistant {
    grid-template-columns: 40px auto 1%;
    justify-content: start;
  }

  &__avatar {
    width: 36px;
    height: 36px;
    background-color: #121212;
    border: 2px solid #fe2c55;
    padding: 4px;
  }

  &__content {
    background-color: #2f2f2f;
    position: relative;
    border-radius: 8px;

    &--left::before,
    &--right::before {
      content: "";
      width: 0;
      height: 0;
      position: absolute;
      border: 5px solid transparent;
      top: 15px;
    }

    &--left::before {
      border-right-color: #2f2f2f;
      left: -9px;
    }

    &--right::before {
      border-left-color: #2f2f2f;
      right: -9px;
    }
  }

  &__text {
    padding: 0rem 12px;
    color: #fff;
    position: relative;
    font-size: 0.875rem;
    line-height: 1.4;

    :deep(p) {
      margin: 0.5rem 0;
    }

    :deep(pre) {
      margin: 0.5rem 0;
      font-size: 0.8125rem;
      max-width: 100%;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    :deep(code) {
      font-size: 0.8125rem;
      max-width: 100%;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  }
}

// 导出操作按钮样式
.export-actions {
  padding: 8px 12px 12px 12px;
  border-top: 1px solid #404040;
  background-color: rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  
  .el-button {
    --el-button-size: 28px;
    --el-button-padding: 8px 12px;
    --el-button-font-size: 12px;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
}
</style>
