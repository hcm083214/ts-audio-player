/**
 * Class 规范化工具函数 - 参考《Vue.js 设计与实现》第 7.7 节
 * 用于规范化 class 值，支持字符串、对象、数组等多种格式
 */

/**
 * normalizeClass 辅助函数
 * 用于规范化 class 值，支持字符串、对象、数组等多种格式
 */
export function normalizeClass(value: unknown): string {
  if (!value) return '';
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (Array.isArray(value)) {
    // 数组：递归处理每个元素，然后合并
    return value.map(item => normalizeClass(item)).filter(Boolean).join(' ');
  }
  
  if (typeof value === 'object') {
    // 对象：{ className: boolean }
    const obj = value as Record<string, unknown>;
    let result = '';
    for (const key in obj) {
      if (obj[key]) {
        result += (result ? ' ' : '') + key;
      }
    }
    return result;
  }
  
  return String(value);
}