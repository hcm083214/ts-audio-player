/**
 * Mini-Vue 终极版
 * 新增功能：
 * 1. 编译器支持 v-else (AST 预处理)
 * 2. 渲染器支持 SVG 命名空间
 * 3. 插件系统支持 (Vue.use)
 * 4. 实现 Mini-Router (Hash 模式)
 */

// ==========================================
// 1. 响应式系统 (Reactivity)
// ==========================================
const isObject = (val: any) => val !== null && typeof val === 'object';
const targetMap = new WeakMap<any, Map<any, Set<Function>>>();
let activeEffect: ReactiveEffect | undefined;
let shouldTrack = false;

class ReactiveEffect {
  fn: () => void;
  deps: Set<Function>[] = [];
  constructor(fn: () => void) { this.fn = fn; }
  run() {
    this.deps.forEach(dep => dep.delete(this));
    this.deps.length = 0;
    try {
      activeEffect = this;
      shouldTrack = true;
      return this.fn();
    } finally {
      shouldTrack = false;
    }
  }
  effect() { this.run(); }
}

function track(target: any, key: any) {
  if (!shouldTrack || !activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let deps = depsMap.get(key);
  if (!deps) depsMap.set(key, (deps = new Set()));
  if (!deps.has(activeEffect)) {
    deps.add(activeEffect);
    deps.push(activeEffect);
  }
}

function trigger(target: any, key: any) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (deps) {
    const effectsToRun = new Set(deps);
    effectsToRun.forEach(effectFn => effectFn.effect());
  }
}

function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key);
      const res = Reflect.get(target, key, receiver);
      return isObject(res) ? reactive(res) : res;
    },
    set(target, key, value, receiver) {
      const res = Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return res;
    }
  });
}

function ref<T>(val: T) { return reactive({ value: val }); }
function computed<T>(getter: () => T) {
    const res = ref<T>(undefined as any);
    const effect = new ReactiveEffect(() => { res.value = getter(); });
    effect.effect();
    return res;
}
function watchEffect(fn: () => void) {
  const effect = new ReactiveEffect(fn);
  effect.effect();
}

// ==========================================
// 2. 虚拟 DOM (VNode)
// ==========================================
interface VNode {
  type: string | Function;
  props?: any;
  children?: VNode[] | string;
  el?: HTMLElement | SVGElement;
  key?: any;
  tag?: string; // 原始标签名，用于 SVG 判断
}

function h(type: any, props: any = {}, children: any = []) {
  if (type === null) return null;
  if (Array.isArray(children)) children = children.flat();
  if (typeof children === 'string') return { type, props, children, tag: type };
  return { type, props, children: Array.isArray(children) ? children : [children], tag: type };
}

// ==========================================
// 3. 渲染器 (Renderer) - 支持 SVG
// ==========================================
function createRenderer() {
  // 创建元素时判断是否为 SVG
  const createElement = (type: string, isSvg = false) => {
    return isSvg ? document.createElementNS('http://www.w3.org/2000/svg', type) : document.createElement(type);
  };
  
  const setElementProps = (el: any, key: string, value: any, prevValue?: any) => {
    if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase();
      if (prevValue) el.removeEventListener(event, prevValue);
      if (value) el.addEventListener(event, value);
    } else if (key === 'class') {
      el.className = value;
    } else if (key === 'style') {
      Object.assign(el.style, value);
    } else {
      // SVG 属性通常区分大小写，但 setAttribute 大部分情况兼容
      el.setAttribute(key, value);
    }
  };

  const mount = (vnode: VNode, container: HTMLElement | SVGElement, anchor: Node | null = null) => {
    if (!vnode) return;

    // 判断是否为 SVG 容器或自身就是 svg 标签
    const isSvg = vnode.tag === 'svg' || container.tagName.toLowerCase() === 'svg';
    
    if (typeof vnode.type === 'string') {
      const el = createElement(vnode.type, isSvg);
      vnode.el = el;
      
      if (vnode.props) {
        for (const key in vnode.props) setElementProps(el, key, vnode.props[key]);
      }
      if (vnode.children) {
        if (typeof vnode.children === 'string') el.textContent = vnode.children;
        else vnode.children.forEach((child: VNode) => mount(child, el));
      }
      if (anchor) container.insertBefore(el, anchor);
      else container.appendChild(el);
    }
  };

  const patch = (n1: VNode | null, n2: VNode | null, container: HTMLElement) => {
    if (n1 && n2 && n1.type !== n2.type) { n1.el?.remove(); n1 = null; }
    
    if (!n1 && !n2) return;
    if (!n1) mount(n2, container);
    else if (!n2) n1.el?.remove();
    else {
      if (n2.props) {
        for (const key in n2.props) setElementProps(n1.el!, key, n2.props[key], n1.props?.[key]);
      }
      if (typeof n2.children === 'string') {
        if (n1.children !== n2.children) n1.el!.textContent = n2.children;
      } else if (Array.isArray(n2.children)) {
        const c1 = n1.children as VNode[];
        if (c1.length !== n2.children.length) {
             n1.el!.innerHTML = '';
             n2.children.forEach((child: VNode) => mount(child, n1.el!));
        } else {
            n2.children.forEach((child: VNode, i: number) => patch(c1[i], child, n1.el!));
        }
      }
    }
  };

  return {
    render(vnode: VNode, container: HTMLElement) {
      const prevVNode = (container as any)._vnode;
      patch(prevVNode || null, vnode, container);
      (container as any)._vnode = vnode;
    }
  };
}

