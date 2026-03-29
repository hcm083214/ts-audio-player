import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'
import IconComponent from './IconComponent'

const VolumeControlComponent = {
  setup() {
    const volume: number = 0
    return { volume }
  },
  props: ['volume'],
  components: { 
    'IconComponent': IconComponent,
    'iconcomponent': IconComponent  // 兼容小写情况
  },
  template: `
    <div class="mt-8 flex items-center space-x-4">
      <!-- 音量图标 -->
      <IconComponent 
        name="volume" 
        :width="20" 
        :height="20"
        className="cursor-pointer hover:text-primary"
      />
      
      <!-- 音量进度条 -->
      <div class="flex-1 volume-bar">
        <div
          class="volume-fill"
          :style="{ width: volume + '%' }"
        ></div>
      </div>
      
      <!-- 音量百分比 -->
      <span class="text-sm text-gray-500">{{ volume }}%</span>
    </div>
  `
}

const compiledComponent = compileComponent(VolumeControlComponent)

export default compiledComponent
