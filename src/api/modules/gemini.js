//封装 Google Gemini 模型的 API 请求
import request from "@/api/request";
import { API_CONFIG } from "@/config/gemini";

export function generateContent(param) {
  return request({
    url: API_CONFIG.baseURL,
    method: "post",
    data: {
      contents: [{
        parts: [{ text: param.prompt }]
      }]
    }
  });
}