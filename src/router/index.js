// 路由初始化: 创建并配置 Vue Router 实例
// 路由模式: 使用 HTML5 History 模式，支持 SEO
// 滚动控制: 路由切换时自动滚动到页面顶部
// 导航守卫: 提供了前置守卫和后置钩子的框架
// 页面标题管理: 根据路由元信息动态设置页面标题
// 模块化设计: 路由配置独立在 index.js 文件中


// 导入router所需的方法
import { createRouter, createWebHistory } from "vue-router";
// 导入路由页面的配置
import routes from "./routes";

// 路由参数配置
const router = createRouter({
  // 使用hash(createWebHashHistory)模式，(createWebHistory是HTML5历史模式，支持SEO)
  // 设置base路径以支持二级目录部署
  history: createWebHistory('/'),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 始终滚动到顶部
    return { top: 0 };
  },
});

// 全局前置守卫，这里可以加入用户登录判断
router.beforeEach((to, from, next) => {
  // 继续前进 next()
  // 返回 false 以取消导航
  next();
});

// // 全局后置钩子，这里可以加入改变页面标题等操作
router.afterEach((to, from) => {
  const _title = to.meta.title;
  if (_title) {
    window.document.title = _title;
  }
});

// 导出默认值
export default router;
