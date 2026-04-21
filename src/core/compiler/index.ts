/**
 * 编译器主入口 - 基于 mVue.ts 实现，支持 v-else
 */

import { h } from '../renderer/h'
import { tokenize } from './tokenizer'
import { parse } from './parser'
import { generate } from './generator'
import { normalizeClass } from './normalizeClass'

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

// 导出辅助函数供其他模块使用
export { normalizeClass } from './normalizeClass'
export type { ASTElement, ASTInterpolation, ASTText, ASTRoot, ASTNode } from './parser'
