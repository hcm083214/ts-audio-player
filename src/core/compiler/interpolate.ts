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
    // 🔥 关键修复：创建代理对象，自动解包 Ref/Computed
    // 这样在 with 语句中访问变量时，会自动返回 .value
    
    // 定义常用的全局对象，防止 "xxx is not defined" 错误
    const globalObjects = ['Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean']
    
    // 创建代理上下文，拦截属性访问以自动解包 Ref
    const proxyContext = new Proxy(context || {}, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver)
        // 如果值是 Ref 或 ComputedRef，自动返回 .value
        if (value && typeof value === 'object' && '_value' in value) {
          return value.value
        }
        return value
      }
    })
    
    // 构建参数列表：ctx + 全局对象
    const paramList = ['ctx', ...globalObjects].join(', ')
    
    // 使用 with 语句创建执行环境
    const fn = new Function(
      paramList,
      `
        return function() {
          try {
            with (ctx) {
              return (${expr});
            }
          } catch (e) {
            console.warn('Expression execution error:', e);
            return undefined;
          }
        }
      `
    )
    
    // 调用函数，传入代理后的上下文和全局对象
    const globalValues = globalObjects.map(name => (window as any)[name])
    const result = fn(proxyContext, ...globalValues)()
    
    return result;
  } catch (e) {
    console.warn('Expression evaluation error:', expr, e);
    return undefined;
  }
}
