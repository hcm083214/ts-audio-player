import { h } from '../../core/renderer'
import { compileComponent } from '../../core/template-compiler'

const LyricsPanelComponent = {
  setup() {
    const lyricLines: any[] = []
    return { lyricLines }
  },
  props: ['lyricLines'],
  template: `
    <div class="flex-1 md:w-1/2 bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-bold mb-4 text-center">歌词</h3>
      <div class="flex-1 overflow-y-auto">
        <template v-for="(line, index) in lyricLines" :key="index">
          <div
            v-if="line.text"
            class="py-2 text-center text-gray-600 hover:text-primary"
          >
            {{ line.text }}
          </div>
        </template>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(LyricsPanelComponent)

export default compiledComponent
