<template>
  <div ref="chatContainer" class="virtual-chat-container" @scroll="handleScroll">
    <div class="virtual-chat-content" :style="{ paddingTop: `${aboveHeight}px`, paddingBottom: `${belowHeight}px` }">
      <ChatMessage v-for="(message, index) in visibleMessages" :key="message.id || index" :message="message"
        :index="startIndex + index" :ref="(el) => { if (el) messageRefs[startIndex + index] = el; }" />
    </div>
    <div class="scroll-to-bottom" v-show="showScrollButton" @click="scrollToBottom">
      <i class="scroll-icon">↓</i>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import { throttle } from '@/utils/scrollHelper';
import ChatMessage from './ChatMessage.vue';

const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  // 预估的单个消息高度，用于初步计算
  estimatedItemHeight: {
    type: Number,
    default: 100
  },
  // 缓冲区大小，即在可见区域之外多渲染的消息数量
  bufferSize: {
    type: Number,
    default: 5
  }
});

const chatContainer = ref(null);
const showScrollButton = ref(false);

// 虚拟滚动相关状态
const startIndex = ref(0);
const endIndex = ref(0);
const aboveHeight = ref(0); // 上方不可见区域的高度
const belowHeight = ref(0); // 下方不可见区域的高度
const messageRefs = ref({}); // 用于存储 ChatMessage 组件实例的引用

// 存储每个消息的实际高度
const itemHeights = ref(new Map());

// 计算所有消息的总高度
const totalHeight = computed(() => {
  let height = 0;
  for (let i = 0; i < props.messages.length; i++) {
    height += itemHeights.value.get(i) || props.estimatedItemHeight;
  }
  return height;
});

// 可见消息列表
const visibleMessages = computed(() => {
  return props.messages.slice(startIndex.value, endIndex.value + 1);
});

// 更新可见项
const updateVisibleItems = () => {
  if (!chatContainer.value) return;

  const { scrollTop, clientHeight } = chatContainer.value;

  let currentAboveHeight = 0;
  let currentStartIndex = 0;
  for (let i = 0; i < props.messages.length; i++) {
    const itemHeight = itemHeights.value.get(i) || props.estimatedItemHeight;
    if (currentAboveHeight + itemHeight > scrollTop) {
      currentStartIndex = i;
      break;
    }
    currentAboveHeight += itemHeight;
  }

  // 考虑缓冲区
  startIndex.value = Math.max(0, currentStartIndex - props.bufferSize);

  let currentBelowHeight = 0;
  let currentEndIndex = props.messages.length - 1;
  let renderedHeight = 0;
  for (let i = startIndex.value; i < props.messages.length; i++) {
    const itemHeight = itemHeights.value.get(i) || props.estimatedItemHeight;
    renderedHeight += itemHeight;
    if (renderedHeight > clientHeight + (props.bufferSize * props.estimatedItemHeight)) {
      currentEndIndex = i;
      break;
    }
    currentEndIndex = i;
  }
  endIndex.value = Math.min(props.messages.length - 1, currentEndIndex + props.bufferSize);

  // 计算上方和下方填充高度
  aboveHeight.value = 0;
  for (let i = 0; i < startIndex.value; i++) {
    aboveHeight.value += itemHeights.value.get(i) || props.estimatedItemHeight;
  }

  belowHeight.value = 0;
  for (let i = endIndex.value + 1; i < props.messages.length; i++) {
    belowHeight.value += itemHeights.value.get(i) || props.estimatedItemHeight;
  }
};

// 处理滚动事件
const handleScroll = throttle(() => {
  if (!chatContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = chatContainer.value;
  const maxScroll = scrollHeight - clientHeight;

  // 显示/隐藏滚动按钮 - 向下滚动超过50%时显示
  showScrollButton.value = scrollTop < maxScroll - clientHeight * 0.5;

  updateVisibleItems();
}, 200);

// 滚动到底部
const scrollToBottom = () => {
  if (!chatContainer.value) return;
  // 对于虚拟滚动，直接设置 scrollTop 到总高度减去容器高度
  chatContainer.value.scrollTop = totalHeight.value - chatContainer.value.clientHeight;
};

// 监听消息变化
watch(() => props.messages.length, async (newLength, oldLength) => {
  if (newLength > oldLength) {
    await nextTick();
    // 检查是否在底部附近，如果是则自动滚动
    if (chatContainer.value) {
      const { scrollTop, clientHeight } = chatContainer.value;
      const isNearBottom = (totalHeight.value - scrollTop - clientHeight) < 200;

      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }
  updateVisibleItems(); // 消息数量变化时更新可见项
}, { flush: 'post' });

// 监听最后一条消息的内容变化（流式更新时）
let lastContent = '';
let contentChangeTimer = null;
watch(() => {
  if (props.messages.length === 0) return '';
  return props.messages[props.messages.length - 1]?.content || '';
}, async (newContent) => {
  // 只在内容真正变化且变长时触发
  if (newContent && newContent !== lastContent && newContent.length > lastContent.length) {
    lastContent = newContent;

    // 清除之前的定时器
    if (contentChangeTimer) {
      clearTimeout(contentChangeTimer);
    }

    // 延迟执行，避免频繁触发
    contentChangeTimer = setTimeout(async () => {
      await nextTick(); // 等待 DOM 更新
      updateItemHeights(); // 重新测量高度
      if (chatContainer.value) {
        const { scrollTop, clientHeight } = chatContainer.value;
        const isNearBottom = (totalHeight.value - scrollTop - clientHeight) < 300;

        // 只有在底部附近才自动滚动
        if (isNearBottom) {
          scrollToBottom();
        }
      }
    }, 100);
  }
});

// 在组件更新后获取实际高度
const updateItemHeights = () => {
  if (!chatContainer.value) return;
  for (let i = startIndex.value; i <= endIndex.value; i++) {
    const el = messageRefs.value[i]?.$el;
    if (el) {
      const height = el.offsetHeight;
      if (itemHeights.value.get(i) !== height) {
        itemHeights.value.set(i, height);
      }
    }
  }
  // 重新计算一次可见项，因为高度可能已经更新
  updateVisibleItems();
};

onMounted(async () => {
  await nextTick();

  // 初始滚动到底部
  if (props.messages.length > 0) {
    scrollToBottom();
  }
  updateVisibleItems(); // 初始加载时更新可见项
});

// 每次组件更新后（例如消息内容变化导致高度变化），重新测量高度
watch([() => props.messages, startIndex, endIndex], () => {
  nextTick(() => {
    updateItemHeights();
  });
}, { deep: true });

onBeforeUnmount(() => {
  if (contentChangeTimer) {
    clearTimeout(contentChangeTimer);
  }
});

// 暴露方法给父组件
defineExpose({
  scrollToBottom
});
</script>

<style scoped>
.virtual-chat-container {
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.virtual-chat-content {
  position: relative;
  width: 100%;
  padding: 0;
  min-height: 100%;
  /* 确保内容区域至少和容器一样高 */
}

.scroll-to-bottom {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  z-index: 100;
}

.scroll-to-bottom:hover {
  background-color: #f5f5f5;
  transform: translateY(-2px);
}

.scroll-icon {
  font-size: 20px;
  color: #666;
}
</style>