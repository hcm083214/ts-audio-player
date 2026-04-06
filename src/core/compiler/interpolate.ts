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
    
    // 🔥 关键修复：构建一个包含所有上下文属性和全局对象的执行环境
    // 这样可以确保表达式能够正确访问循环变量、响应式数据和全局对象
    
    // 收集上下文中的所有键
    const contextKeys = Object.keys(context || {})
    
    // 定义常用的全局对象，防止 "xxx is not defined" 错误
    const globalObjects = ['Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean']
    
    // 构建参数列表和函数体
    const paramList = [...contextKeys, ...globalObjects].join(', ')
    
    // 构建上下文值数组
    const contextValues = contextKeys.map(key => context[key])
    const globalValues = globalObjects.map(name => (window as any)[name])
    
    // 使用 Function 构造函数创建一个函数
    // 将所有上下文变量和全局对象作为参数传入
    const fn = new Function(
      paramList,
      `
        return function() {
          try {
            // 直接执行表达式，此时所有变量都在作用域中
            return (${expr});
          } catch (e) {
            console.warn('Expression execution error:', '${expr}', e);
            return undefined;
          }
        }
      `
    )
    
    // 调用函数，传入所有上下文值和全局对象
    const result = fn(...contextValues, ...globalValues)()
    
    // 🔥 关键修复：如果结果是 RefImpl 对象，返回它的 .value 属性
    // 这样在布尔上下文中会正确评估 ref 的值
    if (result && typeof result === 'object' && '_value' in result) {
      return result.value;
    }
    
    return result;
  } catch (e) {
    console.warn('Expression evaluation error:', expr, e);
    return undefined;
  }
}
