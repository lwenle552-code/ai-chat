// Gemini API 辅助工具函数
import { API_CONFIG, MODEL_CONFIG } from '@/config/gemini';

/**
 * 验证Gemini API配置
 * @returns {Object} 验证结果
 */
export function validateGeminiConfig() {
  const errors = [];
  const warnings = [];

  // 检查API Key
  if (!API_CONFIG.apiKey || API_CONFIG.apiKey === 'YOUR_API_KEY') {
    errors.push('API Key未配置或使用默认值');
  }

  // 检查API Key格式
  if (API_CONFIG.apiKey && !API_CONFIG.apiKey.startsWith('AIza')) {
    warnings.push('API Key格式可能不正确，应以"AIza"开头');
  }

  // 检查baseURL
  if (!API_CONFIG.baseURL || !API_CONFIG.baseURL.includes('generativelanguage.googleapis.com')) {
    errors.push('baseURL配置错误');
  }

  // 检查模型配置
  if (!MODEL_CONFIG.generationConfig) {
    warnings.push('缺少generationConfig配置');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 测试Gemini API连接
 * @returns {Promise<Object>} 测试结果
 */
export async function testGeminiConnection() {
  try {
    const testMessage = {
      contents: [{
        parts: [{ text: '你好' }],
        role: 'user'
      }],
      ...MODEL_CONFIG
    };

    const response = await fetch(API_CONFIG.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      message: 'Gemini API连接成功'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Gemini API连接失败'
    };
  }
}

/**
 * 格式化Gemini消息
 * @param {Array} messages - 消息数组
 * @returns {Array} 格式化后的消息
 */
export function formatGeminiMessages(messages) {
  return messages
    .filter(msg => msg.content && msg.content.trim())
    .map(msg => ({
      parts: [{ text: msg.content }],
      role: msg.role === 'user' ? 'user' : 'model'
    }));
}

/**
 * 解析Gemini API错误
 * @param {Error} error - 错误对象
 * @returns {String} 用户友好的错误信息
 */
export function parseGeminiError(error) {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('400')) {
    if (errorMessage.includes('api_key')) {
      return 'API密钥格式错误或无效';
    }
    if (errorMessage.includes('safety')) {
      return '消息内容触发了安全过滤器，请修改内容后重试';
    }
    return '请求参数错误，请检查消息格式';
  }
  
  if (errorMessage.includes('401')) {
    return 'API密钥无效，请检查配置文件中的API_KEY';
  }
  
  if (errorMessage.includes('403')) {
    return 'API访问被拒绝，请检查API密钥权限或配额';
  }
  
  if (errorMessage.includes('429')) {
    return 'API请求频率过高，请稍后重试';
  }
  
  if (errorMessage.includes('500')) {
    return 'Gemini服务器内部错误，请稍后重试';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return '网络连接失败，请检查网络连接或代理设置';
  }
  
  return error.message;
}

/**
 * 获取Gemini API使用建议
 * @returns {Array} 建议列表
 */
export function getGeminiUsageTips() {
  return [
    '确保API Key正确配置且有效',
    '检查网络连接，Gemini API需要科学上网',
    '避免发送空消息或过长的消息',
    '注意API调用频率限制',
    '检查消息内容是否触发安全过滤器',
    '确保使用正确的模型名称（gemini-2.0-flash-exp）'
  ];
}