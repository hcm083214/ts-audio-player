/**
 * 代码生成器 - 将 AST 转换为可执行代码（主入口）
 * 
 * 参照 Vue 3 源码及《Vue.js 设计与实现》设计
 * 模块化架构：variableResolver + propsGenerator + directiveHandler
 */

import { ASTElement, ASTRoot, ASTNode } from './parser'
import { processInterpolationExpr } from './variableResolver'
import { generatePropsEntries, generateClassEntry, generateBaseHCall } from './propsGenerator'
import { processIfElse, generateVForCode, generateVIfCode } from './directiveHandler'

/**
 * 代码生成：将 AST 转换为可执行代码
 * @param ast AST 根节点
 * @returns 生成的渲染函数字符串
 */
export function generate(ast: ASTRoot): string {
  // 预处理 AST：将 v-else 挂载到 v-if 上
  processIfElse(ast.children);

  /**
   * 在 v-for 作用域内生成子节点代码
   * @param children 子节点数组
   * @param scopeItemVar 作用域迭代变量
   * @param scopeIndexVar 作用域索引变量（可选）
   */
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
        const scopedPropsEntries = generatePropsEntries(child.props || {}, scopeItemVar, scopeIndexVar, false);
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

  /**
   * 生成单个节点的代码
   * @param node AST 节点
   */
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
      // 注释节点：不渲染任何内容
      return 'null';
    }
    return '';
  }

  /**
   * 生成元素节点的内容
   * @param node AST 元素节点
   */
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
    delete props['class'];
    
    let dynamicClassExpr = props[':class'];
    delete props[':class'];

    // 判断是否为自定义组件
    const isCustomComponent = node.tag.includes('-') || /^[A-Z]/.test(node.tag);

    // 处理 v-for 逻辑
    let code: string;
    
    const vForCode = generateVForCode(
      node,
      props,
      staticClass,
      dynamicClassExpr,
      isCustomComponent,
      genNode,
      generateScopedChildren
    );
    
    if (vForCode !== null) {
      code = vForCode;
    } else {
      // 没有 v-for，使用基础逻辑
      code = generateBaseHCall(node, props, staticClass, dynamicClassExpr, isCustomComponent, undefined, undefined, genNode);
    }
    
    // 处理 v-if / v-else 逻辑（在 v-for 之后处理）
    code = generateVIfCode(code, node, genNode);

    return code;
  }

  return genNode(ast);
}
