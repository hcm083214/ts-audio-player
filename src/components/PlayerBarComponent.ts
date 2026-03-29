import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'
import IconComponent from './IconComponent'

const PlayerBarComponent = {
  setup() {
    return {}
  },
  components: { 
    'IconComponent': IconComponent,
    'iconcomponent': IconComponent  // 兼容小写情况
  },
  template: `

    <footer class="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t border-gray-200 py-3 px-4">
      <div class="container mx-auto flex items-center justify-between">
        <div class="flex items-center">
          <img
            src="https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg"
            alt="当前歌曲"
            class="w-12 h-12 rounded object-cover"
          />
          <div class="ml-3">
            <h3 class="text-sm font-medium">海阔天空</h3>
            <p class="text-xs text-gray-500">Beyond</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <IconComponent 
            name="skip-previous" 
            :width="24" 
            :height="24"
            className="cursor-pointer hover:text-primary"
          />
          <IconComponent 
            name="play-small" 
            :width="28" 
            :height="28"
            className="cursor-pointer text-primary"
          />
          <IconComponent 
            name="skip-next" 
            :width="24" 
            :height="24"
            className="cursor-pointer hover:text-primary"
          />
        </div>
        <div class="flex items-center space-x-4">
          <IconComponent 
            name="expand" 
            :width="20" 
            :height="20"
            className="cursor-pointer hover:text-primary"
          />
          <a href="#/player" class="text-primary hover:underline">展开</a>
        </div>
      </div>
    </footer>
  `
}

const compiledComponent = compileComponent(PlayerBarComponent)

export default compiledComponent
