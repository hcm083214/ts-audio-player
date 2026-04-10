import { interpolate, evaluateExpression } from '../compiler/interpolate'

/**
 * 属性解析和事件处理相关的工具函数
 */

/**
 * 解析并绑定事件处理器
 * @param eventName 事件名称
 * @param handlerExpr 处理器表达式
 * @param context 上下文对象
 * @returns 事件处理函数
 */
export function parseEventHandler(eventName: string, handlerExpr: string, context: any): any {
  // 🔥 关键修复：支持函数调用表达式如 goTo(index) 和简单函数名如 prev
  const isSimpleCall = handlerExpr.match(/^(\w+)\(\)$/)  // prev() 形式
  const isParameterizedCall = handlerExpr.match(/^(\w+)\(([^)]*)\)$/)  // goTo(index) 形式
  const isFunctionName = /^\w+$/.test(handlerExpr)  // 简单函数名形式，如 prev
  
  if (isSimpleCall) {
    // 简单调用：直接使用 context 中的函数引用
    const funcName = isSimpleCall[1]
    const func = context[funcName]
    // 🔥 如果函数已经是一个函数，直接返回；否则包装一层
    return typeof func === 'function' ? func : () => {}
  } else if (isParameterizedCall) {
    // 带参数调用：需要包装函数传递参数
    const funcName = isParameterizedCall[1]
    const paramNames = isParameterizedCall[2].split(',').map(p => p.trim())
    
    return (...args: any[]) => {
      const func = context[funcName]
      if (typeof func === 'function') {
        // 🔥 关键修复：从 context 中获取参数的实际值
        const paramValues = paramNames.map(p => {
          // 尝试从 context 中获取参数值
          return p in context ? context[p] : undefined
        })
        // 将参数传递给函数
        return func.apply(context, paramValues)
      }
    }
  } else if (isFunctionName) {
    // 简单函数名：直接使用 context 中的函数引用
    const func = context[handlerExpr]
    return typeof func === 'function' ? func : () => {}
  } else {
    // 复杂表达式：使用原来的 evaluateExpression
    return () => {
      evaluateExpression(handlerExpr, context)
    }
  }
}

/**
 * 解析元素属性
 * @param el DOM 元素
 * @param context 上下文对象
 * @param isSvg 是否是 SVG 元素
 * @returns 解析后的属性对象
 */
export function parseAttributes(el: Element, context: any, isSvg: boolean = false): Record<string, any> {
  const props: Record<string, any> = {}
  const namespace = 'http://www.w3.org/2000/svg'
  
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
        props[camelPropName] = propValue
      }
    }
    // 处理事件
    else if (name.startsWith('@')) {
      const eventName = name.slice(1)
      props[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = 
        parseEventHandler(eventName, value, context)
    }
    // 处理 v-model
    else if (name === 'v-model') {
      const modelName = value
      props.value = context[modelName]
      props.onInput = (e: any) => {
        context[modelName] = e.target.value
      }
    }
    // 普通属性
    else {
      if (isSvg) {
        // SVG 属性的特殊处理
        parseSvgAttribute(el, name, value, props, namespace)
      } else {
        // HTML 属性的处理
        parseHtmlAttribute(name, value, context, props)
      }
    }
  })
  
  return props
}

/**
 * 解析 SVG 属性
 */
function parseSvgAttribute(
  el: Element,
  name: string,
  value: string,
  props: Record<string, any>,
  namespace: string
): void {
  // width、height 使用 setAttribute
  if (name === 'width' || name === 'height') {
    el.setAttribute(name, value)
    props[name] = value
  } else if (name === 'style') {
    el.setAttribute('style', value)
    props.style = value
  } else if (name === 'class') {
    el.setAttribute('class', value)
    props.className = value
  } else if (name.includes(':')) {
    const [prefix, localName] = name.split(':')
    if (prefix === 'xlink') {
      el.setAttributeNS('http://www.w3.org/1999/xlink', localName, value)
      props[name] = value
    } else if (prefix === 'xmlns') {
      el.setAttributeNS('http://www.w3.org/2000/xmlns/', localName, value)
      props[name] = value
    } else {
      el.setAttributeNS(namespace, localName, value)
      props[name] = value
    }
  } else {
    el.setAttributeNS(namespace, name, value)
    props[name] = value
  }
}

/**
 * 解析 HTML 属性
 */
function parseHtmlAttribute(
  name: string,
  value: string,
  context: any,
  props: Record<string, any>
): void {
  // width、height 不插值
  if (name === 'width' || name === 'height') {
    props[name] = value
  } else if (name === 'style') {
    props.style = value
  } else {
    const interpolatedValue = interpolate(value, context)
    if (name === 'class') {
      props.className = interpolatedValue
    } else {
      props[name] = interpolatedValue
    }
  }
}
