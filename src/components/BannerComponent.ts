import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'
import { ref, onMounted, onUnmounted } from '../core/reactive'

const BannerComponent = {
  setup(props: { playlists: any }) {
    // 当前激活的轮播图索引
    const activeIndex = ref(0)
    // 定时器引用
    let timer: any = null
    
    // 轮播图数据
    const bannerLists = props.playlists.slice(0, 5)
    
    // 切换到指定索引
    function goTo(index: number) {
      console.log("🚀 ~ goTo ~ index:", index)
      activeIndex.value = index
    }
    
    // 上一张
    function prev() {
      const newIndex = activeIndex.value - 1
      if (newIndex < 0) {
        goTo(bannerLists.length - 1)
      } else {
        goTo(newIndex)
      }
    }
    
    // 下一张
    function next() {
      const newIndex = activeIndex.value + 1
      if (newIndex >= bannerLists.length) {
        goTo(0)
      } else {
        goTo(newIndex)
      }
    }
    
    // 开始自动播放
    function startAutoPlay() {
      if (timer) clearInterval(timer)
      timer = setInterval(() => {
        next()
      }, 3000) // 3 秒切换一次
    }
    
    // 停止自动播放
    function stopAutoPlay() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    
    // 获取指示器样式
    function getIndicatorStyle(index: number) {
      const isActive = index === activeIndex.value
      return {
        width: isActive ? '2rem' : '0.5rem',
        backgroundColor: isActive ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.5)'
      }
    }
    
    // 获取图片样式
    function getImageStyle(index: number) {
      const isActive = index === activeIndex.value
      return {
        opacity: isActive ? 1 : 0
      }
    }
    
    // 组件挂载时启动自动播放
    onMounted(() => {
      startAutoPlay()
    })
    
    // 组件卸载时清理定时器
    onUnmounted(() => {
      stopAutoPlay()
    })
    
    return {
      bannerLists,
      activeIndex,
      prev,
      next,
      goTo,
      startAutoPlay,
      stopAutoPlay,
      getIndicatorStyle,
      getImageStyle
    }
  },
  props: ['playlists'],
  template: `
    <div 
      class="relative h-64 md:h-80 rounded-lg overflow-hidden"
      @mouseenter="stopAutoPlay"
      @mouseleave="startAutoPlay"
    >
      <!-- 轮播图列表 - 直接渲染所有图片，通过 opacity 控制显示 -->
      <div class="relative w-full h-full">
        <!-- 所有图片层叠在一起，通过 opacity 控制可见性 -->
        <div
          v-for="(banner, index) in bannerLists"
          :key="banner.id"
          class="absolute inset-0 transition-opacity duration-500 ease-in-out"
          :style="getImageStyle(index)"
        >
          <img
            :src="banner.picUrl"
            :alt="banner.name"
            class="w-full h-full object-cover"
          />
        </div>
      </div>
      
      <!-- 左侧切换按钮 -->
      <button
        @click="prev"
        class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
      >
        <svg width="16" height="16" class="text-gray-100 inline-block" style="display: inline-block;">
            <use xlink:href="#icon-prev" width="100%" height="100%"></use>
        </svg>

      </button>
      
      <!-- 右侧切换按钮 -->
      <button
        @click="next"
        class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
      >
        <svg width="16" height="16" class="text-gray-100 inline-block" style="display: inline-block;">
            <use xlink:href="#icon-next" width="100%" height="100%"></use>
        </svg>
      </button>
      
      <!-- 底部指示器 - 使用动态样式绑定 -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        <div class="flex space-x-2">
          <span
            v-for="(banner, index) in bannerLists"
            :key="'indicator-' + banner.id"
            class="cursor-pointer block bg-slate-100 h-2 rounded-full transition-all duration-300"
            :style="getIndicatorStyle(index)"
            @click="goTo(index)"
          >
          </span>
        </div>
      </div>
      
    </div>
  `
}

const compiledComponent = compileComponent(BannerComponent)

export default compiledComponent