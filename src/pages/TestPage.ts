import { compileComponent } from '../core/compiler/compileComponent'

const TestPage = {
    setup(){
        return {} // setup 必须返回一个对象
    },
    template: `
        <div class="p-4">
            <svg width="16" height="16" class="text-red-500 inline-block" style="display: inline-block;">
                <use href="#icon-next" width="100%" height="100%"></use>
            </svg>
            <h1 class="text-2xl font-bold mb-4">测试页面</h1>
            <p>这是一个测试页面，用于验证路由和组件渲染是否正常。</p>
        </div>
    `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(TestPage)

export default compiledComponent