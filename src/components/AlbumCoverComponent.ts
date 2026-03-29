import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'

const AlbumCoverComponent = {
  setup() {
    const src: string = ''
    const alt: string = ''
    return { src, alt }
  },
  props: ['src', 'alt'],
  template: `
    <div class="w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden shadow-xl mb-8">
      <img
        :src="src"
        :alt="alt"
        class="w-full h-full object-cover"
      />
    </div>
  `
}

const compiledComponent = compileComponent(AlbumCoverComponent)

export default compiledComponent
