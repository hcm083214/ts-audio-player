import { ref, compileComponent } from '../core'

const TestCommentComponent = {
  setup() {
    const message = ref('Hello World')
    
    return {
      message
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

// 在编译前打印原始模板
console.log('[TestComment] 原始模板:', TestCommentComponent.template)

const compiledComponent = compileComponent(TestCommentComponent)

// 编译后打印render函数
console.log('[TestComment] 编译后的组件:', compiledComponent)

export default compiledComponent
