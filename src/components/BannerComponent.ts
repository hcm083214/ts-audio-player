import { h } from '../core/renderer'
import { compileComponent } from '../core/compileComponent'
import { ref, onMounted, onUnmounted } from '../core/reactive'

const BannerComponent = {
  setup(props: { playlists: any }) {
    // 当前激活的轮播图索引
    const activeIndex = ref(0)
    // 定时器引用
    let timer: any = null
    
    // 轮播图数据
    const bannerLists = (props.playlists || []).slice(0, 5)
    
    // 切换到指定索引
    function goTo(index: number) {
      console.log("🚀 ~ goTo ~ index:", index)
      activeIndex.value = index
    }
    
    // 上一张
    function prev() {
      console.log('prev')
      const newIndex = activeIndex.value - 1
      if (newIndex < 0) {
        goTo(bannerLists.length - 1)
      } else {
        goTo(newIndex)
      }
    }
    
    // 下一张
    function next() {
      console.log('next')
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
    
    // 获取容器样式 - 🔥 关键：确保响应式依赖被收集
    function getContainerStyle() {
      const offset = activeIndex.value * 100
      console.log('🎯 getContainerStyle ~ offset:', offset, 'activeIndex:', activeIndex.value)
      const style = {
        transform: `translateX(-${offset}%)`
      }
      console.log('  返回样式对象:', style, '引用地址:', style)
      return style
    }
    
    
    // 获取指示器样式
    function getIndicatorStyle(index: number) {
      const isActive = index === activeIndex.value
      return {
        width: isActive ? '2rem' : '0.5rem',
        backgroundColor: isActive ? 'rgb(255, 255, 255)' : 'rgba(255, 255, 255, 0.5)'
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
      getContainerStyle,
      getIndicatorStyle,
    }
  },
  props: ['playlists'],
  template: `
    <div 
      class="relative h-64 md:h-80 rounded-lg overflow-hidden"
      @mouseenter="stopAutoPlay"
      @mouseleave="startAutoPlay"
    >
      {{activeIndex}}
      <!-- 轮播图容器 - 使用 transform 横向滚动 -->
      <div 
        class="flex h-full transition-transform duration-500 ease-in-out"
        :style="getContainerStyle()"
      >
        <!-- 所有图片横向排列 -->
        <div
          v-for="(banner, index) in bannerLists"
          :key="banner.id"
          class="flex-shrink-0 w-full h-full relative"
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