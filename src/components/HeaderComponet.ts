import { compileComponent } from '../core/template-compiler'
import IconComponent from './IconComponent'

const HeaderComponent = {
    components: { 
      'IconComponent': IconComponent,
      'iconcomponent': IconComponent  // 兼容小写情况
    },
    template: `
        <!-- 顶部导航栏 -->
        <header class="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
            <div class="container mx-auto px-4 py-3 flex items-center justify-between">
                <div class="flex items-center">
                    <h1 class="text-2xl font-bold text-primary">网易云音乐</h1>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="relative">
                        <input
                            type="text"
                            placeholder="搜索音乐、歌手、专辑"
                            class="w-64 h-10 pl-10 pr-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <IconComponent 
                            name="search" 
                            :width="16" 
                            :height="16" 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                    </div>
                    <button class="px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90">
                        登录
                    </button>
                </div>
            </div>
        </header>
    `,
    setup() {
    }
}

export default compileComponent(HeaderComponent);