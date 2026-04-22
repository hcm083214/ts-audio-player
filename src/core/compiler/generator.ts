/**
 * 代码生成器 - 将 AST 转换为可执行代码
 */

import { ASTElement, ASTRoot, ASTNode } from './parser'

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
      // 插值表达式需要访问 .value 来解包 Ref
      return `String(ctx.${node.content}?.value ?? ctx.${node.content})`;
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
    return '';
  }

  // 辅助函数：智能替换变量，跳过字符串字面量和对象键名
  function smartReplaceVariables(expr: string): string {
    let result = '';
    let i = 0;
    const len = expr.length;
    
    while (i < len) {
      const char = expr[i];
      
      // 检测字符串字面量（单引号或双引号）
      if (char === '"' || char === "'") {
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
      // 检测对象键名模式：identifier followed by colon
      else if (/[a-zA-Z_$]/.test(char)) {
        let identifier = '';
        
        while (i < len && /[a-zA-Z0-9_$\-]/.test(expr[i])) {
          identifier += expr[i];
          i++;
        }
        
        // 跳过空白字符，检查是否是键名（后面跟着冒号）
        let j = i;
        while (j < len && /\s/.test(expr[j])) {
          j++;
        }
        
        if (j < len && expr[j] === ':') {
          // 这是对象键名，保持原样不替换
          result += identifier;
        } else {
          // 这是普通变量或值，需要替换
          if (['true', 'false', 'null', 'undefined', 'this', 'in', 'of'].includes(identifier)) {
            result += identifier;
          } else {
            result += `ctx.${identifier}.value`;
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

    // 属性绑定处理
    const propsEntries: string[] = [];
    
    // 处理其他属性（除了 class）
    for (const key in props) {
      const val = props[key];
      if (key.startsWith(':')) {
        // 动态绑定
        const propName = key.slice(1);
        const expr = String(val).trim();
        
        // 判断是否是简单标识符（如 :key="banner.id"）
        const isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(expr);
        
        if (isSimpleIdentifier) {
          // 简单标识符：直接使用 ctx.xxx
          if (isCustomComponent) {
            // 自定义组件：需要访问 .value 以解包 Ref
            propsEntries.push(`${JSON.stringify(propName)}: ctx.${expr}?.value ?? ctx.${expr}`);
          } else {
            // 普通 HTML 元素：直接使用 ctx.xxx
            propsEntries.push(`${JSON.stringify(propName)}: ctx.${expr}`);
          }
        } else {
          // 复杂表达式：智能替换其中的变量
          // 例如：'indicator-' + banner.id -> 'indicator-' + ctx.banner.id
          const processedExpr = expr.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (varName: string) => {
            // 跳过 JavaScript 关键字和特殊变量
            if (['value', 'target', 'event', 'e', '$event', 'true', 'false', 'null', 'undefined', 'this', 'String', 'Number', 'Boolean', 'Array', 'Object', 'Math', 'Date', 'JSON', 'console'].includes(varName)) {
              return varName;
            }
            // 将变量名替换为 ctx.xxx（不添加 .value，因为可能是嵌套属性访问）
            return `ctx.${varName}`;
          });
          
          propsEntries.push(`${JSON.stringify(propName)}: ${processedExpr}`);
        }
      } else if (key.startsWith('@')) {
        // 事件绑定：转换为 onClick 格式（大驼峰）
        const rawEventName = key.slice(1); // click, page-change, etc.
        // 将 kebab-case 转换为 PascalCase
        const pascalEventName = rawEventName
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        const eventName = 'on' + pascalEventName; // @click -> onClick, @page-change -> onPageChange
        
        // 判断是表达式还是函数引用
        // 如果是函数名（如 increment），直接使用 ctx.xxx
        // 如果是表达式（如 count++），需要将变量替换为 ctx.xxx.value
        const isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(val).trim());
        
        if (isSimpleIdentifier) {
          // 函数引用：increment -> ctx.increment
          propsEntries.push(`${JSON.stringify(eventName)}: ctx.${val}`);
        } else {
          // 表达式：count++ -> ctx.count.value++
          const handlerCode = String(val).replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (varName: string) => {
            // 跳过 JavaScript 关键字和特殊变量
            if (['value', 'target', 'event', 'e', '$event', 'true', 'false', 'null', 'undefined', 'this'].includes(varName)) {
              return varName;
            }
            // 将变量名替换为 ctx.xxx.value（因为都是 Ref 对象）
            return `ctx.${varName}.value`;
          });
          propsEntries.push(`${JSON.stringify(eventName)}: () => { ${handlerCode} }`);
        }
      } else {
        // 静态属性：使用 JSON.stringify 自动添加引号
        propsEntries.push(`${JSON.stringify(key)}: ${JSON.stringify(val)}`);
      }
    }
    
    // 处理 class 合并（静态 + 动态）- 参考《Vue.js 设计与实现》第 10.4 节
    if (staticClass || dynamicClassExpr) {
      let classCodeParts: string[] = [];
      
      // 添加静态 class
      if (staticClass) {
        classCodeParts.push(JSON.stringify(staticClass));
      }
      
      // 添加动态 :class - 保持表达式原样，只替换变量
      if (dynamicClassExpr) {
        // 检查是否是对象或数组字面量
        const trimmedExpr = String(dynamicClassExpr).trim();
        const isObjectOrArrayLiteral = trimmedExpr.startsWith('{') || trimmedExpr.startsWith('[');
        
        if (isObjectOrArrayLiteral) {
          // 对象/数组字面量：智能替换其中的变量
          const processedExpr = smartReplaceVariables(String(dynamicClassExpr));
          
          classCodeParts.push(processedExpr);
        } else {
          // 其他表达式（包括简单变量、三元表达式等）：使用 smartReplaceVariables 统一处理
          const processedExpr = smartReplaceVariables(String(dynamicClassExpr));
          
          classCodeParts.push(processedExpr);
        }
      }
      
      // 生成最终的 class 表达式
      if (classCodeParts.length === 1) {
        propsEntries.unshift(`${JSON.stringify('class')}: ${classCodeParts[0]}`);
      } else if (classCodeParts.length > 1) {
        // 多个部分需要合并：使用 normalizeClass 辅助函数
        propsEntries.unshift(`${JSON.stringify('class')}: normalizeClass([${classCodeParts.join(', ')}])`);
      }
    }
    
    const propsStr = `{${propsEntries.join(', ')}}`;
    const childrenStr = node.children.length ? `[${node.children.map(genNode).join(',')}]` : '[]';
    
    let hCode: string;
    
    if (isCustomComponent) {
      // 自定义组件：从 ctx 中获取组件对象
      // 将 kebab-case 转换为 camelCase，例如 m-component -> MComponent
      const componentName = node.tag
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      
      hCode = `h(ctx.${componentName}, ${propsStr}, ${childrenStr})`;
    } else {
      // 普通 HTML 元素
      hCode = `h('${node.tag}', ${propsStr}, ${childrenStr})`;
    }

    // 处理 v-for 逻辑
    let code = hCode;
    
    if (node.directives.for) {
      const forExpression = node.directives.for;
      // 解析 v-for 表达式：支持 "item in list" 或 "(item, index) in list" 格式
      const match = forExpression.match(/^\s*(?:\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*)?\)|([a-zA-Z_$][a-zA-Z0-9_$]*))\s+in\s+(.+)\s*$/);
      
      if (match) {
        const itemVar = match[1] || match[3]; // 元素变量名
        const indexVar = match[2]; // 索引变量名（可选）
        const sourceExpr = match[4].trim(); // 数据源表达式
        
        // 生成 map 函数的参数
        let mapParams = itemVar;
        if (indexVar) {
          mapParams += `, ${indexVar}`;
        }
        
        // 生成带作用域的子节点代码
        const generateScopedChildren = (children: ASTNode[]): string => {
          return children.map((child: ASTNode) => {
            if (child.type === 'Interpolation') {
              // 检查插值表达式是否引用了循环变量
              const content = child.content;
              
              // 如果引用了 item 或 index 变量，直接使用该变量（不需要 ctx 前缀）
              if (content === itemVar || (indexVar && content === indexVar)) {
                return `String(${content})`;
              }
              
              // 其他情况按正常逻辑处理（访问 ctx）
              return `String(ctx.${content}?.value ?? ctx.${content})`;
            } else if (child.type === 'Element') {
              // 递归处理嵌套元素，生成 h() 调用
              // 注意：这里简化处理，不处理嵌套元素的 v-for/v-if
              const nestedPropsEntries: string[] = [];
              for (const key in child.props || {}) {
                const val = child.props[key];
                if (key.startsWith(':')) {
                  nestedPropsEntries.push(`${JSON.stringify(key.slice(1))}: ctx.${val}`);
                } else if (key.startsWith('@')) {
                  const eventName = 'on' + key.slice(1);
                  nestedPropsEntries.push(`${JSON.stringify(eventName)}: ctx.${val}`);
                } else {
                  nestedPropsEntries.push(`${JSON.stringify(key)}: ${JSON.stringify(val)}`);
                }
              }
              const nestedPropsStr = `{${nestedPropsEntries.join(', ')}}`;
              const nestedChildrenStr = child.children.length ? `[${generateScopedChildren(child.children)}]` : '[]';
              return `h('${child.tag}', ${nestedPropsStr}, ${nestedChildrenStr})`;
            } else if (child.type === 'Text') {
              const escapedContent = child.content
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
              return `'${escapedContent}'`;
            }
            return '';
          }).join(',');
        };
        
        const scopedChildrenStr = `[${generateScopedChildren(node.children)}]`;
        const scopedHCode = `h('${node.tag}', ${propsStr}, ${scopedChildrenStr})`;
        
        // 获取数据源（需要解包 Ref）
        // sourceExpr 是变量名，需要通过 ctx 访问
        const sourceAccess = `(ctx.${sourceExpr}?.value ?? ctx.${sourceExpr})`;
        
        // 生成 map 调用
        code = `${sourceAccess}.map((${mapParams}) => ${scopedHCode})`;
      } else {
        console.warn('[Generate] v-for 表达式解析失败:', forExpression);
      }
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