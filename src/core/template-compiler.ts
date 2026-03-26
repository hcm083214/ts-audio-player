import { h, Fragment } from './renderer'

// VNode 类型定义
export interface VNode {
  type: any
  props: Record<string, any>
  children: any[] | string
  el?: any
}

/**
 * 将包含 template 属性的组件对象编译为可渲染的组件
 * @param component 包含 setup 和 template 属性的组件对象
 * @returns 编译后的组件（带有 render 函数）
 */
export function compileComponent(component: {
  setup?: (props: any) => any
  template?: string
  props?: string[]
  emits?: string[]
  components?: Record<string, any>
}) {
  if (!component.template) {
    return component
  }

  // 创建运行时编译器
  const renderFunction = createRuntimeCompiler(component.template, component.components)

  // 返回带有 render 函数的组件
  return {
    ...component,
    render: renderFunction
  }
}

/**
 * 运行时模板编译器
 * 将模板字符串编译为渲染函数
 */
function createRuntimeCompiler(template: string, components?: Record<string, any>): (props: any, setupState: any) => VNode {
  // 移除首尾空白
  const trimmedTemplate = template.trim()

  // 解析并创建渲染函数
  return function (props: any, setupState: any): VNode {
    // 合并上下文
    const context = { ...props, ...setupState }

    // 使用自定义的 HTML 解析器转换为 VNode
    const vnode = parseHTMLToVNode(trimmedTemplate, context, components)
    return vnode as VNode
  }
}

/**
 * 简单的 HTML 解析器，将模板字符串转换为 VNode
 */
