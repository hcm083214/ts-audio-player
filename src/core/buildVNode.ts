import { VNode, Fragment } from './types'
import { interpolate, evaluateExpression } from './interpolate'

/**
 * 判断元素是否应该作为 SVG 子元素处理
 * @param node DOM 元素
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
  // 检查父节点是否是 svg
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

/**
 * 递归构建 VNode
 * @param element DOM 元素
 * @param context 上下文对象
 * @param components 组件映射
 */
export function buildVNode(element: Element | Node, context: any, components?: Record<string, any>): VNode | null {
  // 文本节点
  if (element.nodeType === Node.TEXT_NODE) {
    const textContent = element.textContent || ''
    const interpolated = interpolate(textContent, context)
    return interpolated as any
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
    return null
  }

  // 🔥 显式检查：确保只处理元素节点
  if (element.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  // 此时 TypeScript 可以确定 element 是 Element
  const el = element as Element
  const tagName = el.tagName.toLowerCase()
  const originalTagName = el.tagName

  // 🔍 前置拦截 v-if：在进入任何具体类型处理之前先检查条件
  const vIfAttr = Array.from(el.attributes).find(attr => attr.name === 'v-if')
  if (vIfAttr) {
    const conditionExpr = vIfAttr.value
    const conditionValue = evaluateExpression(conditionExpr, context)
    if (!conditionValue) {
      return null
    }
  }

  // 🔥 新增：处理 v-for 指令
  const vForAttr = Array.from(el.attributes).find(attr => attr.name === 'v-for')
  if (vForAttr) {
    const forExpr = vForAttr.value
    // 🔥 修复：支持两种 v-for 语法
    // 1. "item in array" 
    // 2. "(item, index) in array"
    let itemVar: string, indexVar: string | undefined, arrayExpr: string
    
    const simpleMatch = forExpr.match(/^(\w+)\s+in\s+(.+)$/)
    const complexMatch = forExpr.match(/^\s*\(\s*(\w+)\s*,?\s*(\w+)?\s*\)\s+in\s+(.+)\s*$/)
    
    if (simpleMatch) {
      // 简单语法：item in array
      [, itemVar, arrayExpr] = simpleMatch
      indexVar = undefined
    } else if (complexMatch) {
      // 复杂语法：(item, index) in array
      const [, item, index, array] = complexMatch
      itemVar = item
      indexVar = index
      arrayExpr = array
    } else {
      console.error('Invalid v-for expression:', forExpr)
      return {
        type: Fragment as any,
        props: {},
        children: []
      }
    }
    const array = evaluateExpression(arrayExpr.trim(), context)
    
    if (!Array.isArray(array)) {
      console.error('v-for expects an array but got:', typeof array)
      return {
        type: Fragment as any,
        props: {},
        children: []
      }
    }
    
    // 🔥 关键修改：克隆元素及其子节点
    const children: any[] = []
    // console.log('🔍 v-for: Processing array with length:', array.length)
    array.forEach((item, actualIndex) => {
      // 创建新的上下文，包含循环变量
      const loopContext = { ...context }
      loopContext[itemVar] = item
      if (indexVar) {
        loopContext[indexVar] = actualIndex
      }
      
      // 🔥 克隆当前元素及其所有子节点（true 表示深度克隆）
      const clonedEl = el.cloneNode(true) as Element
      // 移除 v-for 属性，避免递归处理
      Array.from(clonedEl.attributes).forEach(attr => {
        if (attr.name === 'v-for') {
          clonedEl.removeAttribute('v-for')
        }
      })
      
      // 递归构建 VNode（会处理克隆后的元素及其子节点）
      const vnode = buildVNode(clonedEl, loopContext, components)
      if (vnode) {
        children.push(vnode)
        // console.log('✅ v-for: Added vnode at index', actualIndex, 'vnode.type:', typeof vnode.type === 'object' ? 'Component' : vnode.type)
      } else {
        console.warn('❌ v-for: vnode is null at index', actualIndex)
      }
    })
    
    // console.log('📦 v-for: Returning Fragment with', children.length, 'children')
    
    // 直接返回子节点数组，让父容器处理
    return {
      type: Fragment as any,
      props: {},
      children
    }
  }

  // 🔍 处理 v-else：查找前一个有 v-if 或 v-else-if 的兄弟节点
  const vElseAttr = Array.from(el.attributes).find(attr => attr.name === 'v-else')
  if (vElseAttr) {
    let shouldRender = false
    
    // 在父节点的 childNodes 中向前查找
    const parent = el.parentNode
    if (parent) {
      const siblings = Array.from(parent.childNodes)
      const currentIndex = siblings.indexOf(el)
      
      // 向前查找第一个有 v-if 或 v-else-if 的元素节点
      for (let i = currentIndex - 1; i >= 0; i--) {
        const sibling = siblings[i]
        if (sibling.nodeType === Node.ELEMENT_NODE) {
          const siblingEl = sibling as Element
          const prevVIf = Array.from(siblingEl.attributes).find(attr => attr.name === 'v-if')
          const prevVElseIf = Array.from(siblingEl.attributes).find(attr => attr.name === 'v-else-if')
          
          if (prevVIf || prevVElseIf) {
            // 找到了前一个条件节点，检查其条件是否为 true
            const prevConditionAttr = prevVIf || prevVElseIf
            if (prevConditionAttr) {
              const prevConditionExpr = prevConditionAttr.value
              const prevConditionValue = evaluateExpression(prevConditionExpr, context)
              
              // 如果前一个条件为 true，则当前 v-else 不应该显示
              if (prevConditionValue) {
                return null
              } else {
                // 前一个条件为 false，继续构建当前节点
                shouldRender = true
                break
              }
            }
          }
        }
      }
    }
    
    // 如果没有找到前一个条件节点，不渲染
    if (!shouldRender) {
      return null
    }
  }

  // 🔍 查找组件
  let foundComponent = null
  
  if (components) {
    for (const [key, value] of Object.entries(components)) {
      if (key.toUpperCase() === originalTagName) {
        foundComponent = value
        break
      }
    }
  }

  // 处理组件
  if (foundComponent) {
    const componentProps: Record<string, any> = {}
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name
      const value = attr.value
      
      // 处理绑定属性
      if (name.startsWith(':')) {
        const propName = name.slice(1)
        const propValue = evaluateExpression(value, context)
        if (propName !== 'key') {
          componentProps[propName] = propValue
        }
      }
      // 处理事件
      else if (name.startsWith('@')) {
        const eventName = name.slice(1)
        const handlerName = value
        if (context[handlerName]) {
          componentProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
        }
      }
      // 处理 v-model
      else if (name === 'v-model') {
        const modelName = value
        componentProps.value = context[modelName]
        componentProps.onInput = (e: any) => {
          context[modelName] = e.target.value
        }
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
      type: foundComponent,
      props: componentProps,
      children: []
    }
  }

  // 处理 Fragment
  if (tagName === 'fragment') {
    const children: any[] = []
    Array.from(el.childNodes).forEach(child => {
      const vnode = buildVNode(child, context, components)
      if (vnode) children.push(vnode)
    })
    return {
      type: Fragment,
      props: {},
      children
    }
  }

  // 处理 template 标签
  if (tagName === 'template') {
    // v-if 已在最前面统一处理，这里直接处理子节点
    const children: any[] = []
    Array.from(el.childNodes).forEach(child => {
      const vnode = buildVNode(child, context, components)
      if (vnode) children.push(vnode)
    })
    return {
      type: Fragment,
      props: {},
      children
    }
  }

  // 处理 SVG 元素
  if (tagName === 'svg') {
    const namespace = 'http://www.w3.org/2000/svg'
    const element = document.createElementNS(namespace, 'svg')
    const svgProps: Record<string, any> = {}
    
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name
      const value = attr.value
      
      if (name.startsWith(':')) {
        const propName = name.slice(1)
        const propValue = evaluateExpression(value, context)
        if (propName !== 'key') {
          svgProps[propName] = propValue
        }
      } else if (name.startsWith('@')) {
        const eventName = name.slice(1)
        const handlerExpr = value
        // 🔥 关键修复：支持函数调用表达式如 goTo(index) 和简单函数名如 prev
        const isSimpleCall = handlerExpr.match(/^(\w+)\(\)$/)  // prev() 形式
        const isParameterizedCall = handlerExpr.match(/^(\w+)\(([^)]*)\)$/)  // goTo(index) 形式
        const isFunctionName = /^\w+$/.test(handlerExpr)  // 简单函数名形式，如 prev
        
        if (isSimpleCall) {
          // 简单调用：直接使用 context 中的函数引用
          const funcName = isSimpleCall[1]
          svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[funcName]
        } else if (isParameterizedCall) {
          // 带参数调用：需要包装函数传递参数
          const funcName = isParameterizedCall[1]
          const paramNames = isParameterizedCall[2].split(',').map(p => p.trim())
          
          svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = (...args: any[]) => {
            const func = context[funcName]
            if (typeof func === 'function') {
              // 将参数传递给函数
              return func.apply(context, args.length > 0 ? args : paramNames.map(p => context[p]))
            }
          }
        } else if (isFunctionName) {
          // 简单函数名：直接使用 context 中的函数引用
          svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerExpr]
        } else {
          // 复杂表达式：使用原来的 evaluateExpression
          svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = () => {
            evaluateExpression(handlerExpr, context)
          }
        }
      } else if (name === 'v-model') {
        const modelName = value
        svgProps.value = context[modelName]
        svgProps.onInput = (e: any) => {
          context[modelName] = e.target.value
        }
      } else {
        // 🔥 关键修复：width、height 使用 setAttribute
        if (name === 'width' || name === 'height') {
          element.setAttribute(name, value)
          svgProps[name] = value
        } else if (name === 'style') {
          element.setAttribute('style', value)
          svgProps.style = value
        } else if (name === 'class') {
          element.setAttribute('class', value)
          svgProps.className = value
        } else if (name.includes(':')) {
          const [prefix, localName] = name.split(':')
          if (prefix === 'xlink') {
            element.setAttributeNS('http://www.w3.org/1999/xlink', localName, value)
            svgProps[name] = value
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

    const children: any[] = []
    Array.from(el.childNodes).forEach(child => {
      const vnode = buildVNode(child, context, components)
      if (vnode) children.push(vnode)
    })

    return {
      type: tagName,
      props: svgProps,
      children,
      el: element
    }
  }

  // 处理 SVG 子元素
  if (isSvgChild(el)) {
    const namespace = 'http://www.w3.org/2000/svg'
    const element = document.createElementNS(namespace, tagName)
    const svgProps: Record<string, any> = {}
    
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name
      const value = attr.value
      
      if (name.startsWith(':')) {
        const propName = name.slice(1)
        const propValue = evaluateExpression(value, context)
        if (propName !== 'key') {
          svgProps[propName] = propValue
        }
      } else if (name.startsWith('@')) {
        const eventName = name.slice(1)
        const handlerExpr = value
        // 🔥 关键修复：支持函数调用表达式如 goTo(index) 和简单函数名如 prev
        const isSimpleCall = handlerExpr.match(/^(\w+)\(\)$/)  // prev() 形式
        const isParameterizedCall = handlerExpr.match(/^(\w+)\(([^)]*)\)$/)  // goTo(index) 形式
        const isFunctionName = /^\w+$/.test(handlerExpr)  // 简单函数名形式，如 prev
        
        if (isSimpleCall) {
          // 简单调用：直接使用 context 中的函数引用
          const funcName = isSimpleCall[1]
          svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[funcName]
        } else if (isParameterizedCall) {
          // 带参数调用：需要包装函数传递参数
          const funcName = isParameterizedCall[1]
          const paramNames = isParameterizedCall[2].split(',').map(p => p.trim())
          
          svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = (...args: any[]) => {
            const func = context[funcName]
            if (typeof func === 'function') {
              // 将参数传递给函数
              return func.apply(context, args.length > 0 ? args : paramNames.map(p => context[p]))
            }
          }
        } else if (isFunctionName) {
          // 简单函数名：直接使用 context 中的函数引用
          svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerExpr]
        } else {
          // 复杂表达式：使用原来的 evaluateExpression
          svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = () => {
            evaluateExpression(handlerExpr, context)
          }
        }
      } else if (name === 'v-model') {
        const modelName = value
        svgProps.value = context[modelName]
        svgProps.onInput = (e: any) => {
          context[modelName] = e.target.value
        }
      } else {
        // 🔥 关键修复：width、height 使用 setAttribute
        if (name === 'width' || name === 'height') {
          element.setAttribute(name, value)
          svgProps[name] = value
        } else if (name === 'style') {
          element.setAttribute('style', value)
          svgProps.style = value
        } else if (name === 'class') {
          element.setAttribute('class', value)
          svgProps.className = value
        } else if (name.includes(':')) {
          const [prefix, localName] = name.split(':')
          if (prefix === 'xlink') {
            element.setAttributeNS('http://www.w3.org/1999/xlink', localName, value)
            svgProps[name] = value
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

    const children: any[] = []
    Array.from(el.childNodes).forEach(child => {
      const vnode = buildVNode(child, context, components)
      if (vnode) children.push(vnode)
    })

    return {
      type: tagName,
      props: svgProps,
      children,
      el: element
    }
  }

  // 处理普通 HTML 元素
  const elementProps: Record<string, any> = {}
  
  Array.from(el.attributes).forEach(attr => {
    const name = attr.name
    const value = attr.value
    
    if (name.startsWith(':')) {
      const propName = name.slice(1)
      const propValue = evaluateExpression(value, context)
      if (propName !== 'key') {
        elementProps[propName] = propValue
      }
    } else if (name.startsWith('@')) {
        const eventName = name.slice(1)
        const handlerExpr = value
        
        // 🔥 关键修复：直接从 context 获取函数，避免每次都创建新的包装函数
        // 检查是否是简单的函数调用（如 prev()、next()）或带参数的调用（如 goTo(index)）
        const isSimpleCall = handlerExpr.match(/^(\w+)\(\)$/)  // prev() 形式
        const isParameterizedCall = handlerExpr.match(/^(\w+)\(([^)]*)\)$/)  // goTo(index) 形式
        const isFunctionName = /^\w+$/.test(handlerExpr)  // 简单函数名形式，如 prev
        
        if (isSimpleCall) {
          // 简单调用：直接使用 context 中的函数引用
          const funcName = isSimpleCall[1]
          elementProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[funcName]
        } else if (isParameterizedCall) {
          // 带参数调用：需要包装函数传递参数
          const funcName = isParameterizedCall[1]
          const paramNames = isParameterizedCall[2].split(',').map(p => p.trim())
          
          elementProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = (...args: any[]) => {
            const func = context[funcName]
            if (typeof func === 'function') {
              // 将参数传递给函数
              return func.apply(context, args.length > 0 ? args : paramNames.map(p => context[p]))
            }
          }
        } else if (isFunctionName) {
          // 简单函数名：直接使用 context 中的函数引用
          elementProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerExpr]
        } else {
          // 复杂表达式：使用原来的 evaluateExpression
          elementProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = () => {
            evaluateExpression(handlerExpr, context)
          }
        }
    } else if (name === 'v-model') {
      const modelName = value
      elementProps.value = context[modelName]
      elementProps.onInput = (e: any) => {
        context[modelName] = e.target.value
      }
    } else {
      // 🔥 关键修复：width、height 不插值
      if (name === 'width' || name === 'height') {
        elementProps[name] = value
      } else if (name === 'style') {
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

  const children: any[] = []
  Array.from(el.childNodes).forEach(child => {
    const vnode = buildVNode(child, context, components)
    if (vnode) children.push(vnode)
  })

  return {
    type: tagName,
    props: elementProps,
    children
  }
}