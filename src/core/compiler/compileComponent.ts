/**
 * 编译器 - 基于 mVue.ts 实现，支持 v-else
 */

import { h } from '../renderer/h'

interface ASTElement {
  type: 'Element';
  tag: string;
  props: any;
  directives: any;
  children: any[];
  elseNode?: ASTElement;
  _toRemove?: boolean;
}

interface ASTInterpolation {
  type: 'Interpolation';
  content: string;
}

interface ASTText {
  type: 'Text';
  content: string;
}

interface ASTRoot {
  type: 'Root';
  children: any[];
}

type ASTNode = ASTElement | ASTInterpolation | ASTText | ASTRoot;

/**
 * 解析属性字符串
 */
function parseProps(attrStr: string) {
  const props: any = {};
  const directives: any = {};
  if (!attrStr) return { props, directives };

  // 改进的正则：支持包含引号、花括号、冒号等复杂值的属性
  // 匹配模式：属性名（可选的 ="属性值"）
  // 属性值可以是双引号包裹的任何内容（包括嵌套的单引号、花括号等）
  const attrRegex = /([\w:@-]+)\s*=\s*"((?:[^"\\]|\\.)*)"|([\w:@-]+)\s*=\s*'((?:[^'\\]|\\.)*)'|([\w:@-]+)/g;
  let match;
  
  while ((match = attrRegex.exec(attrStr)) !== null) {
    let key: string;
    let value: string | undefined;
    
    console.log('[ParseProps] 完整匹配结果:', match);
    
    if (match[1]) {
      // 双引号属性值
      key = match[1];
      value = match[2];
      console.log('[ParseProps] 匹配到双引号属性:', key, '=', value);
    } else if (match[3]) {
      // 单引号属性值
      key = match[3];
      value = match[4];
      console.log('[ParseProps] 匹配到单引号属性:', key, '=', value);
    } else {
      // 无值属性（布尔属性）
      key = match[5];
      value = undefined;
      console.log('[ParseProps] 匹配到无值属性:', key);
    }
    
    if (key.startsWith(':')) {
      // 动态绑定：保留原始键名（带冒号），在后续处理时再区分
      props[key] = value;
      console.log('[ParseProps] 动态绑定属性:', key, '=', value);
    } else if (key.startsWith('@')) {
      // 事件绑定
      props[key] = value;
      console.log('[ParseProps] 事件绑定属性:', key, '=', value);
    } else if (key.startsWith('v-')) {
      // 指令：v-else 没有值，其他指令可能有值
      const directiveName = key.slice(2); // else, if, for, etc.
      directives[directiveName] = value === undefined ? '' : value;
      console.log('[ParseProps] 指令属性:', key, '=', value);
    } else {
      // 普通属性
      props[key] = value;
      console.log('[ParseProps] 静态属性:', key, '=', value);
    }
  }
  return { props, directives };
}

/**
 * 词法分析：将模板字符串转换为 token 数组
 */
function tokenize(template: string) {
  const tokens: any[] = [];
  let i = 0;
  while (i < template.length) {
    const char = template[i];
    if (char === '<') {
      if (template[i + 1] === '/') {
        // 使用捕获组准确提取结束标签名
        const match = template.slice(i).match(/^<\/(\w+)>/);
        if (match) {
          console.log('[Tokenize] 结束标签:', match[1], '完整匹配:', match[0]);
          tokens.push({ type: 'TAG_END', value: match[1] });
          i += match[0].length;
        } else {
          // 如果匹配失败，将当前字符视为普通文本
          console.log('[Tokenize] 结束标签匹配失败，当前位置:', i, '内容:', template.slice(i, i + 10));
          tokens.push({ type: 'TEXT', value: char });
          i++;
        }
      } else {
        // 使用 [\s\S] 替代 . 以匹配包括换行符在内的所有字符
        const match = template.slice(i).match(/^<(\w+)([\s\S]*?)>/);
        if (match) {
          const tagName = match[1]; // 直接从捕获组获取标签名
          const attrsStr = match[2] || ''; // 属性字符串（可能为空，包含换行符）
          const { props, directives } = parseProps(attrsStr);
          console.log('[Tokenize] 开始标签:', tagName, '属性:', props, '指令:', directives, '完整匹配:', match[0]);
          tokens.push({ type: 'TAG_START', value: tagName, props, directives });
          i += match[0].length;
        }
      }
    } else if (char === '{') {
      const match = template.slice(i).match(/^\{\{([^}]+)\}\}/);
      if (match) {
        const trimmedValue = match[1].trim();
        console.log('[Tokenize] 插值: 原始值="' + match[1] + '", 修剪后="' + trimmedValue + '"');
        tokens.push({ type: 'INTERPOLATION', value: trimmedValue });
        i += match[0].length;
      }
    } else {
      const match = template.slice(i).match(/^[^{<]+/);
      if (match) {
        console.log('[Tokenize] 文本:', match[0], '完整匹配:', match[0]);
        tokens.push({ type: 'TEXT', value: match[0] });
        i += match[0].length;
      }
    }
  }
  return tokens;
}