const { render } = createRenderer();

// ==========================================
// 4. 编译器 (Compiler) - 支持 v-else
// ==========================================

function parseProps(attrStr: string) {
  const props: any = {};
  const directives: any = {};
  if (!attrStr) return { props, directives };

  const attrMatches = attrStr.matchAll(/(\w+|:[\w-]+|v-[\w-]+)="([^"]*)"/g);
  for (const m of attrMatches) {
    const key = m;
    const value = m;
    if (key.startsWith(':')) props[key.slice(1)] = value;
    else if (key.startsWith('v-')) directives[key.slice(2)] = value;
    else props[key] = value;
  }
  return { props, directives };
}

function tokenize(template: string) {
  const tokens = [];
  let i = 0;
  while (i < template.length) {
    const char = template[i];
    if (char === '<') {
      if (template[i + 1] === '/') {
        const match = template.slice(i).match(/^<\/\w+>/);
        if (match) {
          tokens.push({ type: 'TAG_END', value: match.slice(2, -1) });
          i += match.length;
        }
      } else {
        const match = template.slice(i).match(/^<\w+(\s[^>]*)?>/);
        if (match) {
          const tagContent = match;
          const tagName = tagContent.slice(1).split(/\s/);
          const attrsStr = tagContent.slice(1 + tagName.length, -1);
          const { props, directives } = parseProps(attrsStr);
          tokens.push({ type: 'TAG_START', value: tagName, props, directives });
          i += tagContent.length;
        }
      }
    } else if (char === '{') {
      const match = template.slice(i).match(/^\{\{([^}]+)\}\}/);
      if (match) {
        tokens.push({ type: 'INTERPOLATION', value: match.trim() });
        i += match.length;
      }
    } else {
      const match = template.slice(i).match(/^[^{<]+/);
      if (match) {
        tokens.push({ type: 'TEXT', value: match });
        i += match.length;
      }
    }
  }
  return tokens;
}

// 解析 AST 时建立 v-if/v-else 连接
function parse(tokens: any[]) {
  const root = { type: 'Root', children: [] as any[] };
  const stack = [root];
  
  tokens.forEach(token => {
    const parent = stack[stack.length - 1];
    if (token.type === 'TAG_START') {
      const element: any = { 
        type: 'Element', 
        tag: token.value, 
        props: token.props || {}, 
        directives: token.directives || {},
        children: [] 
      };
      parent.children.push(element);
      stack.push(element);
    } else if (token.type === 'TAG_END') {
      stack.pop();
    } else if (token.type === 'INTERPOLATION') {
      parent.children.push({ type: 'Interpolation', content: token.value });
    } else if (token.type === 'TEXT') {
      parent.children.push({ type: 'Text', content: token.value });
    }
  });
  return root;
}

