import { h } from '../../core/renderer'
import { compileComponent } from '../../core/template-compiler'

const ProgressBarComponent = {
  setup() {
    const currentTime: number = 0
    const duration: number = 0
    const formatTime: Function = () => ''
    return { currentTime, duration, formatTime }
  },
  props: ['currentTime', 'duration', 'formatTime'],
  template: `
    <div>
      <!-- 进度条 -->
      <div class="mb-2 flex justify-between text-sm text-gray-500">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
      <div class="progress-bar mb-8">
        <div
          class="progress-fill"
          :style="{ width: (currentTime / duration) * 100 + '%' }"
        ></div>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(ProgressBarComponent)

export default compiledComponent
