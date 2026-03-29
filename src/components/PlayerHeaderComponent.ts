import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'
import IconComponent from './IconComponent'

const PlayerHeaderComponent = {
  setup() {
    return {}
  },
  components: { 
    'IconComponent': IconComponent,
    'iconcomponent': IconComponent  // 兼容小写情况
  },
  template: `

    <header class="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
      <div class="container mx-auto px-4 py-3 flex items-center">
        <a href="#/" class="mr-4">
          <IconComponent 
            name="arrow-left" 
            :width="24" 
            :height="24"
          />
        </a>
        <h1 class="text-xl font-bold">音乐播放</h1>
      </div>
    </header>
  `
}

const compiledComponent = compileComponent(PlayerHeaderComponent)

export default compiledComponent
