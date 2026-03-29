import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'

const IconComponent = {
  setup(props: any) {
    // props 可能是响应式代理对象，需要安全地访问
    const getName = () => {
      try {
        console.log("🚀 ~ getName ~ props?.name:", props?.iconName)
        return props?.name || ''
      } catch (e) {
        console.error('Failed to access props.name:', e)
        return ''
      }
    }
    
    const name: string = '#icon-' + getName()
    const width: number = props?.width || 24
    const height: number = props?.height || 24
    const className: string = props?.className || ''
    
    return { name, width, height, className }
  },
  props: ['iconName', 'width', 'height', 'className'],
  template: `
    <svg 
      :width="width" 
      :height="height" 
      :class="className"
      class="inline-block"
    >
      {{name}}
      <use :xlink:href="name"></use>
    </svg>
  `
}

const compiledComponent = compileComponent(IconComponent)

export default compiledComponent
