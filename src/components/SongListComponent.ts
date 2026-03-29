import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'
import IconComponent from './IconComponent'

const SongListComponent = {
  setup() {
    const songs: any[] = []
    return { songs }
  },
  props: ['songs'],
  components: { 
    'IconComponent': IconComponent,
    'iconcomponent': IconComponent  // 兼容小写情况
  },
  template: `
    <div class="bg-white rounded-lg shadow-md p-4">
      <div
        v-for="(song, index) in songs"
        :key="song.id"
        class="flex items-center py-3 border-b border-gray-100 last:border-0"
      >
        <div
          class="w-8 h-8 flex items-center justify-center text-sm"
          :class="index < 3 ? 'text-error font-bold' : 'text-gray-400'"
        >
          {{ index + 1 }}
        </div>
        <div class="flex-1 ml-4">
          <div class="flex items-center">
            <h3 class="font-medium text-sm">{{ song.name }}</h3>
            <a v-if="song.mvid" :href="'#/mv/' + song.mvid" class="ml-2 text-gray-400 text-xs">
              MV
            </a>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            {{ song.artists.map(artist => artist.name).join('/') }}
          </p>
        </div>
        <div class="text-gray-400">
          <IconComponent 
            name="play" 
            :width="20" 
            :height="20"
            className="cursor-pointer hover:text-primary"
          />
        </div>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(SongListComponent)

export default compiledComponent
