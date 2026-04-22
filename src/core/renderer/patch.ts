import { VNode, ComponentInternalInstance, Fragment, ShapeFlags } from './types'
import { triggerUnmounted } from '../reactivity/reactive'
import { mount } from './mount'
import { patchProp } from './patchProp'

/**
 * 更新虚拟 DOM（核心 patch 函数）
 * @param oldVnode 旧的虚拟 DOM 节点
 * @param newVnode 新的虚拟 DOM 节点
 * @param container 容器元素
 * @param anchor 锚点
 */
export function patch(
  oldVnode: VNode | null,
  newVnode: VNode,
  container: Element | null = null,
  anchor: Node | null = null
): void {
  // 如果新旧 vnode 类型不同，直接替换
  if (oldVnode && oldVnode.type !== newVnode.type) {
    unmount(oldVnode)
    oldVnode = null
  }
  
  // 如果旧 vnode 为 null，执行挂载
  if (!oldVnode) {
    mount(newVnode, container!, anchor)
    return
  }
  
  // 相同的 vnode，执行更新
  const { type, shapeFlag } = newVnode
  
  // 处理组件
  if (shapeFlag && shapeFlag & ShapeFlags.COMPONENT) {
    processComponent(oldVnode, newVnode, container, anchor)
    return
  }
  
  // 处理元素
  if (typeof type === 'string') {
    processElement(oldVnode, newVnode, container, anchor)
    return
  }
  
  // 处理 Fragment
  if (type === Fragment) {
    processFragment(oldVnode, newVnode, container, anchor)
    return
  }
}

/**
 * 处理组件更新
 */
function processComponent(
  oldVnode: VNode,
  newVnode: VNode,
  container: Element | null,
  anchor: Node | null
) {
  if (!oldVnode.component) {
    // 新组件，执行挂载
    mount(newVnode, container!, anchor)
  } else {
    // 更新现有组件
    updateComponent(oldVnode.component, newVnode)
  }
}

/**
 * 更新组件
 */
function updateComponent(instance: ComponentInternalInstance, newVnode: VNode) {
  // 更新 vnode 引用
  instance.vnode = newVnode
  
  // 触发组件的 effect 重新渲染
  instance.update()
}

/**
 * 处理元素更新
 */
function processElement(
  oldVnode: VNode,
  newVnode: VNode,
  container: Element | null,
  anchor: Node | null
) {
  const el = (newVnode.el = oldVnode.el!)
  
  // 更新属性
  patchProps(el as Element, oldVnode.props, newVnode.props)
  
  // 更新子节点
  patchChildren(oldVnode, newVnode, el as Element, anchor)
}

/**
 * 处理 Fragment 更新
 */
function processFragment(
  oldVnode: VNode,
  newVnode: VNode,
  container: Element | null,
  anchor: Node | null
) {
  const oldChildren = oldVnode.children as any[]
  const newChildren = newVnode.children as any[]
  
  // Fragment 没有实际 DOM，使用容器
  const hostParent = container || (oldVnode.el as any)?.parentNode
  
  if (!hostParent) {
    console.warn('Fragment has no parent container')
    return
  }
  
  patchKeyedChildren(
    oldChildren,
    newChildren,
    hostParent as Element,
    anchor
  )
  
  newVnode.el = oldVnode.el
}

/**
 * 更新属性
 */
function patchProps(el: Element, oldProps: any, newProps: any) {
  if (oldProps === newProps) return
  
  oldProps = oldProps || {}
  newProps = newProps || {}
  
  // 设置新属性
  for (const key in newProps) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]
    
    if (oldValue !== newValue) {
      patchProp(el, key, oldValue, newValue)
    }
  }
  
  // 移除旧属性
  for (const key in oldProps) {
    if (!(key in newProps)) {
      patchProp(el, key, oldProps[key], null)
    }
  }
}

/**
 * 更新子节点
 */
function patchChildren(
  oldVnode: VNode,
  newVnode: VNode,
  container: Element,
  anchor: Node | null
) {
  const oldChildren = oldVnode.children
  const newChildren = newVnode.children
  
  const oldShapeFlag = oldVnode.shapeFlag || 0
  const newShapeFlag = newVnode.shapeFlag || 0
  
  // 新 children 是数组
  if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 旧 children 也是数组，执行 diff
    if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      patchKeyedChildren(
        oldChildren as any[],
        newChildren as any[],
        container,
        anchor
      )
    } else {
      // 旧 children 是文本或空，先清空再挂载
      unmountChildren(oldChildren as any[])
      mountChildren(newChildren as any[], container, anchor)
    }
  } 
  // 新 children 是文本
  else if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 旧 children 是数组，先卸载
    if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(oldChildren as any[])
    }
    
    // 设置文本内容
    if (oldVnode.children !== newVnode.children) {
      container.textContent = String(newVnode.children)
    }
  }
  // 新 children 为空
  else {
    // 旧 children 是数组，卸载
    if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(oldChildren as any[])
    } else if (oldShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      container.textContent = ''
    }
  }
}

