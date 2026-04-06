import { h } from '../core/renderer'
import { compileComponent } from '../core/compileComponent'
import { ref, onMounted, onUnmounted } from '../core/reactive'

const BannerComponent = {
  setup(props: { playlists: any }) {
    // 当前激活的轮播图索引
    const activeIndex = ref(0)
    // 定时器引用
    let timer: any = null
    // 是否禁用过渡动画
    const isTransitionDisabled = ref(false)
    
    // 轮播图数据 - 取前5张
    const originalBanners = (props.playlists || []).slice(0, 5)
    // 添加第一张的副本到最后，实现无缝循环
    const bannerLists = [...originalBanners, originalBanners[0]]
    
    // 切换到指定索引
    function goTo(index: number) {
      activeIndex.value = index
    }
    
    // 上一张
    function prev() {
      if (activeIndex.value === 0) {
        // 如果在第一张，先瞬间跳到最后一张（副本），然后过渡到倒数第二张
        isTransitionDisabled.value = true
        activeIndex.value = bannerLists.length - 1
        setTimeout(() => {
          isTransitionDisabled.value = false
          setTimeout(() => {
            activeIndex.value = bannerLists.length - 2
          }, 50)
        }, 50)
      } else {
        activeIndex.value = activeIndex.value - 1
      }
    }
    
    // 下一张
    function next() {
      if (activeIndex.value >= bannerLists.length - 1) {
        // 如果已经在最后一张（副本），先瞬间跳到第一张
        isTransitionDisabled.value = true
        activeIndex.value = 0
        setTimeout(() => {
          isTransitionDisabled.value = false
          setTimeout(() => {
            activeIndex.value = 1
          }, 50)
        }, 50)
      } else {
        activeIndex.value = activeIndex.value + 1
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
      const style = {
        transform: `translateX(-${offset}%)`
      }
      return style
    }
    
    // 获取容器类名 - 根据是否禁用过渡动态调整
    function getContainerClass() {
      return isTransitionDisabled.value 
        ? 'flex h-full' 
        : 'flex h-full transition-transform duration-500 ease-in-out'
    }
    
    // 获取指示器样式
    function getIndicatorStyle(index: number) {
      // 指示器只显示原始5个，不包括副本
      const isActive = index === activeIndex.value && index < originalBanners.length
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
      originalBanners,
      activeIndex,
      prev,
      next,
      goTo,
      startAutoPlay,
      stopAutoPlay,
      getContainerStyle,
      getContainerClass,
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
      <!-- 轮播图容器 - 使用 transform 横向滚动 -->
      <div 
        :class="getContainerClass()"
        :style="getContainerStyle()"
      >
        <!-- 所有图片横向排列（包括副本） -->
        <div
          v-for="(banner, index) in bannerLists"
          :key="banner.id + '-' + index"
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
      
      <!-- 底部指示器 - 只显示原始5个，不包括副本 -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        <div class="flex space-x-2">
          <span
            v-for="(banner, index) in originalBanners"
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
