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

  const attrMatches = attrStr.matchAll(/(\w+|:[\w-]+|v-[\w-]+)="([^"]*)"/g);
  for (const m of attrMatches) {
    const key = m[1];
    const value = m[2];
    if (key.startsWith(':')) props[key.slice(1)] = value;
    else if (key.startsWith('v-')) directives[key.slice(2)] = value;
    else props[key] = value;
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
        const match = template.slice(i).match(/^<\/\w+>/);
        if (match) {
          tokens.push({ type: 'TAG_END', value: match[0].slice(2, -1) });
          i += match[0].length;
        }
      } else {
        const match = template.slice(i).match(/^<\w+(\s[^>]*)?>/);
        if (match) {
          const tagContent = match[0];
          const tagName = tagContent.slice(1).split(/\s/)[0];
          const attrsStr = tagContent.slice(1 + tagName.length, -1);
          const { props, directives } = parseProps(attrsStr);
          tokens.push({ type: 'TAG_START', value: tagName, props, directives });
          i += tagContent.length;
        }
      }
    } else if (char === '{') {
      const match = template.slice(i).match(/^\{\{([^}]+)\}\}/);
      if (match) {
        tokens.push({ type: 'INTERPOLATION', value: match[1].trim() });
        i += match[0].length;
      }
    } else {
      const match = template.slice(i).match(/^[^{<]+/);
      if (match) {
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
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.directives && child.directives.else) {
        // 找到前一个非 v-else 节点（通常是 v-if）
        let prevIndex = i - 1;
        while(prevIndex >= 0 && children[prevIndex].directives && children[prevIndex].directives.else) {
          prevIndex--;
        }
        if (prevIndex >= 0) {
          // 将 else 逻辑附加到前一个节点
          children[prevIndex].elseNode = child;
          // 标记当前节点稍后删除
          child._toRemove = true;
        }
      }
      if (child.children) processIfElse(child.children);
    }
    // 移除标记的节点
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i]._toRemove) children.splice(i, 1);
    }
  }
  
  processIfElse(ast.children);

  function genNode(node: any): string {
    if (node.type === 'Root') {
      return `h('div', {}, [${node.children.map(genNode).join(',')}])`;
    } 
    else if (node.type === 'Element') {
      return genElementContent(node);
    } 
    else if (node.type === 'Interpolation') {
      return `ctx.${node.content}`;
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

  function genElementContent(node: ASTElement): string {
    let props = { ...node.props };
    
    // v-model 支持
    if (node.directives.model) {
      const modelVar = node.directives.model;
      props[':value'] = `ctx.${modelVar}`;
      props['@input'] = `$event => (ctx.${modelVar} = $event.target.value)`;
    }

    // 属性绑定处理
    const finalProps: any = {};
    for (const key in props) {
      const val = props[key];
      if (key.startsWith(':')) finalProps[key.slice(1)] = `ctx.${val}`;
      else if (key.startsWith('@')) finalProps[key] = val;
      else {
        // 转义属性值中的特殊字符
        const escapedVal = val
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        finalProps[key] = `'${escapedVal}'`;
      }
    }
    
    const propsStr = JSON.stringify(finalProps).replace(/"ctx\.(.*?)"/g, '$1').replace(/"\$event/g, '$event');
    const childrenStr = node.children.length ? `[${node.children.map(genNode).join(',')}]` : '[]';
    const hCode = `h('${node.tag}', ${propsStr}, ${childrenStr})`;

    // 处理 v-if / v-else 逻辑
    let code = hCode;
    
    if (node.directives.if) {
      if (node.elseNode) {
        // 生成 else 节点的代码
        const elseProps = JSON.stringify(node.elseNode.props || {}).replace(/"ctx\.(.*?)"/g, '$1');
        const elseChildren = node.elseNode.children.length ? `[${node.elseNode.children.map(genNode).join(',')}]` : '[]';
        const elseCode = `h('${node.elseNode.tag}', ${elseProps}, ${elseChildren})`;
        
        code = `${node.directives.if} ? ${code} : ${elseCode}`;
      } else {
        code = `${node.directives.if} ? ${code} : null`;
      }
    }

    return code;
  }

  return genNode(ast);
}

/**
 * 编译模板字符串为渲染函数
 */
export function compile(template: string) {
  const tokens = tokenize(template);
  const ast = parse(tokens);
  const code = generate(ast);
  return new Function('h', 'ctx', `return ${code}`);
}

/**
 * 运行时模板编译器 - 兼容旧接口
 */
export function createRuntimeCompiler(template: string, components?: Record<string, any>): (props: any, setupState?: any) => any {
  const renderFn = compile(template);
  return function(props: any, setupState?: any) {
    const ctx = { ...props, ...(setupState || {}) };
    return renderFn(h, ctx);
  };
}

/**
 * 编译组件 - 兼容旧接口
 */
export function compileComponent(component: any) {
  if (!component.template) {
    return component;
  }
  
  const renderFunction = createRuntimeCompiler(component.template, component.components);
  
  return {
    ...component,
    render: renderFunction
  };
}
