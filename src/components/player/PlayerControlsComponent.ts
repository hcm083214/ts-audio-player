import { h, compileComponent } from '../../core'

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
        <use xlink:href="#icon-skip-previous" width="100%" height="100%"></use>
      </svg>

      <!-- 播放/暂停 -->
      <svg v-if="!isPlaying" width="40" height="40" class="cursor-pointer text-primary inline-block" style="display: inline-block;">
        <use xlink:href="#icon-play" width="100%" height="100%"></use>
      </svg>
      <svg v-else width="40" height="40" class="cursor-pointer text-primary inline-block" style="display: inline-block;">
        <use xlink:href="#icon-pause" width="100%" height="100%"></use>
      </svg>

      <!-- 下一首 -->
      <svg width="24" height="24" class="cursor-pointer hover:text-primary inline-block" style="display: inline-block;">
        <use xlink:href="#icon-skip-next" width="100%" height="100%"></use>
      </svg>
    </div>
  `
}

const compiledComponent = compileComponent(PlayerControlsComponent)

export default compiledComponent
