import { VNode, ComponentInstance, Fragment } from './types'
import { reactive, triggerUnmounted } from './reactive'
import { mount } from './mount'
import { patchProp } from './patchProp'

/**
 * 更新虚拟 DOM
 * @param oldVnode 旧的虚拟 DOM 节点
 * @param newVnode 新的虚拟 DOM 节点
 */
export function patch(oldVnode: VNode, newVnode: VNode): void {
  // 🔥 关键修复：添加空值检查，防止 v-if 返回 null 时导致错误
  if (!oldVnode || !newVnode) {
    return
  }
  
  if (oldVnode.type !== newVnode.type) {
    const parent = oldVnode.el?.parentNode
    
    // 🔥 如果是组件，触发 onUnmounted 回调
    if (typeof oldVnode.type === 'object' && 'setup' in oldVnode.type) {
      triggerUnmounted()
    }
    
    if (parent) {
      parent.removeChild(oldVnode.el!)
      mount(newVnode, parent as Element)
    }
    return
  }

  // 🔥 组件节点：复制组件实例并更新 props
  if (typeof oldVnode.type === 'object' && 'setup' in oldVnode.type) {
    newVnode.component = oldVnode.component
    newVnode.component!.props = reactive(newVnode.props || {})
    return
  }

  // 🔥 修复组件更新逻辑：当检测到是组件时，需要触发重新渲染
  if (typeof oldVnode.type === 'object' && 'setup' in oldVnode.type) {
    const component = oldVnode.component!
    
    // 更新 props（如果有变化）
    if (newVnode.props !== oldVnode.props) {
      component.props = newVnode.props || {}
    }
    
    // 🔥 关键修复：重新执行 render 函数来触发响应式更新
    // 这会重新收集依赖并触发受影响的 effect
    const subTree = component.render()
    
    // patch 新旧子树
    patch(component.subTree!, subTree)
    
    // 更新 VNode 的子树引用和 el 引用
    oldVnode.el = subTree.el
    newVnode.el = subTree.el
    
    // 更新 component 的 subTree
    component.subTree = subTree
    
    return
  }

  // 🔥 关键修复：处理 Fragment 节点
  if (oldVnode.type === Fragment) {
    // Fragment 没有实际的 DOM 元素，直接更新子节点
    const oldChildren = Array.isArray(oldVnode.children) ? oldVnode.children : []
    const newChildren = Array.isArray(newVnode.children) ? newVnode.children : []
    
    // Fragment 使用父容器的引用
    const container = oldVnode.el as any as Element
    
    const minLength = Math.min(oldChildren.length, newChildren.length)

    for (let i = 0; i < minLength; i++) {
      const oldChild = oldChildren[i]
      const newChild = newChildren[i]
      
      // 处理字符串类型的子节点
      if (typeof oldChild === 'string' && typeof newChild === 'string') {
        if (oldChild !== newChild) {
          const textNode = document.createTextNode(newChild)
          const oldTextNode = container.childNodes[i]
          if (oldTextNode.nodeType === Node.TEXT_NODE) {
            container.replaceChild(textNode, oldTextNode)
          }
        }
      } else if (typeof oldChild === 'string' && typeof newChild !== 'string') {
        const oldTextNode = container.childNodes[i]
        if (oldTextNode.nodeType === Node.TEXT_NODE) {
          container.removeChild(oldTextNode)
        }
        mount(newChild, container)
      } else if (typeof oldChild !== 'string' && typeof newChild === 'string') {
        const textNode = document.createTextNode(newChild)
        const oldEl = (oldChild as VNode).el
        if (oldEl) {
          container.replaceChild(textNode, oldEl)
        }
      } else {
        patch(oldChild as VNode, newChild as VNode)
      }
    }

    // 添加新子节点
    if (newChildren.length > oldChildren.length) {
      for (let i = minLength; i < newChildren.length; i++) {
        const newChild = newChildren[i]
        if (typeof newChild === 'string') {
          container.appendChild(document.createTextNode(newChild))
        } else {
          mount(newChild, container)
        }
      }
    }

    // 移除旧子节点
    if (newChildren.length < oldChildren.length) {
      for (let i = minLength; i < oldChildren.length; i++) {
        const oldChild = oldChildren[i]
        if (typeof oldChild === 'string') {
          const textNode = container.childNodes[i]
          if (textNode.nodeType === Node.TEXT_NODE) {
            container.removeChild(textNode)
          }
        } else if ((oldChild as VNode).el) {
          container.removeChild((oldChild as VNode).el!)
        }
      }
    }
    
    return
  }

  const el = oldVnode.el as Element
  newVnode.el = el

  if (typeof newVnode.children === 'string') {
    if (oldVnode.children !== newVnode.children) {
      el.textContent = newVnode.children
    }
  } else {
    // 更新属性
    for (const [key, value] of Object.entries(newVnode.props || {})) {
      if (oldVnode.props?.[key] !== value) {
        patchProp(el, key, oldVnode.props?.[key], value)
      }
    }

    // 移除旧属性
    for (const key of Object.keys(oldVnode.props || {})) {
      if (!(key in (newVnode.props || {}))) {
        patchProp(el, key, oldVnode.props?.[key], null)
      }
    }

    // 更新子节点
    const oldChildren = Array.isArray(oldVnode.children) ? oldVnode.children : []
    const newChildren = Array.isArray(newVnode.children) ? newVnode.children : []
    const minLength = Math.min(oldChildren.length, newChildren.length)

    for (let i = 0; i < minLength; i++) {
      const oldChild = oldChildren[i]
      const newChild = newChildren[i]
      
      // 处理字符串类型的子节点
      if (typeof oldChild === 'string' && typeof newChild === 'string') {
        if (oldChild !== newChild) {
          const textNode = document.createTextNode(newChild)
          const oldTextNode = el.childNodes[i]
          if (oldTextNode.nodeType === Node.TEXT_NODE) {
            el.replaceChild(textNode, oldTextNode)
          }
        }
      } else if (typeof oldChild === 'string' && typeof newChild !== 'string') {
        const oldTextNode = el.childNodes[i]
        if (oldTextNode.nodeType === Node.TEXT_NODE) {
          el.removeChild(oldTextNode)
        }
        mount(newChild, el)
      } else if (typeof oldChild !== 'string' && typeof newChild === 'string') {
        const textNode = document.createTextNode(newChild)
        const oldEl = (oldChild as VNode).el
        if (oldEl) {
          el.replaceChild(textNode, oldEl)
        }
      } else {
        patch(oldChild as VNode, newChild as VNode)
      }
    }

    // 添加新子节点
    if (newChildren.length > oldChildren.length) {
      for (let i = minLength; i < newChildren.length; i++) {
        const newChild = newChildren[i]
        if (typeof newChild === 'string') {
          el.appendChild(document.createTextNode(newChild))
        } else {
          mount(newChild, el)
        }
      }
    }

    // 移除旧子节点
    if (newChildren.length < oldChildren.length) {
      for (let i = minLength; i < oldChildren.length; i++) {
        const oldChild = oldChildren[i]
        if (typeof oldChild === 'string') {
          const textNode = el.childNodes[i]
          if (textNode.nodeType === Node.TEXT_NODE) {
            el.removeChild(textNode)
          }
        } else if ((oldChild as VNode).el) {
          el.removeChild((oldChild as VNode).el!)
        }
      }
    }
  }
}
