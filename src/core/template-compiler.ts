// 向后兼容：重新导出 compileComponent 的内容
// 这样现有的导入 '../core/template-compiler' 仍然可以工作
export { compileComponent, createRuntimeCompiler } from './compileComponent'
export { buildVNode } from './buildVNode'
export { interpolate, evaluateExpression } from './interpolate'
