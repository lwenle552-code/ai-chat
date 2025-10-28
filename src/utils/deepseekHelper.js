// DeepSeek API 辅助工具函数
import { API_CONFIG, MODEL_CONFIG } from "@/config/deepseek";

/**
 * 验证DeepSeek API配置
 * @returns {Object} 验证结果
 */
export function validateDeepSeekConfig() {
  const errors = [];
  const warnings = [];

  // 检查API Key
  if (!API_CONFIG.apiKey || API_CONFIG.apiKey === "YOUR_API_KEY") {
    errors.push("API Key未配置或使用默认值");
  }

  // 检查baseURL
  if (!API_CONFIG.baseURL || !API_CONFIG.baseURL.includes("deepseek.com")) {
    errors.push("baseURL配置错误");
  }

  // 检查模型配置
  if (!MODEL_CONFIG) {
    warnings.push("缺少MODEL_CONFIG配置");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 测试DeepSeek API连接
 * @returns {Promise<Object>} 测试结果
 */
export async function testDeepSeekConnection() {
  try {
    // 构建符合DeepSeek API要求的请求体
    const testMessage = {
      model: "deepseek-chat", // 必需的模型参数
      messages: [
        {
          role: "user",
          content: "你好",
        },
      ],
      max_tokens: 10,
      temperature: 0.7,
      ...MODEL_CONFIG, // 合并其他模型配置
    };

    const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_CONFIG.apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(testMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      message: "DeepSeek API连接成功",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "DeepSeek API连接失败",
    };
  }
}

/**
 * 解析DeepSeek API错误
 * @param {Error} error - 错误对象
 * @returns {String} 用户友好的错误信息
 */
export function parseDeepSeekError(error) {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes("400")) {
    return "请求参数错误，请检查API配置和消息格式";
  }

  if (errorMessage.includes("401")) {
    return "API密钥无效，请检查配置文件中的API_KEY";
  }

  if (errorMessage.includes("403")) {
    return "API访问被拒绝，请检查API密钥权限或配额";
  }

  if (errorMessage.includes("429")) {
    return "API请求频率过高，请稍后重试";
  }

  if (errorMessage.includes("500")) {
    return "DeepSeek服务器内部错误，请稍后重试";
  }

  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "网络连接失败，请检查网络连接";
  }

  return error.message;
}

/**
 * 获取DeepSeek API使用建议
 * @returns {Array} 建议列表
 */
export function getDeepSeekUsageTips() {
  return [
    "确保API Key正确配置且有效",
    "检查网络连接",
    "避免发送空消息或过长的消息",
    "注意API调用频率限制",
    "确保使用正确的模型端点",
  ];
}
