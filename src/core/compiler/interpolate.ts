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
    
    // 使用 Function 构造函数创建一个函数，将上下文作为参数传递
    // 这样可以确保依赖收集能够正确进行，同时避免使用 with 语句
    const fn = new Function('context', `
      return function() {
        // 定义一个变量来存储结果
        let result;
        
        // 尝试执行表达式
        try {
          // 使用 context 作为作用域
          result = context.${expr};
        } catch (e) {
          // 如果直接访问失败，尝试执行表达式
          result = eval("(" + expr + ")");
        }
        
        return result;
      }
    `);
    
    // 调用函数，获取结果
    const result = fn(context)();
    
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
