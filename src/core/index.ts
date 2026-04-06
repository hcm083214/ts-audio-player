// Core 模块统一导出 - 主入口
// 从 renderer 导出所有核心功能（包括响应式系统和编译器）
export * from './renderer'

// 也可以单独导出各模块
// export * from './reactivity/reactive'
// export * from './renderer'
// export * from './compiler'