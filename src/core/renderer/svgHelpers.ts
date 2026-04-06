/**
 * SVG 相关的辅助函数
 */

/**
 * 判断元素是否应该作为 SVG 子元素处理
 * @param node DOM 元素
 */
export function isSvgChild(node: Element): boolean {
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
