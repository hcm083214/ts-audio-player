import { ref, compileComponent, useRouter, useRoute } from '../core'

const TestRouterComponent = {
  setup() {
    const message = ref('路由系统测试')
    
    // 获取路由实例和当前路由信息
    const router = useRouter()
    const route = useRoute()
    
    // 测试各种导航方法
    function testPush() {
      console.log('[TestRouter] 测试 push:', route)
      router.push('/home')
    }
    
    function testPushWithQuery() {
      console.log('[TestRouter] 测试 push with query')
      router.push({ 
        path: '/home', 
        query: { from: 'test', id: '123' } 
      })
    }
    
    function testReplace() {
      console.log('[TestRouter] 测试 replace')
      router.replace('/test')
    }
    
    function testBack() {
      console.log('[TestRouter] 测试 back')
      router.back()
    }
    
    function testForward() {
      console.log('[TestRouter] 测试 forward')
      router.forward()
    }
    
    return {
      message,
      route,
      testPush,
      testPushWithQuery,
      testReplace,
      testBack,
      testForward
    }
  },
  template: `
    <div>
      <!-- 这是一个测试注释 -->
      <h1>{{ message }}</h1>
      <!-- 另一个注释 -->
      <p>测试内容</p>
      <!-- 
        多行注释
        第二行
      -->
    </div>
  `
}

console.log('[TestRouter] 原始模板:', TestRouterComponent.template)

const compiledComponent = compileComponent(TestRouterComponent)

console.log('[TestRouter] 编译后的组件:', compiledComponent)

export default compiledComponent