/**
 * 防抖函数
 * @param {Function} fn 需要防抖的函数
 * @param {number} delay 延迟时间，单位毫秒
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn 需要节流的函数
 * @param {number} limit 限制时间，单位毫秒
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, limit) {
  let lastFn;
  let lastRan;
  return function (...args) {
    if (!lastRan) {
      fn.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          fn.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * 计算元素是否在可视区域内
 * @param {HTMLElement} el 需要检查的元素
 * @param {number} offset 偏移量
 * @returns {boolean} 是否在可视区域内
 */
export function isInViewport(el, offset = 0) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 - offset &&
    rect.left >= 0 &&
    rect.bottom <=
    (window.innerHeight || document.documentElement.clientHeight) + offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 平滑滚动到指定元素
 * @param {HTMLElement} element 目标元素
 * @param {Object} options 滚动选项
 */
export function smoothScrollTo(element, options = {}) {
  if (!element) return;
  element.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    ...options,
  });
}
