import { h, ref, computed, reactive, onMounted } from '../core'

// 测试组件
const TestComponent = {
  setup() {
    const count = ref(0)
    const message = ref('Hello Vue 3 Style!')
    
    const doubleCount = computed(() => count.value * 2)
    
    const user = reactive({
      name: '张三',
      age: 25
    })
    
    const increment = () => {
      count.value++
    }
    
    const decrement = () => {
      count.value--
    }
    
    onMounted(() => {
      console.log('✅ Component mounted!')
    })
    
    return {
      count,
      message,
      doubleCount,
      user,
      increment,
      decrement
    }
  },
  
  render(props: any, state: any) {
    return h('div', { className: 'p-4' }, [
      h('h1', { className: 'text-2xl font-bold mb-4' }, 'Vue 3 Style 响应式系统测试'),
      
      h('div', { className: 'mb-4' }, [
        h('p', { className: 'text-lg' }, `消息: ${state.message}`),
        h('p', { className: 'text-lg' }, `计数: ${state.count}`),
        h('p', { className: 'text-lg' }, `双倍计数: ${state.doubleCount}`),
        h('p', { className: 'text-lg' }, `用户: ${state.user.name}, 年龄: ${state.user.age}`)
      ]),
      
      h('div', { className: 'flex gap-2' }, [
        h('button', { 
          className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600',
          onClick: state.decrement
        }, '-'),
        
        h('button', { 
          className: 'px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600',
          onClick: state.increment
        }, '+')
      ])
    ])
  }
}

export default TestComponent
