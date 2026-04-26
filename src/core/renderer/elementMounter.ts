/**
 * 元素挂载器 - 处理 HTML/SVG 元素的挂载逻辑
 * 
 * 参照 Vue 3 源码及《Vue.js 设计与实现》设计
 */

import { VNode } from './types'
import { setElementProps } from './propsSetter'
import { mount } from './mount'

/**
 * 递归扁平化并挂载子节点
 * @param children 子节点数组
 * @param parentEl 父元素
 */
export function mountChildren(children: Array<VNode | string | null | undefined>, parentEl: HTMLElement | SVGElement): void {
  children.forEach((child: VNode | string | null | undefined) => {
    // 过滤掉 null 和 undefined（来自 v-if 返回的 null）
    if (child === null || child === undefined) {
      return;
    }
    
    // 如果子节点是数组，递归扁平化（处理 v-for 生成的嵌套数组）
    if (Array.isArray(child)) {
      mountChildren(child, parentEl);
    } 
    // 如果子节点是字符串，直接创建文本节点
    else if (typeof child === 'string') {
      parentEl.appendChild(document.createTextNode(child));
    } 
    // 否则递归挂载 VNode
    else {
      mount(child as VNode, parentEl);
    }
  });
}

/**
 * 挂载 HTML/SVG 元素
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 * @param anchor 锚点节点（用于插入位置控制）
 */
export function mountElement(vnode: VNode, container: HTMLElement | SVGElement, anchor: Node | null = null): void {
  // 判断是否为 SVG 容器或自身就是 svg 标签
  const isSvg = vnode.type === 'svg' || container.tagName.toLowerCase() === 'svg';
  
  if (typeof vnode.type === 'string') {
    // 创建元素时判断是否为 SVG
    const el = isSvg 
      ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
      : document.createElement(vnode.type);
    
    vnode.el = el as HTMLElement | SVGElement;
    
    // 设置属性
    if (vnode.props) {
      for (const key in vnode.props) {
        // 🔥 关键修复：key 是 Vue 内部使用的特殊属性，不应该渲染到 DOM
        if (key === 'key') {
          vnode.key = vnode.props[key];
          continue; // 跳过，不设置为 DOM 属性
        }
        
        setElementProps(el, key, vnode.props[key]);
      }
    }
    
    // 处理子节点
    if (vnode.children) {
      if (typeof vnode.children === 'string') {
        el.textContent = vnode.children;
      } else if (Array.isArray(vnode.children)) {
        mountChildren(vnode.children, el);
      }
    }
    
    // 插入到容器中
    if (anchor) {
      container.insertBefore(el as Node, anchor);
    } else {
      container.appendChild(el as Node);
    }
  }
}
