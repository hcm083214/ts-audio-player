/**
 * 插值处理 {{ }} - 简化实现，由编译器直接处理
 * @param str 包含插值表达式的字符串
 * @param context 上下文对象
 */
export function interpolate(str: string, context: Record<string, unknown>): string {
  if (!str) return str || ''
  
  return str.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
    try {
      const result = evaluateExpression(expr.trim(), context)
      return String(result ?? '')
    } catch (e) {
      console.warn('Interpolation error:', expr, e)
      return match
    }
  })
}

/**
 * 表达式求值 - 简化实现
 * @param expr 表达式字符串
 * @param context 上下文对象
 */
export function evaluateExpression(expr: string, context: Record<string, unknown>): unknown {
  try {
    // 使用 Function 构造器安全执行表达式
    const fn = new Function('ctx', `with(ctx) { return (${expr}); }`);
    return fn(context);
  } catch (e) {
    console.warn('Expression evaluation error:', expr, e);
    return undefined;
  }
}