/**
 * 语法分析：将 token 数组转换为 AST
 */
function parse(tokens: any[]) {
  const root: ASTRoot = { type: 'Root', children: [] };
  const stack: any[] = [root];
  
  tokens.forEach(token => {
    const parent = stack[stack.length - 1];
    if (token.type === 'TAG_START') {
      const element: ASTElement = { 
        type: 'Element', 
        tag: token.value, 
        props: token.props || {}, 
        directives: token.directives || {},
        children: [] 
      };
      parent.children.push(element);
      stack.push(element);
    } else if (token.type === 'TAG_END') {
      stack.pop();
    } else if (token.type === 'INTERPOLATION') {
      parent.children.push({ type: 'Interpolation', content: token.value });
    } else if (token.type === 'TEXT') {
      parent.children.push({ type: 'Text', content: token.value });
    }
  });
  return root;
}

/**
 * 代码生成：将 AST 转换为可执行代码
 */
function generate(ast: any) {
  // 预处理 AST：将 v-else 挂载到 v-if 上
  function processIfElse(children: any[]) {
    console.log('[AST] processIfElse 开始处理，子节点数量:', children.length);
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      console.log('[AST] 检查节点', i, ':', child.tag, '指令:', child.directives);
      
      if (child.directives && 'else' in child.directives) {
        console.log('[AST] ✓ 找到 v-else 节点:', child.tag, '索引:', i);
        
        // 找到前一个有 v-if 指令的节点
        let prevIndex = i - 1;
        console.log('[AST] 开始向前查找 v-if，起始索引:', prevIndex);
        
        // 向前查找，跳过所有非 v-if 节点
        while(prevIndex >= 0) {
          const prevNode = children[prevIndex];
          console.log('[AST] 检查索引', prevIndex, ':', prevNode?.tag, '指令:', prevNode?.directives);
          
          // 如果找到 v-if 节点，停止
          if (prevNode && prevNode.directives && prevNode.directives.if) {
            console.log('[AST] ✓ 找到匹配的 v-if 节点，索引:', prevIndex);
            break;
          }
          
          // 否则继续向前找
          prevIndex--;
        }
        
        if (prevIndex >= 0 && children[prevIndex].directives && children[prevIndex].directives.if) {
          // 将 else 逻辑附加到前一个节点
          children[prevIndex].elseNode = child;
          // 标记当前节点稍后删除
          child._toRemove = true;
          console.log('[AST] ✓ v-else 已挂载到节点:', children[prevIndex].tag);
        } else {
          console.warn('[AST] ✗ v-else 没有找到匹配的 v-if 节点，prevIndex:', prevIndex);
        }
      } else {
        console.log('[AST] 节点', i, '不是 v-else，跳过');
      }
      if (child.children && child.children.length > 0) {
        console.log('[AST] 递归处理子节点:', child.tag);
        processIfElse(child.children);
      }
    }
    // 移除标记的节点
    console.log('[AST] 移除前子节点数量:', children.length);
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i]._toRemove) {
        console.log('[AST] 移除 v-else 节点:', children[i].tag);
        children.splice(i, 1);
      }
    }
    console.log('[AST] 移除后子节点数量:', children.length);
  }
  
  console.log('[AST] 开始处理 AST，根节点子节点数量:', ast.children.length);
  processIfElse(ast.children);
  console.log('[AST] AST 处理完成，根节点子节点数量:', ast.children.length);

  function genNode(node: any): string {
    if (node.type === 'Root') {
      return `h('div', {}, [${node.children.map(genNode).join(',')}])`;
    } 
    else if (node.type === 'Element') {
      return genElementContent(node);
    } 
    else if (node.type === 'Interpolation') {
      console.log('[Generate] 插值节点 content:', JSON.stringify(node.content));
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

  // 辅助函数：处理 class 表达式中的变量（对象语法）
  function processClassExpression(expr: string): string {
    // 将表达式中的变量替换为 ctx.xxx.value
    const processed = expr.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (varName: string) => {
      // 跳过 JavaScript 关键字、布尔值、字符串键等
      if (['true', 'false', 'null', 'undefined', 'this'].includes(varName)) {
        return varName;
      }
      // 检查是否在字符串内部（简单判断：前后有引号）
      // 这里简化处理，假设所有标识符都是变量
      return `ctx.${varName}.value`;
    });
    return processed;
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

    // 属性绑定处理
    const propsEntries: string[] = [];
    
    // 处理其他属性（除了 class）
    for (const key in props) {
      const val = props[key];
      if (key.startsWith(':')) {
        // 动态绑定：直接使用 ctx.xxx（不加引号）
        console.log('[Generate] 动态绑定:', key.slice(1), '=', val);
        propsEntries.push(`${JSON.stringify(key.slice(1))}: ctx.${val}`);
      } else if (key.startsWith('@')) {
        // 事件绑定：转换为 onClick 格式（大驼峰）
        const rawEventName = key.slice(1); // click, page-change, etc.
        // 将 kebab-case 转换为 PascalCase
        const pascalEventName = rawEventName
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        const eventName = 'on' + pascalEventName; // @click -> onClick, @page-change -> onPageChange
        
        console.log('[Generate] 事件绑定:', key, '->', eventName, '=', val);
        
        // 判断是表达式还是函数引用
        // 如果是函数名（如 increment），直接使用 ctx.xxx
        // 如果是表达式（如 count++），需要将变量替换为 ctx.xxx.value
        const isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(val.trim());
        
        if (isSimpleIdentifier) {
          // 函数引用：increment -> ctx.increment
          propsEntries.push(`${JSON.stringify(eventName)}: ctx.${val}`);
        } else {
          // 表达式：count++ -> ctx.count.value++
          const handlerCode = val.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (varName: string) => {
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
        const trimmedExpr = dynamicClassExpr.trim();
        const isObjectOrArrayLiteral = trimmedExpr.startsWith('{') || trimmedExpr.startsWith('[');
        
        if (isObjectOrArrayLiteral) {
          // 对象/数组字面量：智能替换其中的变量
          const processedExpr = smartReplaceVariables(dynamicClassExpr);
          
          console.log('[Generate] :class 复杂表达式:', dynamicClassExpr, '->', processedExpr);
          
          classCodeParts.push(processedExpr);
        } else {
          // 其他表达式（包括简单变量、三元表达式等）：使用 smartReplaceVariables 统一处理
          const processedExpr = smartReplaceVariables(dynamicClassExpr);
          
          console.log('[Generate] :class 表达式:', dynamicClassExpr, '->', processedExpr);
          
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
    const hCode = `h('${node.tag}', ${propsStr}, ${childrenStr})`;

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
        
        console.log('[Generate] v-for 解析:', { itemVar, indexVar, sourceExpr });
        
        // 生成 map 函数的参数
        let mapParams = itemVar;
        if (indexVar) {
          mapParams += `, ${indexVar}`;
        }
        
        console.log('[Generate] v-for 生成的 map 参数:', mapParams);
        
        // 生成带作用域的子节点代码
        const generateScopedChildren = (children: any[]): string => {
          return children.map((child: any) => {
            if (child.type === 'Interpolation') {
              // 检查插值表达式是否引用了循环变量
              const content = child.content;
              
              // 如果引用了 item 或 index 变量，直接使用该变量（不需要 ctx 前缀）
              if (content === itemVar || (indexVar && content === indexVar)) {
                console.log('[Generate] v-for 作用域变量:', content);
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
        
        console.log('[Generate] v-for 数据源访问:', sourceAccess);
        
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
      
      console.log('[Generate] v-if 条件:', node.directives.if, '->', ifCondition);
      
      if (node.elseNode) {
        // 生成 else 节点的代码 - 需要完整处理属性绑定
        const elseProps: any = { ...node.elseNode.props };
        
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
            const isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(val.trim());
            
            if (isSimpleIdentifier) {
              elsePropsEntries.push(`${JSON.stringify(eventName)}: ctx.${val}`);
            } else {
              const handlerCode = val.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (varName: string) => {
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

/**
 * normalizeClass 辅助函数 - 参考《Vue.js 设计与实现》第 7.7 节
 * 用于规范化 class 值，支持字符串、对象、数组等多种格式
 */
function normalizeClass(value: any): string {
  if (!value) return '';
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (Array.isArray(value)) {
    // 数组：递归处理每个元素，然后合并
    return value.map(item => normalizeClass(item)).filter(Boolean).join(' ');
  }
  
  if (typeof value === 'object') {
    // 对象：{ className: boolean }
    let result = '';
    for (const key in value) {
      if (value[key]) {
        result += (result ? ' ' : '') + key;
      }
    }
    return result;
  }
  
  return String(value);
}

/**
 * 编译模板字符串为渲染函数
 */
export function compile(template: string): (h: Function, ctx: any, normalizeClass: Function) => any {
  const tokens = tokenize(template);
  const ast = parse(tokens);
  const code = generate(ast);
  console.log('[Compile] 生成的代码:', code);
  // 将 normalizeClass 作为第三个参数传递
  return new Function('h', 'ctx', 'normalizeClass', `return ${code}`) as any;
}

/**
 * 编译组件 - 将 template 转换为 render 函数
 */
export function compileComponent(component: any): any {
  if (!component.template) {
    return component;
  }
  
  const renderFn = compile(component.template);
  
  // 返回新的组件对象，包含编译后的 render 函数
  return {
    ...component,
    render: renderFn
  };
}

/**
 * 运行时模板编译器 - 兼容旧接口
 */
export function createRuntimeCompiler(template: string, components?: Record<string, any>): (props: any, setupState?: any) => any {
  const renderFn = compile(template);
  return function(props: any, setupState?: any) {
    const ctx = { ...props, ...(setupState || {}) };
    return renderFn(h, ctx, normalizeClass);
  };
}
