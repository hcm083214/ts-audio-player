import { VNode } from './types'
import { mount } from './mount'
import { patch } from './patch'

/**
 * 渲染虚拟 DOM 到真实 DOM
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 */
export function render(vnode: VNode, container: Element): void {
  if (container.firstChild) {
    patch((container as any)._vnode, vnode)
  } else {
    mount(vnode, container)
  }
  (container as any)._vnode = vnode
}
