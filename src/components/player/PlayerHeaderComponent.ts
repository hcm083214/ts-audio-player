import { h, compileComponent } from '../../core'

const PlayerHeaderComponent = {
  setup() {
    return {}
  },
  template: `
    <header class="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
      <div class="container mx-auto px-4 py-3 flex items-center">
        <a href="javascript:void(0)" @click="$router.push('/')" class="mr-4">
          <svg width="24" height="24" class="inline-block" style="display: inline-block;">
            <use href="#icon-arrow-left" width="100%" height="100%"></use>
          </svg>
        </a>
        <h1 class="text-xl font-bold">音乐播放</h1>
      </div>
    </header>
  `
}

const compiledComponent = compileComponent(PlayerHeaderComponent)

export default compiledComponent