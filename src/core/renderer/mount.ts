/**
 * 挂载虚拟 DOM 到真实 DOM（主入口）
 * 
 * 参照 Vue 3 源码及《Vue.js 设计与实现》设计
 * 模块化架构：componentMounter + elementMounter + propsSetter
 */

import { VNode } from './types'
import { mountObjectComponent, mountFunctionalComponent } from './componentMounter'
import { mountElement } from './elementMounter'

/**
 * 挂载虚拟 DOM 到真实 DOM
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 * @param anchor 锚点节点（用于插入位置控制）
 */
export function mount(vnode: VNode, container: HTMLElement | SVGElement, anchor: Node | null = null): void {
  // 先检查 vnode 是否为空
  if (!vnode) {
    return;
  }
  
  // 处理对象式组件（Options API）
  if (typeof vnode.type === 'object' && vnode.type !== null) {
    mountObjectComponent(vnode, container, anchor);
    return;
  }

  // 处理函数式组件
  if (typeof vnode.type === 'function') {
    mountFunctionalComponent(vnode, container, anchor);
    return;
  }

  // 处理 HTML/SVG 元素
  if (typeof vnode.type === 'string') {
    mountElement(vnode, container, anchor);
  }
}
