//封装 DeepSeek 模型的 API 请求
import request from "@/api/request";
import { data } from "../../../public/server"; // /public/server
const baseUrl = data.deepseekUrl; // 添加代理(本地在vite.config.js添加，服务器在nginx添加)

export function getTokens(param) {
  return request({
    url: baseUrl + "/user/balance",
    method: "get",
    params: param,
  });
}
