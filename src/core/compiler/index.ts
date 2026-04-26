/**
 * 编译器主入口 - 基于 mVue.ts 实现，支持 v-else
 */

import { h as hFn } from '../renderer/h'
import { tokenize } from './tokenizer'
import { parse } from './parser'
import { generate } from './generator'
import { normalizeClass as normalizeClassFn } from './normalizeClass'

// 编译后的渲染函数类型
export type CompiledRenderFn = (h: typeof hFn, ctx: Record<string, any>, normalizeClass: typeof normalizeClassFn) => any;

/**
 * 编译模板字符串为渲染函数
 */
export function compile(template: string): CompiledRenderFn {
  const tokens = tokenize(template);
  const ast = parse(tokens);
  
  // 调试日志：输出 AST 结构（仅对 BannerComponent）
  if (template.includes('bannerLists')) {
    // 简化输出，只显示标签层级
    const printAST = (node: any, indent: number = 0): string => {
      const prefix = '  '.repeat(indent);
      if (node.type === 'Element') {
        let result = `${prefix}<${node.tag}>\n`;
        if (node.children) {
          node.children.forEach((child: any) => {
            result += printAST(child, indent + 1);
          });
        }
        return result;
      } else if (node.type === 'Text') {
        return `${prefix}[TEXT]\n`;
      } else if (node.type === 'Interpolation') {
        return `${prefix}[{{ ${node.content} }}]\n`;
      }
      return '';
    };
    
    console.log('[Compile] AST 结构:\n', printAST(ast));
  }
  
  const code = generate(ast);
  
  // 调试日志：输出完整生成的代码（所有组件）
  console.log('[Compile] 生成的代码:', code);
  
  // 将 normalizeClass 作为第三个参数传递
  return new Function('h', 'ctx', 'normalizeClass', `return ${code}`) as CompiledRenderFn;
}

/**
 * 组件类型定义
 */
export interface ComponentOptions {
  setup?: (props: Record<string, any>, context: { emit: (event: string, ...args: any[]) => void }) => any;
  render?: CompiledRenderFn;
  template?: string;
  props?: string[];
  emits?: string[];
  [key: string]: any;
}

/**
 * 编译组件 - 将 template 转换为 render 函数
 */
export function compileComponent(component: ComponentOptions): ComponentOptions {
  if (!component.template) {
    return component;
  }
  
  const renderFn = compile(component.template as string);
  
  // 返回新的组件对象，包含编译后的 render 函数
  return {
    ...component,
    render: renderFn
  };
}

/**
 * 运行时模板编译器 - 兼容旧接口
 */
export function createRuntimeCompiler(template: string, components?: Record<string, any>): (props: Record<string, any>, setupState?: Record<string, any>) => any {
  const renderFn = compile(template);
  return function(props: Record<string, any>, setupState?: Record<string, any>) {
    // 将 components 合并到 ctx 中,这样模板中的组件标签才能找到对应的组件对象
    const ctx = { ...props, ...components, ...(setupState || {}) };
    console.log('[RuntimeCompiler] ctx:', ctx);
    console.log('[RuntimeCompiler] ctx.HeaderComponent:', ctx.HeaderComponent);
    return renderFn(hFn, ctx, normalizeClassFn);
  };
}

// 导出辅助函数供其他模块使用
export { normalizeClass } from './normalizeClass'
export type { ASTElement, ASTInterpolation, ASTText, ASTRoot, ASTNode } from './parser'