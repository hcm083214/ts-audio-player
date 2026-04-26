/**
 * 变量解析器 - 处理表达式中的变量替换和作用域管理
 * 
 * 参照 Vue 3 源码及《Vue.js 设计与实现》设计
 */

/**
 * 处理插值表达式中的变量替换
 * 例如：formatPlayCount(playlist.playCount) -> ctx.formatPlayCount(ctx.playlist.playCount)
 *       playlist.name -> ctx.playlist.name
 */
export function processInterpolationExpr(expr: string): string {
  let result = '';
  let i = 0;
  const len = expr.length;
  
  while (i < len) {
    const char = expr[i];
    
    // 检测字符串字面量（保持原样）
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      result += char;
      i++;
      
      while (i < len && expr[i] !== quote) {
        if (expr[i] === '\\') {
          result += expr[i];
          i++;
          if (i < len) {
            result += expr[i];
            i++;
          }
        } else {
          result += expr[i];
          i++;
        }
      }
      
      if (i < len) {
        result += expr[i];
        i++;
      }
    }
    // 检测标识符
    else if (/[a-zA-Z_$]/.test(char)) {
      let identifier = '';
      
      while (i < len && /[a-zA-Z0-9_$]/.test(expr[i])) {
        identifier += expr[i];
        i++;
      }
      
      // 检查后面是否跟着点号（属性访问）或左括号（函数调用）
      let j = i;
      while (j < len && /\s/.test(expr[j])) {
        j++;
      }
      
      const isPropertyAccess = j < len && expr[j] === '.';
      const isFunctionCall = j < len && expr[j] === '(';
      
      if (isFunctionCall) {
        // 函数调用：只给函数名添加 ctx. 前缀
        result += `ctx.${identifier}`;
        
        // 处理函数参数
        let parenDepth = 1;
        let k = j + 1;
        
        let argsContent = '';
        while (k < len && parenDepth > 0) {
          if (expr[k] === '(') {
            parenDepth++;
          } else if (expr[k] === ')') {
            parenDepth--;
            if (parenDepth === 0) {
              break;
            }
          }
          argsContent += expr[k];
          k++;
        }
        
        // 递归处理参数
        const processedArgs = processInterpolationExpr(argsContent);
        result += `(${processedArgs})`;
        
        i = k + 1;
      } else if (isPropertyAccess) {
        // 属性访问链：只给根变量添加 ctx. 前缀
        result += `ctx.${identifier}`;
        
        // 处理整个属性访问链
        while (i < len && expr[i] === '.') {
          result += expr[i];
          i++;
          
          let propName = '';
          while (i < len && /[a-zA-Z0-9_$]/.test(expr[i])) {
            propName += expr[i];
            i++;
          }
          result += propName;
        }
      } else {
        // 独立变量：添加 ctx. 前缀和 .value
        result += `ctx.${identifier}.value`;
      }
    } else {
      // 其他字符
      result += char;
      i++;
    }
  }
  
  return result;
}

/**
 * 在 v-for 作用域内智能替换变量
 * @param expr 表达式
 * @param itemVar 迭代变量名（如 banner）
 * @param indexVar 索引变量名（如 index，可选）
 */
export function replaceVarsInForScope(expr: string, itemVar: string, indexVar?: string): string {
  let result = '';
  let i = 0;
  const len = expr.length;
  
  while (i < len) {
    const char = expr[i];
    
    // 检测字符串字面量（保持原样）
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      result += char;
      i++;
      
      while (i < len && expr[i] !== quote) {
        if (expr[i] === '\\') {
          result += expr[i];
          i++;
          if (i < len) {
            result += expr[i];
            i++;
          }
        } else {
          result += expr[i];
          i++;
        }
      }
      
      if (i < len) {
        result += expr[i];
        i++;
      }
    }
    // 检测标识符
    else if (/[a-zA-Z_$]/.test(char)) {
      let identifier = '';
      
      while (i < len && /[a-zA-Z0-9_$\-]/.test(expr[i])) {
        identifier += expr[i];
        i++;
      }
      
      // 跳过空白字符，检查是否是对象键名（后面跟着冒号）
      let j = i;
      while (j < len && /\s/.test(expr[j])) {
        j++;
      }
      
      const isObjectKey = j < len && expr[j] === ':';
      
      if (isObjectKey) {
        // 这是对象键名，保持原样不替换
        result += identifier;
      } else {
        // 检查后面是否跟着点号（属性访问）
        const isPropertyAccess = j < len && expr[j] === '.';
        const isFunctionCall = j < len && expr[j] === '(';
        
        if (isPropertyAccess) {
          // 🔥 这是对象.属性的形式（如 playlist.coverImgUrl）
          let baseVar = '';
          
          if (identifier === itemVar || (indexVar && identifier === indexVar)) {
            // 作用域变量的属性访问：banner.id -> banner.id
            baseVar = identifier;
          } else {
            // 外部变量的属性访问：playlist.coverImgUrl -> ctx.playlist.coverImgUrl
            baseVar = `ctx.${identifier}`;
          }
          
          result += baseVar;
          
          // 处理整个属性访问链（.xxx.yyy.zzz）
          while (i < len && expr[i] === '.') {
            // 添加点号
            result += expr[i];
            i++;
            
            // 提取属性名
            let propName = '';
            while (i < len && /[a-zA-Z0-9_$\-]/.test(expr[i])) {
              propName += expr[i];
              i++;
            }
            result += propName;
          }
          
          // 🔥 关键：处理完属性访问链后，直接进入下一轮循环
          continue;
        } else if (isFunctionCall) {
          // 🔥 这是函数调用（如 formatPlayCount(...)）
          // 只添加 ctx. 前缀，不要添加 .value
          result += `ctx.${identifier}`;
          
          // 🔥 关键：递归处理括号内的参数
          let parenDepth = 1;
          let j = i + 1; // 跳过 '('
          
          let argsContent = '';
          while (j < len && parenDepth > 0) {
            if (expr[j] === '(') {
              parenDepth++;
            } else if (expr[j] === ')') {
              parenDepth--;
              if (parenDepth === 0) {
                break;
              }
            }
            argsContent += expr[j];
            j++;
          }
          
          // 递归处理括号内的内容（需要传递 itemVar 和 indexVar 以正确处理作用域变量）
          const processedArgs = replaceVarsInForScope(argsContent, itemVar, indexVar);
          result += `(${processedArgs})`;
          
          // 更新 i 到右括号的位置之后，并继续处理下一个字符
          i = j + 1;
          continue;
        } else {
          // 独立变量
          if (['value', 'target', 'event', 'e', '$event', 'true', 'false', 'null', 'undefined', 'this', 
               'String', 'Number', 'Boolean', 'Array', 'Object', 'Math', 'Date', 'JSON', 'console'].includes(identifier)) {
            result += identifier;
          } else if (identifier === itemVar || (indexVar && identifier === indexVar)) {
            // 作用域变量（不需要 .value）
            result += identifier;
          } else {
            // 外部变量：需要添加 .value 解包 Ref
            result += `ctx.${identifier}.value`;
          }
        }
      }
    } else {
      // 其他字符（运算符、标点等）
      result += char;
      i++;
    }
  }
  
  return result;
}

