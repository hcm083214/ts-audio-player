import { compileComponent, ref } from '../core'

const TestPage = {
    setup() {
        const count = ref(0)
        const increment = () => {
            count.value++
            console.log("🚀 ~ increment ~ count.value:", count.value)
        }
        const decrease = () => {
            count.value--
            console.log("🚀 ~ decrease ~ count.value:", count.value)
        }
        const arr = [1, 2, 3]
        const isDisplay = ref(false)
        return { count, increment, decrease, arr, isDisplay } // setup 必须返回一个对象
    },
    template: `
        <div class="p-4">
            <svg width="16" height="16" class="text-red-500 inline-block" style="display: inline-block;">
                <use href="#icon-next" width="100%" height="100%"></use>
            </svg>
            <h1 class="text-2xl font-bold mb-4">测试页面</h1>
            <p>这是一个测试页面，用于验证路由和组件渲染是否正常。</p>
            <button @click="count++">点击增加</button>
            <button @click="increment">点击增加</button>
            <button @click="decrease">点击减少</button>
            <p>计数: {{ count }}</p>
            <div v-for="i in arr">{{ i }}</div>
            <button @click="isDisplay = !isDisplay">切换显示</button>

            <div v-if="isDisplay">显示的内容</div>
            <div v-else>隐藏的内容</div>
        </div>
    `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(TestPage)

export default compiledComponent