function parseHTMLToVNode(html: string, context: any, components?: Record<string, any>): any {
  // 首先，在解析前手动查找并标记组件标签
  const componentMap = new Map<string, any>()
  const placeholderMap = new Map<string, string>()

  if (components) {
    // 查找所有大写字母开头的自闭合标签
    const componentTagRegex = /<([A-Z][a-zA-Z0-9]*(?:\s[^>]*)?)\s*\/?>/g
    let match

    while ((match = componentTagRegex.exec(html)) !== null) {
      const fullMatch = match[0]
      const tagWithAttrs = match[1]
      const tagName = tagWithAttrs.split(/\s/)[0]


      if (components[tagName]) {
        // 记录这个标签对应的组件
        componentMap.set(tagName.toUpperCase(), components[tagName])
        componentMap.set(tagName, components[tagName])

        // 创建占位符替换自闭合标签
        const placeholder = `<!--COMPONENT:${tagName}-->`
        placeholderMap.set(placeholder, tagName)

        // 替换模板中的自闭合标签为占位符
        html = html.replace(fullMatch, placeholder)
      }
    }
  }


  // 这里需要一个完整的 HTML 解析器，为了简化，我们使用浏览器原生 API
  const parser = new DOMParser()
  // 将模板包裹在 div 中，确保 DOMParser 能正确解析所有子节点
  const wrappedHtml = `<div id="root">${html}</div>`
  const doc = parser.parseFromString(wrappedHtml, 'text/html')
  const rootElement = doc.getElementById('root')

  if (!rootElement) {
    throw new Error('Failed to parse template')
  }



  // 如果 rootElement 只有一个 fragment 子节点，我们需要遍历 fragment 的子节点
  const actualRoot = rootElement.firstElementChild?.tagName.toLowerCase() === 'fragment'
    ? rootElement.firstElementChild
    : rootElement


  // 递归构建 VNode
  function buildVNode(element: Element | Node): any {
    // 文本节点
    if (element.nodeType === Node.TEXT_NODE) {
      const textContent = element.textContent || ''
      // 处理插值 {{ }}
      const interpolated = interpolate(textContent, context)
      return interpolated
    }

    // 注释节点 - 检查是否是组件占位符
    if (element.nodeType === Node.COMMENT_NODE) {
      const commentText = element.textContent || ''
      if (commentText.startsWith('COMPONENT:')) {
        const tagName = commentText.replace('COMPONENT:', '')

        if (componentMap.has(tagName)) {
          const component = componentMap.get(tagName)!

          return {
            type: component,
            props: {},
            children: []
          }
        }
      }
      // 普通注释节点返回 null
      return null
    }

    // 元素节点
    if (element.nodeType === Node.ELEMENT_NODE) {
      const el = element as Element
      const tagName = el.tagName.toLowerCase()
      const originalTagName = el.tagName



      // 检查是否是大写字母开头的标签（组件标签）
      const isComponentTag = /^[A-Z]/.test(originalTagName)

      if (isComponentTag && componentMap.size > 0) {
        // 从预处理的映射中查找组件
        const component = componentMap.get(originalTagName) || componentMap.get(tagName)


        if (component) {
          // 这是一个组件，返回带有组件对象的 VNode

          return {
            type: component,
            props: {},
            children: []
          }
        } else {
          console.warn('未找到组件:', originalTagName)
        }
      }

      // 处理 Fragment
      if (tagName === 'fragment') {
        const children: any[] = []
        Array.from(el.childNodes).forEach(child => {
          const vnode = buildVNode(child)
          if (vnode) children.push(vnode)
        })
        return {
          type: Fragment,
          props: {},
          children
        }
      }

      // 处理 template 标签（可能是 v-if/v-for 容器）
      if (tagName === 'template') {
        // 检查是否有 v-if/v-else
        const hasVIf = el.hasAttribute('v-if')
        const hasVElse = el.hasAttribute('v-else')
        const hasVElseIf = el.hasAttribute('v-else-if')

        if (hasVIf || hasVElse || hasVElseIf) {
          // 简化处理：直接渲染内容
          const children: any[] = []
          Array.from(el.childNodes).forEach(child => {
            const vnode = buildVNode(child)
            if (vnode) children.push(vnode)
          })
          return {
            type: Fragment,
            props: {},
            children
          }
        }

        // 普通 template 标签，渲染其内容
        const children: any[] = []
        Array.from(el.childNodes).forEach(child => {
          const vnode = buildVNode(child)
          if (vnode) children.push(vnode)
        })
        return {
          type: Fragment,
          props: {},
          children
        }
      }

      // 检查是否为注册的组件
      let componentType = tagName
      if (components && components[tagName]) {
        componentType = components[tagName]
      }

      // 收集属性
      const props: Record<string, any> = {}
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name
        const value = attr.value

        // 处理绑定属性 :src, :key 等
        if (name.startsWith(':')) {
          const propName = name.slice(1)
          const propValue = evaluateExpression(value, context)
          if (propName !== 'key') { // key 不传递给真实 DOM
            props[propName] = propValue
          }
        }
        // 处理事件 @click, @input 等
        else if (name.startsWith('@')) {
          const eventName = name.slice(1)
          const handlerName = value
          if (context[handlerName]) {
            props[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
          }
        }
        // 处理 v-model
        else if (name === 'v-model') {
          // 简化处理：仅支持基本的双向绑定
          const modelName = value
          props.value = context[modelName]
          props.onInput = (e: any) => {
            context[modelName] = e.target.value
          }
        }
        // 普通属性
        else {
          const interpolatedValue = interpolate(value, context)
          if (name === 'class') {
            props.className = interpolatedValue
          } else {
            props[name] = interpolatedValue
          }
        }
      })

      // 处理子节点
      const children: any[] = []
      Array.from(el.childNodes).forEach(child => {
        const vnode = buildVNode(child)
        if (vnode) children.push(vnode)
      })

      return {
        type: componentType,
        props,
        children
      }
    }

    return null
  }

  // 处理根元素的所有子节点
  const children: any[] = []
  Array.from(actualRoot.childNodes).forEach((child, index) => {

    const vnode = buildVNode(child)
    if (vnode) {
      children.push(vnode)
    } else {
      console.warn(`跳过子节点 ${index}:`, child.nodeName)
    }
  })



  // 如果只有一个子节点，直接返回
  if (children.length === 1) {
    return children[0]
  }

  // 多个子节点则包装在 Fragment 中
  return {
    type: Fragment,
    props: {},
    children
  }
}

/**
 * 插值处理 {{ }}
 */
function interpolate(str: string, context: any): string {
  return str.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
    try {
      const result = evaluateExpression(expr.trim(), context)
      return String(result)
    } catch (e) {
      console.warn('Interpolation error:', expr, e)
      return match
    }
  })
}

/**
 * 表达式求值
 */
function evaluateExpression(expr: string, context: any): any {
  try {
    // 安全检查：只允许访问上下文中的属性
    // 使用 Function 构造函数创建沙箱环境
    const keys = Object.keys(context)
    const values = Object.values(context)

    // 创建函数：return context[expr]
    // 例如：return playlists.map(artist => artist.name)
    const fn = new Function(...keys, `"use strict"; return (${expr})`)
    return fn(...values)
  } catch (e) {
    console.warn('Expression evaluation error:', expr, e)
    return undefined
  }
}