import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'
import IconComponent from './IconComponent'

const PlayerControlsComponent = {
  setup() {
    const isPlaying: boolean = false
    return { isPlaying }
  },
  props: ['isPlaying'],
  components: { 
    'IconComponent': IconComponent,
    'iconcomponent': IconComponent  // 兼容小写情况
  },
  template: `
    <div class="flex items-center justify-center space-x-8">
      <!-- 上一首 -->
      <IconComponent 
        name="skip-previous" 
        :width="24" 
        :height="24"
        className="cursor-pointer hover:text-primary"
      />

      <!-- 播放/暂停 -->
      <IconComponent 
        v-if="!isPlaying"
        name="play" 
        :width="40" 
        :height="40"
        className="cursor-pointer text-primary"
      />
      <IconComponent 
        v-else
        name="pause" 
        :width="40" 
        :height="40"
        className="cursor-pointer text-primary"
      />

      <!-- 下一首 -->
      <IconComponent 
        name="skip-next" 
        :width="24" 
        :height="24"
        className="cursor-pointer hover:text-primary"
      />
    </div>
  `
}

const compiledComponent = compileComponent(PlayerControlsComponent)

export default compiledComponent
