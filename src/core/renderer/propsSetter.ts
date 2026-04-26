/**
 * 属性设置器 - 处理 DOM 元素的属性绑定
 * 
 * 参照 Vue 3 源码及《Vue.js 设计与实现》设计
 */

import { normalizeClass } from '../compiler/normalizeClass'

/**
 * 设置元素属性
 * @param el DOM 元素
 * @param key 属性名
 * @param value 属性值
 * @param prevValue 上一个属性值（用于事件解绑）
 */
export function setElementProps(el: HTMLElement | SVGElement, key: string, value: any, prevValue?: any): void {
  if (key.startsWith('on')) {
    // 事件绑定
    const event = key.slice(2).toLowerCase();
    if (prevValue) el.removeEventListener(event, prevValue as EventListener);
    if (value) el.addEventListener(event, value as EventListener);
  } else if (key === 'class') {
    // SVG 元素的 className 是只读的，必须使用 setAttribute
    // 先规范化 class 值（支持字符串、对象、数组）
    const normalizedClass = normalizeClass(value);
    if (el instanceof SVGElement) {
      el.setAttribute('class', normalizedClass);
    } else {
      (el as HTMLElement).className = normalizedClass;
    }
  } else if (key === 'style') {
    // style 可能是字符串或对象
    if (typeof value === 'string') {
      (el as HTMLElement).style.cssText = value;
    } else if (typeof value === 'object') {
      Object.assign((el as HTMLElement).style, value);
    }
  } else {
    // 🔥 关键修复：参照 Vue 3 源码，处理 SVG 命名空间属性
    // xlink:href 等属性必须使用 setAttributeNS
    if (el instanceof SVGElement && key.includes(':')) {
      const [prefix, localName] = key.split(':');
      
      if (prefix === 'xlink') {
        // xlink:href 需要使用 xlink 命名空间
        el.setAttributeNS('http://www.w3.org/1999/xlink', localName, String(value ?? ''));
      } else if (prefix === 'xml') {
        // xml 属性使用 xml 命名空间
        el.setAttributeNS('http://www.w3.org/XML/1998/namespace', localName, String(value ?? ''));
      } else if (prefix === 'xmlns') {
        // xmlns 属性使用 xmlns 命名空间
        el.setAttributeNS('http://www.w3.org/2000/xmlns/', localName, String(value ?? ''));
      } else {
        // 其他命名空间属性
        el.setAttribute(key, String(value ?? ''));
      }
    } else {
      // 清理属性值中可能的多余引号
      let cleanValue = value;
      if (typeof value === 'string' && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
        cleanValue = value.slice(1, -1);
      }
      // 普通 HTML 元素或非命名空间属性
      el.setAttribute(key, String(cleanValue ?? ''));
    }
  }
}
