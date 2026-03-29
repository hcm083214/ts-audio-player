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

  // 元素节点
  if (element.nodeType === Node.ELEMENT_NODE) {
    const el = element as Element
    const tagName = el.tagName.toLowerCase()
    const originalTagName = el.tagName

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
        // 处理 v-if
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
      const hasVIf = el.hasAttribute('v-if')
      const hasVElse = el.hasAttribute('v-else')
      const hasVElseIf = el.hasAttribute('v-else-if')

      if (hasVIf) {
        const conditionExpr = el.getAttribute('v-if')
        if (!conditionExpr) return null
        const conditionValue = evaluateExpression(conditionExpr, context)
        
        if (!conditionValue) {
          return null
        }
      }

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
          const handlerName = value
          if (context[handlerName]) {
            svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
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

    // 处理 v-if
    const vIfAttr = Array.from(el.attributes).find(attr => attr.name === 'v-if')
    if (vIfAttr) {
      const conditionExpr = vIfAttr.value
      const conditionValue = evaluateExpression(conditionExpr, context)
      if (!conditionValue) {
        return null
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
          const handlerName = value
          if (context[handlerName]) {
            svgProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
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
        const handlerName = value
        if (context[handlerName]) {
          elementProps[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = context[handlerName]
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

  return null
}
