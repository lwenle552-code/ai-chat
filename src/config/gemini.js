//Google Gemini 模型的 API 配置（包含安全设置、生成参数等）
// gemini2.0配置文件
const API_KEY = ""; // 换成自己的apiiKey
export const API_CONFIG = {
  baseURL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true, // 修正拼写错误
};

// 模型配置 - 添加必要的配置参数
export const MODEL_CONFIG = {
  generationConfig: {
    maxOutputTokens: 8192, // 限制一次请求中模型生成 completion 的最大 token 数
    temperature: 0.7, // 严谨与想象 越低越严谨 官方建议0.6-0.9
    topP: 0.8,
    topK: 40,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
};
