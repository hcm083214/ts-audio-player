import { VNode } from './types'
import { mount } from './mount'
import { patch } from './patch'

/**
 * 渲染虚拟 DOM 到真实 DOM
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 */
export function render(vnode: VNode, container: Element): void {
  if (!vnode) {
    // 清空容器
    container.innerHTML = ''
    return
  }
  
  const oldVnode = (container as any)._vnode || null
  
  // 执行 patch
  patch(oldVnode, vnode, container, null)
  
  // 保存当前 vnode
  ;(container as any)._vnode = vnode
}
