/**
 * 语法分析器 - 包含属性解析和 AST 构建
 */

export interface ASTElement {
  type: 'Element';
  tag: string;
  props: any;
  directives: any;
  children: any[];
  elseNode?: ASTElement;
  _toRemove?: boolean;
}

export interface ASTInterpolation {
  type: 'Interpolation';
  content: string;
}

export interface ASTText {
  type: 'Text';
  content: string;
}

export interface ASTRoot {
  type: 'Root';
  children: any[];
}

export type ASTNode = ASTElement | ASTInterpolation | ASTText | ASTRoot;

/**
 * 解析属性字符串
 */
export function parseProps(attrStr: string) {
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
 * 语法分析：将 token 数组转换为 AST
 */
export function parse(tokens: any[]): ASTRoot {
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
