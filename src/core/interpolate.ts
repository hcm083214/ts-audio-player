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
    // 获取所有键并创建局部变量声明
    const keys = Object.keys(context)
    
    // 在 map 中访问 context[key] 时，如果是 RefImpl 则立即访问 .value 触发 getter
    const values = keys.map(key => {
      const value = context[key]
      // 如果是 RefImpl，立即访问 .value 触发 getter 进行依赖收集
      if (value && typeof value === 'object' && '_value' in value) {
        return value.value  // 这会触发 RefImpl.get！
      }
      return value
    })
    
    // 创建函数：function(playlists, topSongs, topArtists, loading) { return (expr) }
    const fn = new Function(...keys, `"use strict"; return (${expr})`)
    const result = fn(...values)
    
    return result
  } catch (e) {
    console.warn('Expression evaluation error:', expr, e)
    return undefined
  }
}
