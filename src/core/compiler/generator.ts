/**
 * 代码生成器 - 将 AST 转换为可执行代码
 */

import { ASTElement, ASTRoot, ASTNode } from './parser'

/**
 * 处理插值表达式中的变量替换
 * 例如：formatPlayCount(playlist.playCount) -> ctx.formatPlayCount(ctx.playlist.playCount)
 *       playlist.name -> ctx.playlist.name
 */
function processInterpolationExpr(expr: string): string {
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
 * 代码生成：将 AST 转换为可执行代码
 */
export function generate(ast: ASTRoot): string {
  // 预处理 AST：将 v-else 挂载到 v-if 上
  function processIfElse(children: ASTNode[]) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      
      if ((child as ASTElement).directives && 'else' in (child as ASTElement).directives) {
        // 找到前一个有 v-if 指令的节点
        let prevIndex = i - 1;
        
        // 向前查找，跳过所有非 v-if 节点
        while(prevIndex >= 0) {
          const prevNode = children[prevIndex] as ASTElement;
          
          // 如果找到 v-if 节点，停止
          if (prevNode && prevNode.directives && prevNode.directives.if) {
            break;
          }
          
          // 否则继续向前找
          prevIndex--;
        }
        
        if (prevIndex >= 0 && (children[prevIndex] as ASTElement).directives && (children[prevIndex] as ASTElement).directives.if) {
          // 将 else 逻辑附加到前一个节点
          (children[prevIndex] as ASTElement).elseNode = child as ASTElement;
          // 标记当前节点稍后删除
          (child as ASTElement)._toRemove = true;
        }
      }
      if ((child as ASTElement).children && (child as ASTElement).children.length > 0) {
        processIfElse((child as ASTElement).children);
      }
    }
    // 移除标记的节点
    for (let i = children.length - 1; i >= 0; i--) {
      if ((children[i] as ASTElement)._toRemove) {
        children.splice(i, 1);
      }
    }
  }
  
  processIfElse(ast.children);

  function genNode(node: ASTNode): string {
    if (node.type === 'Root') {
      // 如果只有一个子节点，直接返回该节点的代码
      if (node.children.length === 1) {
        return genNode(node.children[0]);
      }
      // 如果有多个子节点，用数组包裹
      return `[${node.children.map(genNode).join(',')}]`;
    } 
    else if (node.type === 'Element') {
      return genElementContent(node);
    } 
    else if (node.type === 'Interpolation') {
      // 插值表达式需要正确处理函数调用、属性访问和变量
      // 使用专门的处理函数来解析插值表达式
      return `String((${processInterpolationExpr(node.content)}))`;
    } 
    else if (node.type === 'Text') {
      // 转义特殊字符，防止生成的代码出现语法错误
      const escapedContent = node.content
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `'${escapedContent}'`;
    }
    else if (node.type === 'Comment') {
      // 注释节点：在开发环境中保留注释，生产环境中可以移除
      // 这里选择生成一个返回 null 的表达式，表示不渲染任何内容
      // 如果需要保留注释用于调试，可以改为返回注释节点
      return 'null';
    }
    return '';
  }

  // 辅助函数：在 v-for 作用域内智能替换变量
  function replaceVarsInForScope(expr: string, itemVar: string, indexVar?: string): string {
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
            // 不要执行后面的独立变量处理逻辑，也不要跳过空白字符
            continue;
          } else if (isFunctionCall) {
            // 🔥 这是函数调用（如 formatPlayCount(...)）
            // 只添加 ctx. 前缀，不要添加 .value
            result += `ctx.${identifier}`;
            
            // 🔥 关键：递归处理括号内的参数
            // i 当前指向 '('
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

  // 辅助函数：智能替换变量，跳过字符串字面量、对象键名和属性访问
  function smartReplaceVariables(expr: string): string {
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
            // 不要跳过空白字符，让它们在下一次循环中被正常处理
            continue;
          } else if (isFunctionCall) {
            // 🔥 这是函数调用（如 formatPlayCount(...)）
            // 只添加 ctx. 前缀，不要添加 .value
            result += `ctx.${identifier}`;
            
            // 🔥 关键：递归处理括号内的参数
            // i 当前指向 '('
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

  function genElementContent(node: ASTElement): string {
    let props = { ...node.props };
    
    // v-model 支持
    if (node.directives.model) {
      const modelVar = node.directives.model;
      props[':value'] = `ctx.${modelVar}`;
      props['@input'] = `$event => (ctx.${modelVar} = $event.target.value)`;
    }

    // 分离静态 class 和动态 :class
    let staticClass = props['class'];
    delete props['class']; // 从 props 中移除，稍后合并
    
    let dynamicClassExpr = props[':class'];
    delete props[':class']; // 从 props 中移除，稍后处理

    // 判断是否为自定义组件
    // Vue 约定：包含连字符（kebab-case）或首字母大写（PascalCase）的标签名都是组件
    const isCustomComponent = node.tag.includes('-') || /^[A-Z]/.test(node.tag);

    // 生成属性绑定代码的辅助函数（可重用）
    const generatePropsEntries = (propsToProcess: Record<string, any>, itemVar?: string, indexVar?: string): string[] => {
      const entries: string[] = [];
      
      for (const key in propsToProcess) {
        const val = propsToProcess[key];
        if (key.startsWith(':')) {
          // 动态绑定
          const propName = key.slice(1);
          const expr = String(val).trim();
          
          
          // 判断是否是简单标识符
          const isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(expr);
          
          if (isSimpleIdentifier) {
            // 检查是否包含点号（属性访问）
            const hasDot = expr.includes('.');
            
            if (hasDot && itemVar) {
              // 属性访问：提取根变量名
              const rootVar = expr.split('.')[0];
              
              if (rootVar === itemVar || (indexVar && rootVar === indexVar)) {
                // 根变量是作用域变量，整个表达式保持不变
                entries.push(`${JSON.stringify(propName)}: ${expr}`);
              } else {
                // 根变量是外部变量，添加 ctx. 前缀到根变量
                const restPath = expr.substring(rootVar.length); // .picUrl
                entries.push(`${JSON.stringify(propName)}: ctx.${rootVar}${restPath}`);
              }
            } else if (itemVar && (expr === itemVar || (indexVar && expr === indexVar))) {
              // 直接使用作用域变量（无属性访问）
              entries.push(`${JSON.stringify(propName)}: ${expr}`);
            } else if (isCustomComponent) {
              // 自定义组件：需要访问 .value 以解包 Ref
              entries.push(`${JSON.stringify(propName)}: ctx.${expr}?.value ?? ctx.${expr}`);
            } else {
              // 普通 HTML 元素：直接使用 ctx.xxx
              entries.push(`${JSON.stringify(propName)}: ctx.${expr}`);
            }
          } else {
            // 复杂表达式：智能替换其中的变量
            let processedExpr: string;
            if (itemVar) {
              // 在 v-for 作用域内
              processedExpr = replaceVarsInForScope(expr, itemVar, indexVar);
            } else {
              // 不在 v-for 作用域内，使用 smartReplaceVariables
              processedExpr = smartReplaceVariables(expr);
            }
            
            entries.push(`${JSON.stringify(propName)}: ${processedExpr}`);
          }
        } else if (key.startsWith('@')) {
          // 事件绑定：转换为 onClick 格式（大驼峰）
          const rawEventName = key.slice(1);
          const pascalEventName = rawEventName
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
          const eventName = 'on' + pascalEventName;
          
          const isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(val).trim());
          
          if (isSimpleIdentifier) {
            // 函数引用
            if (itemVar && (String(val).trim() === itemVar || (indexVar && String(val).trim() === indexVar))) {
              entries.push(`${JSON.stringify(eventName)}: ${val}`);
            } else {
              entries.push(`${JSON.stringify(eventName)}: ctx.${val}`);
            }
          } else {
            // 表达式
            let handlerCode: string;
            if (itemVar) {
              // 🔥 关键修复：replaceVarsInForScope 已经处理了响应式变量的 .value 解包
              // 不需要再次应用替换规则，直接使用其返回值
              handlerCode = replaceVarsInForScope(String(val), itemVar, indexVar);
              
              // 🔥 调试日志：输出 handlerCode
              console.log('[Compile] 事件处理器原始值:', val);
              console.log('[Compile] 事件处理器 itemVar:', itemVar, 'indexVar:', indexVar);
              console.log('[Compile] 事件处理器处理后:', handlerCode);
            } else {
              // 🔥 同样修复：只替换独立的变量，不替换属性访问链
              // 使用负向前瞻 (?!\.) 排除后面跟着点号的情况
              handlerCode = String(val).replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?!\.)/g, (varName: string) => {
                if (['value', 'target', 'event', 'e', '$event', 'true', 'false', 'null', 'undefined', 'this'].includes(varName)) {
                  return varName;
                }
                return `ctx.${varName}.value`;
              });
            
              // 🔥 调试日志：输出 handlerCode
              console.log('[Compile] 事件处理器原始值:', val);
              console.log('[Compile] 事件处理器处理后:', handlerCode);
            }
            entries.push(`${JSON.stringify(eventName)}: () => { ${handlerCode} }`);
          }
        } else {
          // 静态属性
          entries.push(`${JSON.stringify(key)}: ${JSON.stringify(val)}`);
        }
      }
      
      return entries;
    };

    // 生成 class 合并代码的辅助函数
    const generateClassEntry = (staticClass: any, dynamicClassExpr: any, itemVar?: string, indexVar?: string): string | null => {
      if (!staticClass && !dynamicClassExpr) return null;
      
      let classCodeParts: string[] = [];
      
      if (staticClass) {
        classCodeParts.push(JSON.stringify(staticClass));
      }
      
      if (dynamicClassExpr) {
        const trimmedExpr = String(dynamicClassExpr).trim();
        
        let processedExpr: string;
        if (itemVar) {
          // 在 v-for 作用域内
          processedExpr = replaceVarsInForScope(String(dynamicClassExpr), itemVar, indexVar);
        } else {
          // 不在 v-for 作用域内
          processedExpr = smartReplaceVariables(String(dynamicClassExpr));
        }
        
        classCodeParts.push(processedExpr);
      }
      
      if (classCodeParts.length === 1) {
        return `${JSON.stringify('class')}: ${classCodeParts[0]}`;
      } else if (classCodeParts.length > 1) {
        return `${JSON.stringify('class')}: normalizeClass([${classCodeParts.join(', ')}])`;
      }
      
      return null;
    };

    // 生成基础 h() 调用的辅助函数
    const generateBaseHCall = (customPropsEntries?: string[]): string => {
      const propsEntries = customPropsEntries || generatePropsEntries(props);
      
      // 处理 class 合并
      const classEntry = generateClassEntry(staticClass, dynamicClassExpr);
      if (classEntry) {
        propsEntries.unshift(classEntry);
      }
      
      const propsStr = `{${propsEntries.join(', ')}}`;
      const childrenStr = node.children.length ? `[${node.children.map(genNode).join(',')}]` : '[]';
      
      if (isCustomComponent) {
        const componentName = node.tag
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        
        return `h(ctx.${componentName}, ${propsStr}, ${childrenStr})`;
      } else {
        return `h('${node.tag}', ${propsStr}, ${childrenStr})`;
      }
    };

    // 处理 v-for 逻辑
    let code: string;
    
    if (node.directives.for) {
      const forExpression = node.directives.for;
      const match = forExpression.match(/^\s*(?:\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*)?\)|([a-zA-Z_$][a-zA-Z0-9_$]*))\s+in\s+(.+)\s*$/);
      
      if (match) {
        const itemVar = match[1] || match[3];
        const indexVar = match[2];
        const sourceExpr = match[4].trim();
        
        let mapParams = itemVar;
        if (indexVar) {
          mapParams += `, ${indexVar}`;
        }
        
        // 关键修复：在 v-for 作用域内生成子节点代码，传递 itemVar 和 indexVar
        const generateScopedChildren = (children: ASTNode[], scopeItemVar: string, scopeIndexVar?: string): string => {
          return children.map((child: ASTNode) => {
            if (child.type === 'Interpolation') {
              const content = child.content;
              
              if (content === scopeItemVar || (scopeIndexVar && content === scopeIndexVar)) {
                return `String(${content})`;
              }
              
              return `String(ctx.${content}?.value ?? ctx.${content})`;
            } else if (child.type === 'Element') {
              // 递归处理嵌套元素，传递作用域变量
              const scopedPropsEntries = generatePropsEntries(child.props || {}, scopeItemVar, scopeIndexVar);
              const scopedClassEntry = generateClassEntry(null, null, scopeItemVar, scopeIndexVar);
              if ((child as ASTElement).props && (child as ASTElement).props[':class']) {
                const classEntry = generateClassEntry(null, (child as ASTElement).props[':class'], scopeItemVar, scopeIndexVar);
                if (classEntry) scopedPropsEntries.unshift(classEntry);
              }
              
              const nestedPropsStr = `{${scopedPropsEntries.join(', ')}}`;
              const nestedChildrenStr = child.children.length ? `[${generateScopedChildren(child.children, scopeItemVar, scopeIndexVar)}]` : '[]';
              
              const isChildCustomComponent = child.tag.includes('-') || /^[A-Z]/.test(child.tag);
              if (isChildCustomComponent) {
                const componentName = child.tag
                  .split('-')
                  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                  .join('');
                return `h(ctx.${componentName}, ${nestedPropsStr}, ${nestedChildrenStr})`;
              } else {
                return `h('${child.tag}', ${nestedPropsStr}, ${nestedChildrenStr})`;
              }
            } else if (child.type === 'Text') {
              const escapedContent = child.content
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
              return `'${escapedContent}'`;
            } else if (child.type === 'Comment') {
              return 'null';
            }
            return '';
          }).join(',');
        };
        
        const scopedChildrenStr = `[${generateScopedChildren(node.children, itemVar, indexVar)}]`;
        
        // 为当前节点生成带作用域的 h() 调用
        const scopedPropsEntries = generatePropsEntries(props, itemVar, indexVar);
        const scopedClassEntry = generateClassEntry(staticClass, dynamicClassExpr, itemVar, indexVar);
        if (scopedClassEntry) scopedPropsEntries.unshift(scopedClassEntry);
        
        const scopedPropsStr = `{${scopedPropsEntries.join(', ')}}`;
        const scopedHCode = isCustomComponent 
          ? `h(ctx.${node.tag.split('-').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}, ${scopedPropsStr}, ${scopedChildrenStr})`
          : `h('${node.tag}', ${scopedPropsStr}, ${scopedChildrenStr})`;
        
        const sourceAccess = `(ctx.${sourceExpr}?.value ?? ctx.${sourceExpr})`;
        
        code = `${sourceAccess}.map((${mapParams}) => ${scopedHCode})`;
        
      } else {
        console.warn('[Generate] v-for 表达式解析失败:', forExpression);
        code = generateBaseHCall();
      }
    } else {
      // 没有 v-for，使用基础逻辑
      code = generateBaseHCall();
    }
    
    // 处理 v-if / v-else 逻辑（在 v-for 之后处理）
    if (node.directives.if) {
      // v-if 条件表达式需要通过 ctx 访问变量
      const ifCondition = node.directives.if.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (varName: string) => {
        // 跳过 JavaScript 关键字和特殊值
        if (['true', 'false', 'null', 'undefined', 'this'].includes(varName)) {
          return varName;
        }
        // 将变量名替换为 ctx.xxx.value（因为都是 Ref 对象）
        return `ctx.${varName}.value`;
      });
      
      if (node.elseNode) {
        // 生成 else 节点的代码 - 需要完整处理属性绑定
        const elseProps: Record<string, string | number | boolean | null | undefined> = { ...node.elseNode.props };
        
        // 处理 else 节点的属性绑定（与主节点相同的逻辑）
        const elsePropsEntries: string[] = [];
        for (const key in elseProps) {
          const val = elseProps[key];
          if (key.startsWith(':')) {
            // 动态绑定
            elsePropsEntries.push(`${JSON.stringify(key.slice(1))}: ctx.${val}`);
          } else if (key.startsWith('@')) {
            // 事件绑定
            const eventName = 'on' + key.slice(1);
            const isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(val).trim());
            
            if (isSimpleIdentifier) {
              elsePropsEntries.push(`${JSON.stringify(eventName)}: ctx.${val}`);
            } else {
              const handlerCode = String(val).replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (varName: string) => {
                if (['value', 'target', 'event', 'e', '$event', 'true', 'false', 'null', 'undefined', 'this'].includes(varName)) {
                  return varName;
                }
                return `ctx.${varName}.value`;
              });
              elsePropsEntries.push(`${JSON.stringify(eventName)}: () => { ${handlerCode} }`);
            }
          } else {
            // 静态属性
            elsePropsEntries.push(`${JSON.stringify(key)}: ${JSON.stringify(val)}`);
          }
        }
        
        const elsePropsStr = `{${elsePropsEntries.join(', ')}}`;
        const elseChildren = node.elseNode.children.length ? `[${node.elseNode.children.map(genNode).join(',')}]` : '[]';
        const elseCode = `h('${node.elseNode.tag}', ${elsePropsStr}, ${elseChildren})`;
        
        code = `${ifCondition} ? ${code} : ${elseCode}`;
      } else {
        code = `${ifCondition} ? ${code} : null`;
      }
    }

    return code;
  }

  return genNode(ast);
}