import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'

const VolumeControlComponent = {
  setup() {
    const volume: number = 0
    return { volume }
  },
  props: ['volume'],
  template: `
    <div class="mt-8 flex items-center space-x-4">
      <!-- 音量图标 -->
      <svg width="20" height="20" class="cursor-pointer hover:text-primary inline-block" style="display: inline-block;">
        <use xlink:href="#icon-volume" width="100%" height="100%"></use>
      </svg>
      
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
