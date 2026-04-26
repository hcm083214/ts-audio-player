/**
 * 指令处理器 - 处理 Vue 指令的编译逻辑（v-for, v-if/v-else）
 * 
 * 参照 Vue 3 源码及《Vue.js 设计与实现》设计
 */

import { ASTElement, ASTNode } from './parser'
import { generatePropsEntries, generateClassEntry, generateBaseHCall } from './propsGenerator'

/**
 * 预处理 AST：将 v-else 挂载到 v-if 上
 * @param children AST 子节点数组
 */
export function processIfElse(children: ASTNode[]): void {
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

/**
 * 生成 v-for 指令的代码
 * @param node AST 节点
 * @param props 属性对象
 * @param staticClass 静态 class
 * @param dynamicClassExpr 动态 :class
 * @param isCustomComponent 是否为自定义组件
 * @param genNode 递归生成子节点的函数
 * @param generateScopedChildren 生成作用域内子节点的辅助函数
 */
export function generateVForCode(
  node: ASTElement,
  props: Record<string, any>,
  staticClass: any,
  dynamicClassExpr: any,
  isCustomComponent: boolean,
  genNode: (node: ASTNode) => string,
  generateScopedChildren: (children: ASTNode[], itemVar: string, indexVar?: string) => string
): string | null {
  if (!node.directives.for) {
    return null;
  }
  
  const forExpression = node.directives.for;
  const match = forExpression.match(/^\s*(?:\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*)?\)|([a-zA-Z_$][a-zA-Z0-9_$]*))\s+in\s+(.+)\s*$/);
  
  if (!match) {
    console.warn('[Generate] v-for 表达式解析失败:', forExpression);
    return null;
  }
  
  const itemVar = match[1] || match[3];
  const indexVar = match[2];
  const sourceExpr = match[4].trim();
  
  let mapParams = itemVar;
  if (indexVar) {
    mapParams += `, ${indexVar}`;
  }
  
  // 为当前节点生成带作用域的 h() 调用
  const scopedPropsEntries = generatePropsEntries(props, itemVar, indexVar, isCustomComponent);
  const scopedClassEntry = generateClassEntry(staticClass, dynamicClassExpr, itemVar, indexVar);
  if (scopedClassEntry) scopedPropsEntries.unshift(scopedClassEntry);
  
  const scopedPropsStr = `{${scopedPropsEntries.join(', ')}}`;
  const scopedChildrenStr = `[${generateScopedChildren(node.children, itemVar, indexVar)}]`;
  
  const scopedHCode = isCustomComponent 
    ? `h(ctx.${node.tag.split('-').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}, ${scopedPropsStr}, ${scopedChildrenStr})`
    : `h('${node.tag}', ${scopedPropsStr}, ${scopedChildrenStr})`;
  
  const sourceAccess = `(ctx.${sourceExpr}?.value ?? ctx.${sourceExpr})`;
  
  const code = `${sourceAccess}.map((${mapParams}) => ${scopedHCode})`;
  
  // 🔥 调试日志：输出 v-for 编译结果
  console.log(`[Generate] v-for 编译: sourceExpr=${sourceExpr}, itemVar=${itemVar}, indexVar=${indexVar}`);
  console.log(`[Generate] v-for 编译结果: ${code}`);
  
  return code;
}

/**
 * 生成 v-if/v-else 指令的代码
 * @param baseCode 基础代码（可能已经包含 v-for 生成的代码）
 * @param node AST 节点
 * @param genNode 递归生成子节点的函数
 */
export function generateVIfCode(
  baseCode: string,
  node: ASTElement,
  genNode: (node: ASTNode) => string
): string {
  if (!node.directives.if) {
    return baseCode;
  }
  
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
    // 生成 else 节点的代码
    const elseProps: Record<string, string | number | boolean | null | undefined> = { ...node.elseNode.props };
    
    // 处理 else 节点的属性绑定
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
    
    return `${ifCondition} ? ${baseCode} : ${elseCode}`;
  } else {
    return `${ifCondition} ? ${baseCode} : null`;
  }
}
