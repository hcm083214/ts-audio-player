import { effect, reactive } from './reactive'

// 虚拟 DOM 节点类型
type VNodeType = string | typeof Fragment | Component

// 组件类型
interface Component {
  setup?: (props: any) => any
  render?: (...args: any[]) => VNode
  props?: string[]
  emits?: string[]
}

// 虚拟 DOM 节点
export interface VNode {
  type: VNodeType
  props: Record<string, any>
  children: VNode[] | string
  el?: Element
  component?: ComponentInstance
}

// 组件实例
interface ComponentInstance {
  vnode: VNode
  props: Record<string, any>
  setupState: any
  render: (...args: any[]) => VNode
  isMounted: boolean
  subTree: VNode | null
}

// 片段类型
const Fragment = Symbol('Fragment')

// 创建虚拟 DOM 节点
function h(type: VNodeType, props: Record<string, any> = {}, children: VNode[] | string = []) {
  return {
    type,
    props,
    children
  }
}

// 渲染虚拟 DOM 到真实 DOM
function render(vnode: VNode, container: Element) {
  if (container.firstChild) {
    patch((container as any)._vnode, vnode)
  } else {
    mount(vnode, container)
  }
  (container as any)._vnode = vnode
}

// 挂载虚拟 DOM
function mount(vnode: VNode, container: Element) {
  if (typeof vnode.type === 'object' && 'setup' in vnode.type) {
    mountComponent(vnode, container)
    return
  }

  if (typeof vnode.children === 'string') {
    // 文本节点
    const textNode = document.createTextNode(vnode.children)
    vnode.el = textNode as any
    container.appendChild(textNode)
    return
  }

  if (vnode.type === Fragment) {
    // 片段节点
    vnode.el = container as any
    vnode.children.forEach(child => {
      // 处理字符串类型的子节点（文本节点）
      if (typeof child === 'string') {
        const textNode = document.createTextNode(child)
        container.appendChild(textNode)
      } else if (child) {
        mount(child, container)
      }
    })
    return
  }

  // 元素节点
  const element = document.createElement(vnode.type as string)
  vnode.el = element

  // 设置属性
  for (const [key, value] of Object.entries(vnode.props || {})) {
    patchProp(element, key, null, value)
  }

  // 挂载子节点
  if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => {
      // 处理字符串类型的子节点（文本节点）
      if (typeof child === 'string') {
        const textNode = document.createTextNode(child)
        element.appendChild(textNode)
      } else if (child) {
        mount(child, element)
      }
    })
  }

  container.appendChild(element)
}

// 挂载组件
function mountComponent(vnode: VNode, container: Element) {
  const component = vnode.type as Component
  const props = vnode.props || {}

  const instance: ComponentInstance = {
    vnode,
    props: reactive(props),
    setupState: null,
    render: () => null as any,
    isMounted: false,
    subTree: null
  }

  vnode.component = instance

  if (component.setup) {
    instance.setupState = component.setup(instance.props)
  }

  // 优先使用 render 函数，如果没有则尝试从 template 编译
  if (component.render) {
    instance.render = component.render
  } else if ((component as any).template) {
    // 如果有 template 但没有 render，说明需要编译
    // 这里需要在构建时通过插件处理，运行时无法动态编译
    console.warn('Component has template but no render function. Please use compileComponent() to compile it first.')
  }

  effect(() => {
    if (!instance.isMounted) {
      const subTree = instance.render(instance.props, instance.setupState)
      instance.subTree = subTree
      mount(subTree, container)
      vnode.el = subTree.el
      instance.isMounted = true
    } else {
      const subTree = instance.render(instance.props, instance.setupState)
      patch(instance.subTree!, subTree)
      instance.subTree = subTree
      vnode.el = subTree.el
    }
  })
}

// 更新虚拟 DOM
function patch(oldVnode: VNode, newVnode: VNode) {
  if (oldVnode.type !== newVnode.type) {
    const parent = oldVnode.el?.parentNode
    if (parent) {
      parent.removeChild(oldVnode.el!)
      mount(newVnode, parent as Element)
    }
    return
  }

  if (typeof oldVnode.type === 'object' && 'setup' in oldVnode.type) {
    newVnode.component = oldVnode.component
    newVnode.component!.props = reactive(newVnode.props || {})
    return
  }

  const el = oldVnode.el as Element
  newVnode.el = el

  if (typeof newVnode.children === 'string') {
    if (oldVnode.children !== newVnode.children) {
      el.textContent = newVnode.children
    }
  } else {
    for (const [key, value] of Object.entries(newVnode.props || {})) {
      if (oldVnode.props?.[key] !== value) {
        patchProp(el, key, oldVnode.props?.[key], value)
      }
    }

    for (const key of Object.keys(oldVnode.props || {})) {
      if (!(key in (newVnode.props || {}))) {
        patchProp(el, key, oldVnode.props?.[key], null)
      }
    }

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

// 更新属性
function patchProp(el: Element, key: string, oldValue: any, newValue: any) {
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase()
    if (oldValue) {
      el.removeEventListener(eventName, oldValue)
    }
    if (newValue) {
      el.addEventListener(eventName, newValue)
    }
  } else if (key === 'className') {
    el.className = newValue || ''
  } else if (key === 'style') {
    if (typeof newValue === 'string') {
      (el as HTMLElement).style.cssText = newValue
    } else if (typeof newValue === 'object') {
      const style = (el as HTMLElement).style
      if (typeof oldValue === 'object') {
        for (const key in oldValue) {
          style.setProperty(key, '')
        }
      }
      for (const key in newValue) {
        style.setProperty(key, newValue[key])
      }
    }
  } else {
    if (newValue == null || newValue === false) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, newValue)
    }
  }
}

export { h, render, Fragment }
