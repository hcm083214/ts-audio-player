import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'

const BannerComponent = {
  setup() {
    return {}
  },
  template: `
    <div class="relative h-64 md:h-80 rounded-lg overflow-hidden">
      <img
        src="https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg"
        alt="轮播图"
        class="w-full h-full object-cover"
      />
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
        <h2 class="text-white text-2xl font-bold">欢迎来到网易云音乐</h2>
        <p class="text-white/80 mt-2">发现好音乐，从这里开始</p>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(BannerComponent)

export default compiledComponent
