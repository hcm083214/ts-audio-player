/**
 * AST 节点类型定义
 */

/**
 * AST 节点基础接口
 */
export interface ASTNode {
  type: 'Root' | 'Element' | 'Interpolation' | 'Text';
}

/**
 * AST 根节点
 */
export interface ASTRoot extends ASTNode {
  type: 'Root';
  children: ASTNode[];
}

/**
 * 指令对象
 */
export interface ASTDirectives {
  model?: string;      // v-model 绑定的变量
  for?: string;        // v-for 表达式
  if?: string;         // v-if 条件
  else?: boolean;      // v-else 标记
  [key: string]: any;
}

/**
 * AST 元素节点
 */
export interface ASTElement extends ASTNode {
  type: 'Element';
  tag: string;                    // 标签名
  props: Record<string, string>;  // 属性键值对
  directives: ASTDirectives;      // 指令
  children: ASTNode[];            // 子节点
  elseNode?: ASTElement;          // v-else 对应的节点（内部使用）
  _toRemove?: boolean;            // 标记是否应该被移除（内部使用）
}

/**
 * AST 插值节点（{{ }} 表达式）
 */
export interface ASTInterpolation extends ASTNode {
  type: 'Interpolation';
  content: string;  // 插值表达式内容
}

/**
 * AST 文本节点
 */
export interface ASTText extends ASTNode {
  type: 'Text';
  content: string;  // 文本内容
}
