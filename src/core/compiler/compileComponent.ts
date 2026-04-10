import { VNode, Fragment } from '../renderer/types'
import { buildVNode } from '../renderer/buildVNode'

/**
 * 运行时模板编译器
 * @param template 模板字符串
 * @param components 组件映射
 */
export function createRuntimeCompiler(template: string, components?: Record<string, any>): (props: any, setupState?: any) => VNode {
  // 🔍 模板预处理：将自闭合的自定义组件标签转换为标准双标签
  let processedTemplate = template

  if (components) {
    const componentNames = Object.keys(components)

    componentNames.forEach(compName => {
      const selfClosingRegex = new RegExp(`<(${compName})([^>]*)\\s*/>`, 'gi')
      processedTemplate = processedTemplate.replace(selfClosingRegex, `<$1$2></$1>`)
    })
  }

  const parser = new DOMParser()
  const wrappedHtml = `<div id="root">${processedTemplate}</div>`
  const doc = parser.parseFromString(wrappedHtml, 'text/html')
  const rootElement = doc.getElementById('root')

  if (!rootElement) {
    throw new Error('Failed to parse template')
  }

  const actualRoot = rootElement.firstElementChild?.tagName.toLowerCase() === 'fragment'
    ? rootElement.firstElementChild
    : rootElement

  return function (props: any, setupState?: any): VNode {
    const context = { ...props, ...(setupState || {}) }

    const children: any[] = []

    Array.from(actualRoot.childNodes).forEach((child, index) => {
      const vnode = buildVNode(child, context, components)
      if (vnode) {
        children.push(vnode)
      }
    })

    if (children.length === 1) {
      return children[0]
    }

    // 🔥 关键修复：Fragment 不应该被渲染为真实 DOM，直接返回子节点数组
    // 使用 Fragment 符号而不是字符串 'fragment'
    return {
      type: Fragment as any,
      props: {},
      children
    }
  }
}

/**
 * 将包含 template 属性的组件对象编译为可渲染的组件
 * @param component 包含 setup 和 template 属性的组件对象
 */
export function compileComponent(component: {
  setup?: (props: any, context: any) => any
  template?: string
  props?: string[]
  emits?: string[]
  components?: Record<string, any>
}) {
  if (!component.template) {
    return component
  }

  const renderFunction = createRuntimeCompiler(component.template, component.components)

  return {
    ...component,
    render: renderFunction
  }
}
