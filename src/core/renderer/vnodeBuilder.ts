import { VNode, Fragment } from './types'
import { interpolate, evaluateExpression } from '../compiler/interpolate'
import { isSvgChild } from './svgHelpers'
import { parseAttributes } from './attributeParser'

/**
 * VNode 构建的核心逻辑
 */

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
  const vForNode = handleVFor(el, context, components)
  if (vForNode !== undefined) {
    return vForNode
  }

  // 🔍 处理 v-else
  const vElseNode = handleVElse(el, context)
  if (vElseNode !== undefined) {
    return vElseNode
  }

  // 🔍 查找组件
  const foundComponent = findComponent(originalTagName, components)

  // 处理组件
  if (foundComponent) {
    return buildComponentVNode(el, foundComponent, context)
  }

  // 处理 Fragment
  if (tagName === 'fragment') {
    return buildFragmentVNode(el, context, components)
  }

  // 处理 template 标签
  if (tagName === 'template') {
    return buildTemplateVNode(el, context, components)
  }

  // 处理 SVG 元素
  if (tagName === 'svg') {
    return buildSvgVNode(el, context, components)
  }

  // 处理 SVG 子元素
  if (isSvgChild(el)) {
    return buildSvgChildVNode(el, context, components)
  }

  // 处理普通 HTML 元素
  return buildHtmlVNode(el, context, components)
}

/**
 * 处理 v-for 指令
 */
function handleVFor(el: Element, context: any, components?: Record<string, any>): VNode | null | undefined {
  const vForAttr = Array.from(el.attributes).find(attr => attr.name === 'v-for')
  if (!vForAttr) {
    return undefined
  }

  const forExpr = vForAttr.value
  // 🔥 修复：支持两种 v-for 语法
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
    
    // 递归构建 VNode
    const vnode = buildVNode(clonedEl, loopContext, components)
    if (vnode) {
      children.push(vnode)
    }
  })
  
  // 直接返回子节点数组，让父容器处理
  return {
    type: Fragment as any,
    props: {},
    children
  }
}

/**
 * 处理 v-else 指令
 */
function handleVElse(el: Element, context: any): VNode | null | undefined {
  const vElseAttr = Array.from(el.attributes).find(attr => attr.name === 'v-else')
  if (!vElseAttr) {
    return undefined
  }

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
  
  return undefined // 继续正常处理
}

/**
 * 查找组件
 */
function findComponent(tagName: string, components?: Record<string, any>): any {
  if (!components) {
    return null
  }
  
  for (const [key, value] of Object.entries(components)) {
    if (key.toUpperCase() === tagName) {
      return value
    }
  }
  return null
}

/**
 * 构建组件 VNode
 */
function buildComponentVNode(el: Element, component: any, context: any): VNode {
  const componentProps: Record<string, any> = {}
  
  Array.from(el.attributes).forEach(attr => {
    const name = attr.name
    const value = attr.value
    
    // 处理绑定属性
    if (name.startsWith(':')) {
      const propName = name.slice(1)
      const propValue = evaluateExpression(value, context)
      if (propName !== 'key') {
        // 🔥 关键修复：DOM 属性名会被浏览器转为小写，需要转换回 camelCase
        // 例如：totalpages -> totalPages, currentpage -> currentPage
        const camelPropName = propName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
        componentProps[camelPropName] = propValue
      }
    }
    // 处理事件
    else if (name.startsWith('@')) {
      const eventName = name.slice(1) // 从 DOM 属性获取（已转小写）
      const handlerName = value // 父组件中的函数名（保持原始大小写）
      

      
      if (context[handlerName]) {
        // 🔥 关键修复：使用 handlerName 推断原始事件名，而不是依赖 DOM 属性名
        // 例如：handlerName = 'selectCategory' -> event = 'selectCategory' -> prop = 'onSelectCategory'
        const eventNameFromHandler = handlerName.charAt(0).toLowerCase() + handlerName.slice(1)
        componentProps[`on${handlerName.charAt(0).toUpperCase()}${handlerName.slice(1)}`] = context[handlerName]
      } else {
        console.warn('❌ 事件绑定失败: context 中找不到', handlerName)
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
    type: component,
    props: componentProps,
    children: []
  }
}

/**
 * 构建 Fragment VNode
 */
function buildFragmentVNode(el: Element, context: any, components?: Record<string, any>): VNode {
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

/**
 * 构建 Template VNode
 */
function buildTemplateVNode(el: Element, context: any, components?: Record<string, any>): VNode {
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

/**
 * 构建 SVG VNode
 */
function buildSvgVNode(el: Element, context: any, components?: Record<string, any>): VNode {
  const namespace = 'http://www.w3.org/2000/svg'
  const element = document.createElementNS(namespace, 'svg')
  const svgProps = parseAttributes(el, context, true)

  const children: any[] = []
  Array.from(el.childNodes).forEach(child => {
    const vnode = buildVNode(child, context, components)
    if (vnode) children.push(vnode)
  })

  return {
    type: 'svg',
    props: svgProps,
    children,
    el: element
  }
}

/**
 * 构建 SVG 子元素 VNode
 */
function buildSvgChildVNode(el: Element, context: any, components?: Record<string, any>): VNode {
  const namespace = 'http://www.w3.org/2000/svg'
  const tagName = el.tagName.toLowerCase()
  const element = document.createElementNS(namespace, tagName)
  const svgProps = parseAttributes(el, context, true)

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

/**
 * 构建 HTML VNode
 */
function buildHtmlVNode(el: Element, context: any, components?: Record<string, any>): VNode {
  const tagName = el.tagName.toLowerCase()
  const elementProps = parseAttributes(el, context, false)

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
