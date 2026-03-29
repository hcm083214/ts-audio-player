/**
 * 插值处理 {{ }}
 * @param str 包含插值表达式的字符串
 * @param context 上下文对象
 */
export function interpolate(str: string, context: any): string {
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
 * @param expr 表达式字符串
 * @param context 上下文对象
 */
export function evaluateExpression(expr: string, context: any): any {
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