/**
 * 挂载子节点数组
 */
function mountChildren(children: any[], container: Element, anchor: Node | null) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (child == null || typeof child === 'boolean') {
      continue
    }
    
    if (typeof child === 'string' || typeof child === 'number') {
      const textNode = document.createTextNode(String(child))
      container.insertBefore(textNode, anchor)
    } else {
      mount(child as VNode, container, anchor)
    }
  }
}

/**
 * 卸载子节点数组
 */
function unmountChildren(children: any[]) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (child && typeof child === 'object' && 'el' in child) {
      unmount(child as VNode)
    }
  }
}

/**
 * 带 key 的子节点 diff 算法（简化版）
 */
function patchKeyedChildren(
  oldChildren: any[],
  newChildren: any[],
  container: Element,
  anchor: Node | null
) {
  let i = 0
  const oldLength = oldChildren.length
  const newLength = newChildren.length
  
  // 1. 从头开始同步
  while (i < oldLength && i < newLength) {
    const oldChild = oldChildren[i]
    const newChild = newChildren[i]
    
    if (isSameVNodeType(oldChild, newChild)) {
      patch(oldChild, newChild, container, anchor)
    } else {
      break
    }
    
    i++
  }
  
  // 2. 从尾开始同步
  let oldEnd = oldLength - 1
  let newEnd = newLength - 1
  
  while (oldEnd >= i && newEnd >= i) {
    const oldChild = oldChildren[oldEnd]
    const newChild = newChildren[newEnd]
    
    if (isSameVNodeType(oldChild, newChild)) {
      patch(oldChild, newChild, container, anchor)
    } else {
      break
    }
    
    oldEnd--
    newEnd--
  }
  
  // 3. 旧节点多于新节点，卸载多余节点
  if (i > oldEnd && i <= newEnd) {
    // 新增节点
    const nextPos = newEnd + 1
    const nextAnchor = nextPos < newLength ? (newChildren[nextPos] as VNode).el || null : anchor
    
    while (i <= newEnd) {
      mount(newChildren[i] as VNode, container, nextAnchor)
      i++
    }
  } 
  // 4. 新节点多于旧节点，挂载新节点
  else if (i > newEnd && i <= oldEnd) {
    // 卸载节点
    while (i <= oldEnd) {
      unmount(oldChildren[i] as VNode)
      i++
    }
  }
  // 5. 中间部分需要 diff
  else {
    const oldStart = i
    const newStart = i
    
    // 创建旧节点的 key 映射
    const keyToIndexMap = new Map()
    for (let k = oldStart; k <= oldEnd; k++) {
      const oldChild = oldChildren[k]
      if (oldChild && oldChild.key != null) {
        keyToIndexMap.set(oldChild.key, k)
      }
    }
    
    // 遍历新节点
    for (let k = newStart; k <= newEnd; k++) {
      const newChild = newChildren[k] as VNode
      
      if (newChild.key != null && keyToIndexMap.has(newChild.key)) {
        // 找到对应的旧节点
        const oldIndex = keyToIndexMap.get(newChild.key)
        const oldChild = oldChildren[oldIndex]
        
        // 移动节点
        patch(oldChild, newChild, container, anchor)
        oldChildren[oldIndex] = null as any
      } else {
        // 新节点，挂载
        mount(newChild, container, anchor)
      }
    }
    
    // 卸载剩余的旧节点
    for (let k = oldStart; k <= oldEnd; k++) {
      if (oldChildren[k]) {
        unmount(oldChildren[k] as VNode)
      }
    }
  }
}

/**
 * 判断两个 vnode 是否相同类型
 */
function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * 卸载 vnode
 */
function unmount(vnode: VNode) {
  if (!vnode.el) return
  
  // 如果是组件，触发 onUnmounted
  if (vnode.component) {
    triggerUnmounted()
  }
  
  // 移除 DOM 元素
  const parent = vnode.el.parentNode
  if (parent) {
    parent.removeChild(vnode.el)
  }
  
  // 递归卸载子节点
  if (Array.isArray(vnode.children)) {
    unmountChildren(vnode.children)
  }
}