function generate(ast: any) {
  // 预处理 AST：将 v-else 挂载到 v-if 上
  // 这是实现 v-else 的关键：在生成代码前，修改 AST 结构
  function processIfElse(children: any[]) {
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (child.directives && child.directives.else) {
              // 找到前一个非 v-else 节点（通常是 v-if）
              let prevIndex = i - 1;
              while(prevIndex >= 0 && children[prevIndex].directives && children[prevIndex].directives.else) {
                  prevIndex--;
              }
              if (prevIndex >= 0) {
                  // 将 else 逻辑附加到前一个节点
                  children[prevIndex].elseNode = child;
                  // 标记当前节点稍后删除或跳过
                  child._toRemove = true;
              }
          }
          if (child.children) processIfElse(child.children);
      }
      // 移除标记的节点
      for (let i = children.length - 1; i >= 0; i--) {
          if (children[i]._toRemove) children.splice(i, 1);
      }
  }
  
  processIfElse(ast.children);

  function genNode(node: any): string {
    if (node.type === 'Root') {
      return `h('div', {}, [${node.children.map(genNode).join(',')}])`;
    } 
    else if (node.type === 'Element') {
      return genElementContent(node);
    } 
    else if (node.type === 'Interpolation') {
      return `ctx.${node.content}`;
    } 
    else if (node.type === 'Text') {
      return `'${node.content}'`;
    }
    return '';
  }

  function genElementContent(node: any): string {
    let props = { ...node.props };
    
    // v-model
    if (node.directives.model) {
      const modelVar = node.directives.model;
      props[':value'] = `ctx.${modelVar}`;
      props['@input'] = `$event => (ctx.${modelVar} = $event.target.value)`;
    }

    // 属性绑定
    const finalProps: any = {};
    for (const key in props) {
      const val = props[key];
      if (key.startsWith(':')) finalProps[key.slice(1)] = `ctx.${val}`;
      else if (key.startsWith('@')) finalProps[key] = val;
      else finalProps[key] = `'${val}'`;
    }
    
    const propsStr = JSON.stringify(finalProps).replace(/"ctx\.(.*?)"/g, '$1').replace(/"\$event/g, '$event');
    const childrenStr = node.children.length ? `[${node.children.map(genNode).join(',')}]` : '[]';
    const hCode = `h('${node.tag}', ${propsStr}, ${childrenStr})`;

    // 处理 v-if / v-else 逻辑
    let code = hCode;
    
    // 如果有 v-if，且存在 elseNode (由 processIfElse 挂载)
    if (node.directives.if) {
        if (node.elseNode) {
            // 生成 else 节点的代码
            const elseProps = JSON.stringify(node.elseNode.props || {}).replace(/"ctx\.(.*?)"/g, '$1');
            const elseChildren = node.elseNode.children.length ? `[${node.elseNode.children.map(genNode).join(',')}]` : '[]';
            const elseCode = `h('${node.elseNode.tag}', ${elseProps}, ${elseChildren})`;
            
            code = `${node.directives.if} ? ${code} : ${elseCode}`;
        } else {
            code = `${node.directives.if} ? ${code} : null`;
        }
    }

    return code;
  }

  return genNode(ast);
}

function compile(template: string) {
  const tokens = tokenize(template);
  const ast = parse(tokens);
  const code = generate(ast);
  return new Function('h', 'ctx', `return ${code}`);
}

// ==========================================
// 5. 插件系统与 Router
// ==========================================

// 插件接口
const installQueue: any[] = [];
function use(plugin: any, options?: any) {
    installQueue.push({ plugin, options });
}

// 简易 Router 实现
function createRouter(routes: any[], mode: 'hash' | 'history' = 'hash') {
    const currentPath = ref('/');
    
    // 路由匹配
    const getMatchedComponent = (path: string) => {
        const route = routes.find(r => r.path === path);
        return route ? route.component : null;
    };

    // 监听 URL 变化
    const handleUrlChange = () => {
        if (mode === 'hash') {
            const hash = window.location.hash.slice(1) || '/';
            currentPath.value = hash;
        } else {
            currentPath.value = window.location.pathname;
        }
    };

    window.addEventListener('hashchange', handleUrlChange);
    handleUrlChange(); // 初始化

    return {
        install(app: any) {
            // 注入全局属性 $router 和 $route
            app.config.globalProperties.$router = { push: (p: string) => window.location.hash = p };
            app.config.globalProperties.$route = computed(() => ({ path: currentPath.value }));
        },
        view: {
            setup() {
                return { currentPath };
            },
            render(ctx: any) {
                const component = getMatchedComponent(ctx.currentPath.value);
                if (!component) return h('div', {}, '404 Not Found');
                // 动态渲染组件
                return h(component);
            }
        }
    };
}

// App 工厂 (支持插件)
function createApp(component: any) {
    const app = {
        config: { globalProperties: {} },
        use: use,
        mount(container: string | HTMLElement) {
            // 安装插件
            installQueue.forEach(({ plugin, options }) => {
                if (plugin.install) plugin.install(app, options);
            });

            const root = typeof container === 'string' ? document.querySelector(container) : container;
            if (!root) return;

            const renderFn = () => {
                const ctx = component.setup ? component.setup() : {};
                // 注入全局属性到 ctx
                Object.assign(ctx, app.config.globalProperties);
                
                let vnode;
                if (component.template) {
                    const renderFromTemplate = compile(component.template);
                    vnode = renderFromTemplate(h, ctx);
                } else if (component.render) {
                    vnode = component.render(ctx);
                } else {
                    vnode = h('div', {}, 'Empty');
                }
                return vnode;
            };

            watchEffect(() => {
                const vnode = renderFn();
                render(vnode, root as HTMLElement);
            });
        }
    };
    return app;
}
