import { h, compileComponent } from '../../core'

const PlaylistCardComponent = {
  setup(props: { playlist: any }) {
    const playlist: any = props.playlist
    return { playlist }
  },
  props: ['playlist'],
  template: `
    <div class="playlist-card bg-white rounded-lg overflow-hidden shadow-md">
      <div class="relative">
        <img
          :src="playlist.picUrl"
          :alt="playlist.name"
          class="w-full h-48 object-cover"
        />
        <div class="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white rounded-full px-2 py-1 text-xs">
          {{ Math.floor(playlist.playCount / 10000) }}万
        </div>
      </div>
      <div class="p-3">
        <h3 class="font-medium text-sm mb-1 truncate">{{ playlist.name }}</h3>
        <p class="text-xs text-gray-500 truncate">{{ playlist.copywriter || '未知作者' }}</p>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlaylistCardComponent)

export default compiledComponent
