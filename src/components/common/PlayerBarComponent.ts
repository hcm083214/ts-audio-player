import { h, compileComponent } from '../../core'

const PlayerBarComponent = {
  setup() {
    return {}
  },
  template: `

    <footer class="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t border-gray-200 py-3 px-4">
      <div class="container mx-auto flex items-center justify-between">
        <div class="flex items-center">
          <img
            src="https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg"
            alt="当前歌曲"
            class="w-12 h-12 rounded object-cover"
          />
          <div class="ml-3">
            <h3 class="text-sm font-medium">海阔天空</h3>
            <p class="text-xs text-gray-500">Beyond</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <svg width="24" height="24" class="cursor-pointer hover:text-primary inline-block" style="display: inline-block;">
            <use xlink:href="#icon-skip-previous" width="100%" height="100%"></use>
          </svg>
          <svg width="28" height="28" class="cursor-pointer text-primary inline-block" style="display: inline-block;">
            <use xlink:href="#icon-play-small" width="100%" height="100%"></use>
          </svg>
          <svg width="24" height="24" class="cursor-pointer hover:text-primary inline-block" style="display: inline-block;">
            <use xlink:href="#icon-skip-next" width="100%" height="100%"></use>
          </svg>
        </div>
        <div class="flex items-center space-x-4">
          <svg width="20" height="20" class="cursor-pointer hover:text-primary inline-block" style="display: inline-block;">
            <use xlink:href="#icon-expand" width="100%" height="100%"></use>
          </svg>
          <a href="#/player" class="text-primary hover:underline">展开</a>
        </div>
      </div>
    </footer>
  `
}

const compiledComponent = compileComponent(PlayerBarComponent)

export default compiledComponent
