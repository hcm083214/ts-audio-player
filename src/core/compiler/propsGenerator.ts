/**
 * 属性生成器 - 生成 h() 函数的 props 对象
 * 
 * 参照 Vue 3 源码及《Vue.js 设计与实现》设计
 */

import { ASTElement } from './parser'
import { replaceVarsInForScope, smartReplaceVariables } from './variableResolver'

/**
 * 生成属性绑定代码数组
 * @param propsToProcess 要处理的属性对象
 * @param itemVar v-for 作用域的迭代变量（可选）
 * @param indexVar v-for 作用域的索引变量（可选）
 * @param isCustomComponent 是否为自定义组件
 */
export function generatePropsEntries(
  propsToProcess: Record<string, any>,
  itemVar?: string,
  indexVar?: string,
  isCustomComponent?: boolean
): string[] {
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
          if (itemVar && (expr === itemVar || (indexVar && expr === indexVar))) {
            entries.push(`${JSON.stringify(propName)}: ${expr}`);
          } else {
            entries.push(`${JSON.stringify(propName)}: ctx.${expr}?.value ?? ctx.${expr}`);
          }
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
          handlerCode = replaceVarsInForScope(String(val), itemVar, indexVar);
        } else {
          // 🔥 只替换独立的变量，不替换属性访问链
          handlerCode = String(val).replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?!\.)/g, (varName: string) => {
            if (['value', 'target', 'event', 'e', '$event', 'true', 'false', 'null', 'undefined', 'this'].includes(varName)) {
              return varName;
            }
            return `ctx.${varName}.value`;
          });
        }
        entries.push(`${JSON.stringify(eventName)}: () => { ${handlerCode} }`);
      }
    } else {
      // 静态属性
      entries.push(`${JSON.stringify(key)}: ${JSON.stringify(val)}`);
    }
  }
  
  return entries;
}

/**
 * 生成 class 合并代码
 * @param staticClass 静态 class
 * @param dynamicClassExpr 动态 :class 表达式
 * @param itemVar v-for 作用域的迭代变量（可选）
 * @param indexVar v-for 作用域的索引变量（可选）
 */
export function generateClassEntry(
  staticClass: any,
  dynamicClassExpr: any,
  itemVar?: string,
  indexVar?: string
): string | null {
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
}

/**
 * 生成基础 h() 调用
 * @param node AST 节点
 * @param props 属性对象
 * @param staticClass 静态 class
 * @param dynamicClassExpr 动态 :class
 * @param isCustomComponent 是否为自定义组件
 * @param itemVar v-for 作用域的迭代变量（可选）
 * @param indexVar v-for 作用域的索引变量（可选）
 * @param genNode 递归生成子节点的函数
 */
export function generateBaseHCall(
  node: ASTElement,
  props: Record<string, any>,
  staticClass: any,
  dynamicClassExpr: any,
  isCustomComponent: boolean,
  itemVar?: string,
  indexVar?: string,
  genNode?: (node: any) => string
): string {
  const propsEntries = generatePropsEntries(props, itemVar, indexVar, isCustomComponent);
  
  // 处理 class 合并
  const classEntry = generateClassEntry(staticClass, dynamicClassExpr, itemVar, indexVar);
  if (classEntry) {
    propsEntries.unshift(classEntry);
  }
  
  const propsStr = `{${propsEntries.join(', ')}}`;
  const childrenStr = node.children.length && genNode ? `[${node.children.map(genNode).join(',')}]` : '[]';
  
  if (isCustomComponent) {
    const componentName = node.tag
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    
    return `h(ctx.${componentName}, ${propsStr}, ${childrenStr})`;
  } else {
    return `h('${node.tag}', ${propsStr}, ${childrenStr})`;
  }
}
