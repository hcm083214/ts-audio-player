import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'

const PlayerControlsComponent = {
  setup() {
    const isPlaying: boolean = false
    return { isPlaying }
  },
  props: ['isPlaying'],
  template: `
    <div class="flex items-center justify-center space-x-8">
      <!-- 上一首 -->
      <svg width="24" height="24" class="cursor-pointer hover:text-primary inline-block" style="display: inline-block;">
        <use xlink:href="#icon-skip-previous"></use>
      </svg>

      <!-- 播放/暂停 -->
      <svg v-if="!isPlaying" width="40" height="40" class="cursor-pointer text-primary inline-block" style="display: inline-block;">
        <use xlink:href="#icon-play"></use>
      </svg>
      <svg v-else width="40" height="40" class="cursor-pointer text-primary inline-block" style="display: inline-block;">
        <use xlink:href="#icon-pause"></use>
      </svg>

      <!-- 下一首 -->
      <svg width="24" height="24" class="cursor-pointer hover:text-primary inline-block" style="display: inline-block;">
        <use xlink:href="#icon-skip-next"></use>
      </svg>
    </div>
  `
}

const compiledComponent = compileComponent(PlayerControlsComponent)

export default compiledComponent
