//通用请求工具（基于 axios 封装，处理请求拦截、响应处理等）
//AI 模型请求独立于通用 service），通用 service 上的请求拦截器和响应拦截器只对您项目中的普通业务接口请求起作用
import axios from "axios"; // 引入 axios 库，用于发起 HTTP 请求

// 创建一个 axios 实例
const service = axios.create({
  timeout: 120000, // 请求超时时间设置为 120000 毫秒（2分钟）
  headers: {
    "Content-Type": "application/json", // 设置默认请求头的内容类型为 JSON 格式
  },
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // ---------------- DeepSeek-GPT 特殊处理 ----------------
    // 检查请求参数或数据中是否包含 deepseek: "Y" 的标志
    if (config.params.deepseek == "Y" || config.data.deepseek == "Y") {
      // 如果是 DeepSeek-GPT 请求，则从 params 或 data 中获取 GPT 令牌
      const token = config.params.gptToken || config.data.gptToken;
      // 将 GPT 令牌添加到请求头的 Authorization 字段，格式为 Bearer Token
      config.headers["Authorization"] = "Bearer " + token;
    }
    // ---------------- 普通的接口请求处理 ----------------
    // 检查 sessionStorage 中是否存在 "token"
    if (sessionStorage.getItem("token")) {
      // 如果存在，则获取普通的用户身份令牌
      const token = sessionStorage.getItem("token");
      // 将普通令牌添加到请求头的 Authorization 字段（注意：如果前面 DeepSeek-GPT 已经设置了，这里会覆盖）
      // 实际应用中，如果 DeepSeek-GPT 请求不需要普通 token，此逻辑应调整为仅在非 DeepSeek-GPT 请求时执行。
      config.headers["Authorization"] = "Bearer " + token;
    }
    // 返回修改后的请求配置
    return config;
  },
  (error) => {
    // 对请求错误做些什么，直接返回一个被拒绝的 Promise
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 成功响应的处理：直接返回响应体中的数据（response.data），省略掉其他如 headers/status 等信息
    return response.data;
  },
  (error) => {
    // 对响应错误做些什么
    if (error.response) {
      // 检查是否有响应对象
      // 假设服务器返回的错误状态码为 0（在某些跨域或网络错误时可能会出现）
      if (error.request.status == 0) {
        // 重写错误信息，提示服务器可能存在问题
        error.message = "服务器发生错误，请检查服务器。";
      }
      // 可以在此处处理其他常见的 HTTP 错误码（如 401、403、500 等）
    }
    // 返回一个被拒绝的 Promise，将错误信息传递给调用者
    return Promise.reject(error);
  }
);

// 导出封装好的 axios 实例，供其他模块调用
export default service;