/**
 * 智能替换变量，跳过字符串字面量、对象键名和属性访问
 * 用于非 v-for 作用域的表达式处理
 */
export function smartReplaceVariables(expr: string): string {
  let result = '';
  let i = 0;
  const len = expr.length;
  
  while (i < len) {
    const char = expr[i];
    
    // 检测字符串字面量（单引号、双引号或反引号）
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      result += char;
      i++;
      
      // 提取字符串内容，保持原样
      while (i < len && expr[i] !== quote) {
        if (expr[i] === '\\') {
          result += expr[i];
          i++;
          if (i < len) {
            result += expr[i];
            i++;
          }
        } else {
          result += expr[i];
          i++;
        }
      }
      
      if (i < len) {
        result += expr[i];
        i++;
      }
    } 
    // 检测标识符
    else if (/[a-zA-Z_$]/.test(char)) {
      let identifier = '';
      
      while (i < len && /[a-zA-Z0-9_$\-]/.test(expr[i])) {
        identifier += expr[i];
        i++;
      }
      
      // 跳过空白字符，检查是否是对象键名（后面跟着冒号）
      let j = i;
      while (j < len && /\s/.test(expr[j])) {
        j++;
      }
      
      const isObjectKey = j < len && expr[j] === ':';
      
      if (isObjectKey) {
        // 这是对象键名，保持原样不替换
        result += identifier;
      } else {
        // 检查后面是否跟着点号（属性访问）或左括号（函数调用）
        const isPropertyAccess = j < len && expr[j] === '.';
        const isFunctionCall = j < len && expr[j] === '(';
        
        if (isPropertyAccess) {
          // 🔥 这是对象.属性的形式（如 playlist.coverImgUrl）
          // 只给根变量添加 ctx. 前缀，不要添加 .value
          result += `ctx.${identifier}`;
          
          // 处理整个属性访问链（.xxx.yyy.zzz）
          while (i < len && expr[i] === '.') {
            // 添加点号
            result += expr[i];
            i++;
            
            // 提取属性名
            let propName = '';
            while (i < len && /[a-zA-Z0-9_$\-]/.test(expr[i])) {
              propName += expr[i];
              i++;
            }
            result += propName;
          }
          
          // 🔥 关键：处理完属性访问链后，直接进入下一轮循环
          continue;
        } else if (isFunctionCall) {
          // 🔥 这是函数调用（如 formatPlayCount(...)）
          // 只添加 ctx. 前缀，不要添加 .value
          result += `ctx.${identifier}`;
          
          // 🔥 关键：递归处理括号内的参数
          let parenDepth = 1;
          let j = i + 1; // 跳过 '('
          
          let argsContent = '';
          while (j < len && parenDepth > 0) {
            if (expr[j] === '(') {
              parenDepth++;
            } else if (expr[j] === ')') {
              parenDepth--;
              if (parenDepth === 0) {
                break;
              }
            }
            argsContent += expr[j];
            j++;
          }
          
          // 递归处理括号内的内容
          const processedArgs = smartReplaceVariables(argsContent);
          result += `(${processedArgs})`;
          
          // 更新 i 到右括号的位置之后，并继续处理下一个字符
          i = j + 1;
          continue;
        } else {
          // 独立变量
          if (['true', 'false', 'null', 'undefined', 'this', 'in', 'of'].includes(identifier)) {
            result += identifier;
          } else {
            result += `ctx.${identifier}.value`;
          }
        }
      }
    } else {
      // 其他字符（空格、标点等），保持原样
      result += char;
      i++;
    }
  }
  
  return result;
}
