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

  console.log('🔧 编译组件:', component.constructor?.name || 'Anonymous', '有 components:', !!component.components)
  if (component.components) {
    console.log('📦 可用组件:', Object.keys(component.components).join(', '))
    // 🔍 检查模板中是否包含 IconComponent 标签
    if (component.components.IconComponent || component.components.iconcomponent) {
      const hasIconComponent = component.template.includes('IconComponent') || component.template.includes('iconcomponent')
      console.log('🔎 模板中是否包含 IconComponent 标签:', hasIconComponent)
      if (hasIconComponent) {
        console.log('📝 模板内容预览:', component.template.substring(0, 200) + '...')
      }
    }
  }

  // 创建运行时编译器
  const renderFunction = createRuntimeCompiler(component.template, component.components)

  console.log('✅ 组件编译完成:', component.constructor?.name || 'Anonymous')

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
      
      console.log(`🔧 转换自闭合标签：${compName}`, {
        before: template.match(new RegExp(`<${compName}[^>]*\\s*/>`, 'gi'))?.[0],
        after: processedTemplate.match(new RegExp(`<${compName}[^>]*></${compName}>`, 'gi'))?.[0]
      })
    })
  }
  
  console.log('📝 预处理后的模板:', processedTemplate.substring(0, 200) + '...')

  // 这里需要一个完整的 HTML 解析器，为了简化，我们使用浏览器原生 API
  const parser = new DOMParser()
  // 将模板包裹在 div 中，确保 DOMParser 能正确解析所有子节点
  const wrappedHtml = `<div id="root">${processedTemplate}</div>`
  const doc = parser.parseFromString(wrappedHtml, 'text/html')
  const rootElement = doc.getElementById('root')

  if (!rootElement) {
    throw new Error('Failed to parse template')
  }

  // 🔍 关键调试：检查 DOMParser 解析结果
  console.log('🔍 DOMParser 解析完成:', {
    rootTagName: rootElement.tagName,
    childNodesCount: rootElement.childNodes.length,
    childNodes: Array.from(rootElement.childNodes).map(child => ({
      nodeName: child.nodeName,
      nodeType: child.nodeType,
      tagName: child.nodeType === Node.ELEMENT_NODE ? (child as Element).tagName : 'N/A'
    }))
  })


  // 如果 rootElement 只有一个 fragment 子节点，我们需要遍历 fragment 的子节点
  const actualRoot = rootElement.firstElementChild?.tagName.toLowerCase() === 'fragment'
    ? rootElement.firstElementChild
    : rootElement

  // 返回渲染函数，接收 context 作为参数
  return function(context: any): VNode {
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

        // 🔍 关键调试：打印所有解析出的标签
        console.log('🔍 buildVNode - 标签:', originalTagName, '属性:', Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(', '))

        // 🔍 修复：不要通过首字母大写判断组件，而是通过是否在 components 映射中
        // 由于 DOMParser 会将所有标签名转为大写，我们需要尝试多种变体来匹配组件
        
        console.log('🔍 组件查找开始 - originalTagName:', originalTagName, 'tagName:', tagName)
        console.log('🧩 components 对象:', components ? Object.keys(components).join(', ') : 'undefined')
        
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
              console.log(`✅ 找到组件 '${key}' (匹配大写：${originalTagName}) ->`, foundComponent.constructor?.name || typeof foundComponent)
              break
            }
          }
        }
        
        if (!foundComponent) {
          console.log(`❌ 未找到与 ${originalTagName} 匹配的组件`)
        }
      
        const isKnownComponent = !!foundComponent
      
        console.log('🔍 检查标签:', originalTagName, '是否已知组件:', isKnownComponent, '有 components:', !!components)
      
        if (isKnownComponent && foundComponent) {
          // 使用找到的组件
          const component = foundComponent
        
          console.log('🧩 组件查找 - originalTagName:', originalTagName, 'tagName:', tagName)
          console.log('🧩 可用组件列表:', components ? Object.keys(components).join(', ') : 'N/A')
          console.log('🧩 找到组件:', !!component)
          console.log('🧩 组件属性详情:', Array.from(el.attributes).map(attr => `${attr.name}: ${attr.value}`).join(', '))
          
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
            
            console.log('✅ 组件 Props 收集完成:', componentProps)
            console.log('🎯 组件 VNode 即将返回:', {
              componentName: component.constructor?.name || 'Anonymous',
              props: componentProps,
              hasName: !!componentProps.name
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

        // 检查是否为注册的组件
        let componentType = tagName
        if (components && components[tagName]) {
          componentType = components[tagName]
        }

        // 收集属性
        const props: Record<string, any> = {}
        
        // 🔥 关键调试：在开始收集前打印
        if (componentType !== tagName) {
          console.log('🎭 检测到组件标签:', tagName, '完整属性列表:', Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', '))
          console.log('🔍 组件对象:', componentType.constructor?.name || typeof componentType)
        }
        
        // 普通 HTML 元素处理逻辑保持不变...
        const elementProps: Record<string, any> = {}
        
        // 检查是否有 v-if 指令
        const vIfAttr = Array.from(el.attributes).find(attr => attr.name === 'v-if')
        if (vIfAttr) {
          const conditionExpr = vIfAttr.value
          const conditionValue = evaluateExpression(conditionExpr, context)
          
          // 如果条件为假，不渲染此元素
          if (!conditionValue) {
            return null
          }
        }
        
        // 收集普通 HTML 元素的属性
        Array.from(el.attributes).forEach(attr => {
          const name = attr.name
          const value = attr.value
          
          // 处理绑定属性 :src, :key 等
          if (name.startsWith(':')) {
            const propName = name.slice(1)
            const propValue = evaluateExpression(value, context)
            if (propName !== 'key') {
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
            const interpolatedValue = interpolate(value, context)
            if (name === 'class') {
              elementProps.className = interpolatedValue
            } else {
              elementProps[name] = interpolatedValue
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

    // 处理根元素的所有子节点
    const children: any[] = []
    
    // 🔍 关键调试：打印所有子节点信息
    console.log('🔍 开始处理子节点，总数:', actualRoot.childNodes.length)
    Array.from(actualRoot.childNodes).forEach((child, index) => {
      console.log(`  子节点 ${index}:`, {
        nodeName: child.nodeName,
        nodeType: child.nodeType,
        tagName: child.nodeType === Node.ELEMENT_NODE ? (child as Element).tagName : 'N/A',
        attributes: child.nodeType === Node.ELEMENT_NODE ? Array.from((child as Element).attributes).map(a => a.name).join(', ') : 'N/A'
      })
    })
    
    Array.from(actualRoot.childNodes).forEach((child, index) => {

      const vnode = buildVNode(child)
      if (vnode) {
        // 🔥 关键调试：检查组件 VNode 的 props
        if (vnode.type && typeof vnode.type === 'object' && 'setup' in vnode.type) {
          console.log('✅ 组件 VNode 创建完成:', {
            componentName: vnode.type.constructor?.name || 'Anonymous',
            props: vnode.props,
            hasName: !!vnode.props?.name
          })
        }
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