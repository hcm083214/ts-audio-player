import { compileComponent } from '../core/compiler/compileComponent'

const TestPage = {
    setup(){},
    template: `
        <div class="p-4">
            <h1 class="text-2xl font-bold mb-4">测试页面</h1>
            <p>这是一个测试页面，用于验证路由和组件渲染是否正常。</p>
        </div>
    `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(TestPage)

export default compiledComponent