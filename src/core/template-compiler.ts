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
export function createRuntimeCompiler(template: string, components?: Record<string, any>): (context: any) => VNode {
  // 🔍 模板预处理：将自闭合的自定义组件标签转换为标准双标签
  let processedTemplate = template
  
  if (components) {
    // 获取所有注册的组件名（包括驼峰和小写形式）
    const componentNames = Object.keys(components)
    
    // 为每个组件名创建正则，匹配自闭合标签并转换为双标签
    componentNames.forEach(compName => {
      // 匹配 <ComponentName ... /> 或 <component-name ... />
      const selfClosingRegex = new RegExp(`<(${compName})([^>]*)\\s*/>`, 'gi')
      processedTemplate = processedTemplate.replace(selfClosingRegex, `<$1$2></$1>`)
    })
  }

  // 这里需要一个完整的 HTML 解析器，为了简化，我们使用浏览器原生 API
  const parser = new DOMParser()
  // 将模板包裹在 div 中，确保 DOMParser 能正确解析所有子节点
  const wrappedHtml = `<div id="root">${processedTemplate}</div>`
  const doc = parser.parseFromString(wrappedHtml, 'text/html')
  const rootElement = doc.getElementById('root')

  if (!rootElement) {
    throw new Error('Failed to parse template')
  }

  // 如果 rootElement 只有一个 fragment 子节点，我们需要遍历 fragment 的子节点
  const actualRoot = rootElement.firstElementChild?.tagName.toLowerCase() === 'fragment'
    ? rootElement.firstElementChild
    : rootElement

  // 返回渲染函数，接收 context 作为参数
  return function(props: any, setupState?: any): VNode {
    // 合并 props 和 setupState 到同一个 context 中
    const context = { ...props, ...(setupState || {}) }
    
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

          if (components && components[tagName]) {
            const component = components[tagName]

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

        // 🔍 修复：不要通过首字母大写判断组件，而是通过是否在 components 映射中
        // 由于 DOMParser 会将所有标签名转为大写，我们需要尝试多种变体来匹配组件
        
        // 🔥 关键策略：直接遍历 components 对象的键名，看是否有匹配的
        // 因为 DOMParser 会将标签名转大写，所以我们要做不区分大小写的比较
        let foundComponent = null
        let matchedVariant = ''
        
        if (components) {
          for (const [key, value] of Object.entries(components)) {
            // 将组件键名转换为大写后与 originalTagName 比较
            if (key.toUpperCase() === originalTagName) {
              foundComponent = value
              matchedVariant = key
              break
            }
          }
        }
      
        const isKnownComponent = !!foundComponent
      
        if (isKnownComponent && foundComponent) {
          // 使用找到的组件
          const component = foundComponent
          
          // ✅ 找到组件，立即构建并返回组件 VNode
            // 收集组件属性
            const componentProps: Record<string, any> = {}
            Array.from(el.attributes).forEach(attr => {
              const name = attr.name
              const value = attr.value
              
              // 处理绑定属性 :src, :key 等
              if (name.startsWith(':')) {
                const propName = name.slice(1)
                const propValue = evaluateExpression(value, context)
                if (propName !== 'key') { // key 不传递给真实 DOM
                  componentProps[propName] = propValue
                }
              }
              // 处理事件 @click, @input 等
              else if (name.startsWith('@')) {
                const eventName = name.slice(1)
                const handlerName = value
                if (context[handlerName]) {
                  componentProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
                }
              }
              // 处理 v-model
              else if (name === 'v-model') {
                // 简化处理：仅支持基本的双向绑定
                const modelName = value
                componentProps.value = context[modelName]
                componentProps.onInput = (e: any) => {
                  context[modelName] = e.target.value
                }
              }
              // 处理 v-if（跳过，已经在外部处理）
              else if (name === 'v-if') {
                // 跳过
              }
              // 普通属性
              else {
                const interpolatedValue = interpolate(value, context)
                if (name === 'class') {
                  componentProps.className = interpolatedValue
                } else {
                  componentProps[name] = interpolatedValue
                }
              }
            })
            
            return {
              type: component,
              props: componentProps,
              children: [] // 组件的子节点由组件自己的 template 决定
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

          if (hasVIf) {
            // 处理 v-if
            const conditionExpr = el.getAttribute('v-if')
            if (!conditionExpr) return null
            const conditionValue = evaluateExpression(conditionExpr, context)
            
            // 如果条件为假，不渲染任何内容
            if (!conditionValue) {
              return null
            }
            
            // 条件为真，渲染内容
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

          if (hasVElseIf) {
            // v-else-if 需要检查前一个条件（简化处理：总是渲染）
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

          if (hasVElse) {
            // v-else（简化处理：总是渲染）
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

        // 🔥 关键修复：SVG 元素需要使用 createElementNS 创建
        if (tagName === 'svg') {
          const namespace = 'http://www.w3.org/2000/svg'
          const element = document.createElementNS(namespace, 'svg')
          
          const svgProps: Record<string, any> = {}
          
          // 收集属性
          Array.from(el.attributes).forEach(attr => {
            const name = attr.name
            const value = attr.value
            
            // 处理绑定属性 :src, :key 等
            if (name.startsWith(':')) {
              const propName = name.slice(1)
              const propValue = evaluateExpression(value, context)
              if (propName !== 'key') {
                svgProps[propName] = propValue
              }
            }
            // 处理事件 @click 等
            else if (name.startsWith('@')) {
              const eventName = name.slice(1)
              const handlerName = value
              if (context[handlerName]) {
                svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
              }
            }
            // 处理 v-model (虽然 SVG 少见，但保持一致性)
            else if (name === 'v-model') {
              const modelName = value
              svgProps.value = context[modelName]
              svgProps.onInput = (e: any) => {
                context[modelName] = e.target.value
              }
            }
            // 普通属性 - 处理命名空间
            else {
              // 🔥 关键修复：width、height、style 等静态属性不要插值，直接设置到元素上并传递给虚拟 DOM
              if (name === 'width' || name === 'height') {
                // 🔥 关键修复：SVG 的 width 和 height 使用 setAttribute 而不是 setAttributeNS
                element.setAttribute(name, value)
                svgProps[name] = value  // 🔥 关键：添加到 props 中传递给虚拟 DOM
              } else if (name === 'style') {
                // style 属性直接设置到元素
                element.setAttribute('style', value)
                svgProps.style = value
              } else if (name === 'class') {
                element.setAttribute('class', value)
                svgProps.className = value
              } else if (name.includes(':')) {
                const [prefix, localName] = name.split(':')
                if (prefix === 'xlink') {
                  element.setAttributeNS('http://www.w3.org/1999/xlink', localName, value)
                  svgProps[name] = value  // 🔥 关键：添加到 props 中
                } else if (prefix === 'xmlns') {
                  element.setAttributeNS('http://www.w3.org/2000/xmlns/', localName, value)
                  svgProps[name] = value
                } else {
                  element.setAttributeNS(namespace, localName, value)
                  svgProps[name] = value
                }
              } else {
                element.setAttributeNS(namespace, name, value)
                svgProps[name] = value
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
            type: tagName,
            props: svgProps,
            children,
            el: element
          }
        }

        // 检查是否有 v-if 指令 (通用逻辑)
        const vIfAttr = Array.from(el.attributes).find(attr => attr.name === 'v-if')
        if (vIfAttr) {
          const conditionExpr = vIfAttr.value
          const conditionValue = evaluateExpression(conditionExpr, context)
          
          // 如果条件为假，不渲染此元素
          if (!conditionValue) {
            return null
          }
        }

        // 处理 SVG 元素
        if (isSvgChild(el)) {
          console.log('🎨 处理 SVG 子元素:', tagName)
          const namespace = 'http://www.w3.org/2000/svg'
          const element = document.createElementNS(namespace, tagName)
          
          const svgProps: Record<string, any> = {}
          
          // 收集属性
          Array.from(el.attributes).forEach(attr => {
            const name = attr.name
            const value = attr.value
            
            console.log('🔵 SVG 子元素属性:', { name, value, tag: tagName })
            
            // 处理绑定属性 :src, :key 等
            if (name.startsWith(':')) {
              const propName = name.slice(1)
              const propValue = evaluateExpression(value, context)
              if (propName !== 'key') {
                svgProps[propName] = propValue
              }
            }
            // 处理事件 @click 等
            else if (name.startsWith('@')) {
              const eventName = name.slice(1)
              const handlerName = value
              if (context[handlerName]) {
                svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
              }
            }
            // 处理 v-model (虽然 SVG 少见，但保持一致性)
            else if (name === 'v-model') {
              const modelName = value
              svgProps.value = context[modelName]
              svgProps.onInput = (e: any) => {
                context[modelName] = e.target.value
              }
            }
            // 普通属性 - 处理命名空间
            else {
              // 🔥 关键修复：width、height、style 等静态属性不要插值，直接设置到元素上并传递给虚拟 DOM
              if (name === 'width' || name === 'height') {
                // 🔥 关键修复：SVG 的 width 和 height 使用 setAttribute 而不是 setAttributeNS
                element.setAttribute(name, value)
                console.log('✅ 设置 SVG 子元素属性:', { name, value, method: 'setAttribute', tag: tagName })
                svgProps[name] = value  // 🔥 关键：添加到 props 中传递给虚拟 DOM
              } else if (name === 'style') {
                // style 属性直接设置到元素
                element.setAttribute('style', value)
                svgProps.style = value
              } else if (name === 'class') {
                element.setAttribute('class', value)
                svgProps.className = value
              } else if (name.includes(':')) {
                const [prefix, localName] = name.split(':')
                if (prefix === 'xlink') {
                  element.setAttributeNS('http://www.w3.org/1999/xlink', localName, value)
                  svgProps[name] = value  // 🔥 关键：添加到 props 中
                  console.log('✅ 设置 xlink 属性:', { name, value, localName, tag: tagName })
                } else if (prefix === 'xmlns') {
                  element.setAttributeNS('http://www.w3.org/2000/xmlns/', localName, value)
                  svgProps[name] = value
                } else {
                  element.setAttributeNS(namespace, localName, value)
                  svgProps[name] = value
                }
              } else {
                element.setAttributeNS(namespace, name, value)
                svgProps[name] = value
              }
            }
          })

          // 处理子节点
          const children: any[] = []
          console.log('🔍 SVG 子元素节点数量:', el.childNodes.length)
          Array.from(el.childNodes).forEach((child, index) => {
            console.log(`📦 SVG 子节点 ${index}:`, { 
              nodeType: child.nodeType, 
              nodeName: child.nodeName,
              isElement: child.nodeType === Node.ELEMENT_NODE
            })
            const vnode = buildVNode(child)
            if (vnode) {
              console.log(`✅ SVG VNode ${index}:`, vnode)
              children.push(vnode)
            }
          })

          console.log('🎯 完成 SVG 子元素构建:', { tag: tagName, props: svgProps, childrenCount: children.length })

          return {
            type: tagName,
            props: svgProps,
            children,
            el: element
          }
        }

        // 普通 HTML 元素处理逻辑
        const elementProps: Record<string, any> = {}
        
        // 收集普通 HTML 元素的属性
        Array.from(el.attributes).forEach(attr => {
          const name = attr.name
          const value = attr.value
          
          // 处理绑定属性 :src, :key 等
          if (name.startsWith(':')) {
            const propName = name.slice(1)
            const propValue = evaluateExpression(value, context)
            
            if (propName !== 'key') { // key 不传递给真实 DOM
              elementProps[propName] = propValue
            }
          }
          // 处理事件 @click, @input 等
          else if (name.startsWith('@')) {
            const eventName = name.slice(1)
            const handlerName = value
            if (context[handlerName]) {
              elementProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
            }
          }
          // 处理 v-model
          else if (name === 'v-model') {
            const modelName = value
            elementProps.value = context[modelName]
            elementProps.onInput = (e: any) => {
              context[modelName] = e.target.value
            }
          }
          // 普通属性
          else {
            // 🔥 关键修复：width、height、style 等静态属性不要插值
            if (name === 'width' || name === 'height') {
              elementProps[name] = value
            } else if (name === 'style') {
              // style 属性直接传递字符串
              elementProps.style = value
            } else {
              const interpolatedValue = interpolate(value, context)
              if (name === 'class') {
                elementProps.className = interpolatedValue
              } else {
                elementProps[name] = interpolatedValue
              }
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
          type: tagName,
          props: elementProps,
          children
        }
      }

      return null
    }

    /**
     * 判断元素是否应该作为 SVG 子元素处理
     * 简单的启发式方法：如果父级是 svg 标签，或者自身是常见的 SVG 标签
     */
    function isSvgChild(node: Element): boolean {
      const svgTags = [
        'circle', 'rect', 'path', 'line', 'polyline', 'polygon', 
        'text', 'tspan', 'g', 'defs', 'use', 'image', 'pattern', 
        'clipPath', 'mask', 'linearGradient', 'radialGradient', 'stop'
      ]
      // 检查自身是否是已知 SVG 标签
      const nodeTagName = node.tagName.toLowerCase()
      if (svgTags.includes(nodeTagName)) {
        return true
      }
      // 检查父节点是否是 svg (通过遍历父节点直到 root 或找到 svg)
      // 由于我们是递归构建，且 DOMParser 已经构建了树，我们可以检查 parentNode
      let parent = node.parentNode
      while (parent) {
        if (parent.nodeType === Node.ELEMENT_NODE) {
          if ((parent as Element).tagName.toLowerCase() === 'svg') {
            return true
          }
        }
        parent = parent.parentNode
      }
      return false
    }

    // 处理根元素的所有子节点
    const children: any[] = []
    
    Array.from(actualRoot.childNodes).forEach((child) => {
      const vnode = buildVNode(child)
      if (vnode) {
        children.push(vnode)
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
}

/**
 * 插值处理 {{ }}
 */
function interpolate(str: string, context: any): string {
  if (!str) return str || ''
  
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