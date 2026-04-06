import { h, compileComponent } from '../../core'

const SongInfoComponent = {
  setup() {
    const song: any = {}
    return { song }
  },
  props: ['song'],
  template: `
    <div class="text-center">
      <h2 class="text-2xl font-bold mb-2">{{ song.name }}</h2>
      <p class="text-gray-600">
        {{ song.artists.map(artist => artist.name).join('/') }}
      </p>
      <p class="text-gray-500 mt-1">{{ song.album.name }}</p>
    </div>
  `
}

const compiledComponent = compileComponent(SongInfoComponent)

export default compiledComponent
