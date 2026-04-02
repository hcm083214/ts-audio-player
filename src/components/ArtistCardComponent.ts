import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'

const ArtistCardComponent = {
  setup(props:{artist: any}) {
    const artist: any = props.artist
    return { artist }
  },
  props: ['artist'],
  template: `
    <div class="flex flex-col items-center">
      <div class="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
        <img
          :src="artist.picUrl"
          :alt="artist.name"
          class="w-full h-full object-cover"
        />
      </div>
      <p class="mt-2 text-sm font-medium">{{ artist.name }}</p>
    </div>
  `
}

const compiledComponent = compileComponent(ArtistCardComponent)

export default compiledComponent
