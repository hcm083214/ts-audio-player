import { VNode } from './types'

/**
 * 更新元素属性
 * @param el DOM 元素
 * @param key 属性名
 * @param oldValue 旧值
 * @param newValue 新值
 */
export function patchProp(el: Element, key: string, oldValue: any, newValue: any): void {
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase()
    if (oldValue) {
      el.removeEventListener(eventName, oldValue)
    }
    if (newValue) {
      el.addEventListener(eventName, newValue)
    }
  } else if (key === 'className') {
    // 🔥 关键修复：SVG 元素的 className 是只读的，需要使用 setAttribute
    const namespaceURI = (el as SVGElement).namespaceURI
    if (namespaceURI === 'http://www.w3.org/2000/svg') {
      el.setAttributeNS('http://www.w3.org/2000/svg', 'class', newValue || '')
    } else {
      el.className = newValue || ''
    }
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
      // 🔥 关键修复：SVG 元素必须区分命名空间
      const namespaceURI = (el as SVGElement).namespaceURI
      
      if (key.includes(':')) {
        const [prefix, localName] = key.split(':')
        
        if (prefix === 'xlink') {
          el.setAttributeNS('http://www.w3.org/1999/xlink', localName, newValue)
        } else if (prefix === 'xmlns') {
          el.setAttributeNS('http://www.w3.org/2000/xmlns/', localName, newValue)
        } else if (prefix === 'xml') {
          el.setAttributeNS('http://www.w3.org/XML/1998/namespace', localName, newValue)
        } else {
          // 其他命名空间属性
          if (namespaceURI) {
            el.setAttributeNS(namespaceURI, key, newValue)
          } else {
            el.setAttribute(key, newValue)
          }
        }
      } else {
        // 🔥 关键修复：对于 SVG 元素，width 和 height 使用 setAttribute，其他属性使用 setAttributeNS
        if (namespaceURI === 'http://www.w3.org/2000/svg') {
          if (key === 'width' || key === 'height') {
            // SVG 的基本属性使用 setAttribute
            el.setAttribute(key, newValue)
          } else {
            // 其他 SVG 属性使用 setAttributeNS
            el.setAttributeNS('http://www.w3.org/2000/svg', key, newValue)
          }
        } else {
          el.setAttribute(key, newValue)
        }
      }
    }
  }
}
