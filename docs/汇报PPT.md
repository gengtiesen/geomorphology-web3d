# 大同野外实习 WebGIS 3D 可视化平台 —— 汇报PPT

---

## 第1页 · 封面

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                      │
     大同野外实习 WebGIS 3D 可视化平台    │
                                      │
     ——基于 JavaScript 的地貌时空数据   │
            交互系统                    │
                                      │
     XXX / 北京大学城市与环境学院        │
     JavaScript 与 Web 开发课程汇报      │
                                      │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> 🎤 **讲稿：** 各位老师同学好，我今天汇报的题目是"大同野外实习 WebGIS 3D 可视化平台"。这是一个用 JavaScript 技术栈搭建的地貌学野外数据交互系统，接下来我会从项目背景、技术架构、以及重点JS代码三个方面展开。

---

## 第2页 · 项目背景

```
                      ┌──────────────────────┐
                      │                      │
    大同地貌实习          │   → 10天野外路线      │
    （大二暑期）          │   → 日均15km徒步      │
                      │   → 30+地质观察点     │
                      │                      │
                      └──────────────────────┘
                              ↓
          ┌──────────────────────────────────┐
          │  问题：                           │
          │  ① GPS轨迹分散在多个GPX文件中        │
          │  ② 观察点笔记（Word）与坐标分离       │
          │  ③ 无法直观看到路线与地形的空间关系     │
          │  ④ 传统地形剖面绘制繁琐               │
          └──────────────────────────────────┘
                              ↓
          ┌──────────────────────────────────┐
          │  解决方案：                        │
          │  一个 Web 平台 → 加载GPX+CSV        │
          │  → 3D 地球可视化 → 点击查看知识点     │
          │  → 地图选点自动生成地形剖面            │
          └──────────────────────────────────┘
```

> 🎤 **讲稿：** 大二暑期我们在山西大同进行了为期10天的地貌实习。野外采集了大量GPS轨迹和30多个地质观察点数据，但这些数据散落在GPX文件和Word文档中，很难直观地看到路线与地形的空间关系。所以我搭建了这个Web平台，把数据整合到一个3D交互地图上，支持一键加载轨迹、点击查看观察点知识点，以及在地图上选点自动生成地形剖面。

---

## 第3页 · 平台功能一览

```
┌────────────────────────────────────────────────┐
│                                                │
│   📍 GPS轨迹管理          🏔️ 地形剖面分析       │
│   加载GPX/JSON轨迹          地图点击布设锚点       │
│   3D地球彩色展示            自动采样高程           │
│   多条轨迹切换               ECharts 出图          │
│                                                │
│   📝 地质观察点            🗺️ Canvas 鹰眼图       │
│   坐标标注+知识点弹窗        2D俯视实时联动         │
│   实地照片+剖面图           点击跳转3D视角          │
│                            纯Canvas手绘           │
│                                                │
│   📊 轨迹统计面板                               │
│   自动计算里程/爬升/速度                          │
│   map/reduce/filter 数组方法                     │
│                                                │
└────────────────────────────────────────────────┘
```

> 🎤 **讲稿：** 平台有五个核心功能。最基础的是GPS轨迹管理和地质观察点展示——把野外数据在3D地球上可视化。在这个基础上我加了三个体现JS编程能力的模块：地形剖面分析用到了ECharts图表库；Canvas鹰眼图完全用原生Canvas API手绘；轨迹统计面板则展示了数组高阶方法的运用。后面我会逐个讲解这些模块的关键代码。

---

## 第4页 · 技术栈

```
┌──────────────────┬────────────────────────────────┐
│      层级         │           技术选型              │
├──────────────────┼────────────────────────────────┤
│  前端框架         │  React 18 + TypeScript          │
│  3D地图引擎       │  Cesium.js 1.111                │
│  状态管理         │  Zustand 4                      │
│  UI组件库         │  Ant Design 5                   │
│  图表             │  ECharts 6 + Canvas 2D 手绘      │
│  构建工具         │  Vite 5（秒级热更新）             │
│  空间计算         │  Turf.js + 自写 Haversine        │
│  数据格式         │  GPX (XML) / CSV / GeoJSON       │
│  第三方服务       │  Cesium Ion（全球地形+卫星影像）    │
└──────────────────┴────────────────────────────────┘
```

> 🎤 **讲稿：** 技术选型上，核心是 React + TypeScript 做前端框架，Cesium.js 做3D地图引擎——它的特点是开源、能加载全球地形和卫星影像。状态管理用了轻量的 Zustand 而不是 Redux，因为项目规模不需要那么重的方案。构建工具选 Vite，开发时热更新几乎是秒级的。值得一提的是图表部分——地形剖面用了ECharts，但鹰眼图我刻意用了原生Canvas 2D手绘，目的就是展示不依赖任何库的JS编程能力。

---

## 第5页 · 项目文件结构

```
地貌webgis平台/
├── index.html                  ← 入口
├── vite.config.ts              ← 构建配置
├── data/                       ← 野外原始数据
│   ├── day1~10/               ← 每天GPX+CSV
│   ├── 观察点文档/              ← 知识点+图片
│   └── manifest.json           ← 日期索引
├── src/
│   ├── main.tsx                ← React入口
│   ├── App.tsx                 ← 根组件+布局
│   ├── types/index.ts          ← TS类型定义
│   ├── stores/
│   │   └── useAppStore.ts      ← Zustand全局状态 ★
│   ├── utils/
│   │   ├── fileUtils.ts        ← GPX/CSV解析 ★
│   │   ├── dataLoader.ts       ← 按天加载数据
│   │   └── trackAnalytics.ts   ← 纯JS统计计算 ★★
│   └── components/
│       ├── CesiumMap.tsx        ← 核心3D地图 ★
│       ├── Sidebar.tsx          ← 侧边控制面板
│       ├── ElevationProfile.tsx ← ECharts剖面图
│       ├── OverviewMap.tsx      ← Canvas鹰眼图 ★★
│       └── TrackStatsPanel.tsx  ← 统计面板
```

> 🎤 **讲稿：** 这是项目的文件结构。标星号的是我今天重点要讲的模块。trackAnalytics.ts 是纯函数模块——零依赖、输入输出清晰，最适合用来讲解JS数组方法。OverviewMap.tsx 是Canvas 2D实战，requestAnimationFrame、坐标变换、dirty标志位都在里面。fileUtils.ts 展示了怎么用原生DOMParser解析GPX（XML格式），useAppStore.ts 展示了Zustand的发布订阅状态管理模式。

---

## 第6页 · 组件架构图（数据流）

```
                      ┌─────────────┐
                      │   用户操作    │
                      │ 点击/选文件   │
                      └──────┬──────┘
                             ↓
              ┌──────────────────────────┐
              │      Sidebar.tsx          │
              │   - 文件上传 → 解析GPX     │
              │   - 轨迹列表（可见/隐藏）   │
              │   - 观察点详情弹窗         │
              └──────────┬───────────────┘
                         ↓ addTrack / addPoint
              ┌──────────────────────────┐
              │   Zustand Store（全局状态）│
              │   tracks[], points[] …   │
              │   → 任一数据变化          │
              │   → 自动通知所有订阅组件    │
              └──┬───────┬───────┬───────┘
                 ↓       ↓       ↓
        ┌──────────┐ ┌──────┐ ┌──────────────┐
        │CesiumMap │ │Stats │ │ElevationProfile│
        │3D渲染    │ │统计面板│ │ECharts剖面    │
        └────┬─────┘ └──────┘ └──────────────┘
             ↓ (postRender事件)
        ┌──────────────┐
        │ OverviewMap  │
        │ Canvas 2D同步 │
        └──────────────┘
```

> 🎤 **讲稿：** 这张图展示了整个平台的数据流。用户操作触发 Sidebar 的事件处理函数，解析文件后通过 Zustand store 的 addTrack/addPoint 方法更新全局状态。状态一旦变化，Zustand 自动通知所有订阅了这个状态的组件——CesiumMap 在地球上画线、StatsPanel 重新计算统计数字、ElevationProfile 更新剖面图。OverviewMap 比较特殊——它不直接订阅数据变化，而是监听 Cesium 的 postRender 事件，用 requestAnimationFrame 节流后同步绘制。

---

## 第7页 · 代码讲解① — JavaScript 的异步编程

> **对应文件：** `fileUtils.ts` 的 `parseGPXFile()` 函数
> **对应课程知识：** Promise / async-await / FileReader / DOMParser

```
┌─────────────────────────────────────────────────┐
│  GPX文件（本质是XML文本）→ JS读取 → 解析 → 对象    │
└─────────────────────────────────────────────────┘
```

```javascript
// ★ 知识点1：async/await —— 异步操作写起来像同步
export const parseGPXFile = async (file: File): Promise<Track | null> => {
  try {
    // ★ 知识点2：File API —— 浏览器原生读取用户文件
    const text = await file.text();       // ← await 等待 Promise 完成

    // ★ 知识点3：DOMParser —— 浏览器内置XML解析器
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    // ★ 知识点4：DOM查询API —— querySelectorAll 查XML和查HTML一样
    const trackPoints = xmlDoc.querySelectorAll('trkpt');

    // ★ 知识点5：forEach + parseFloat —— 提取坐标
    const points: TrackPoint[] = [];
    trackPoints.forEach(trkpt => {
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lng = parseFloat(trkpt.getAttribute('lon') || '0');
      // getAttribute 是 DOM API，不是 Cesium 也不是 React
      points.push({ lng, lat });
    });

    return { id: generateId(), name: trackName, points, ... };
  } catch (error) {
    console.error('解析失败:', error);
    return null;    // ← 错误处理：返回null而不是崩溃
  }
};
```

> 🎤 **讲稿：** 第一个要讲的JS知识点是异步编程。GPX文件本质上是XML文本，从文件读取到解析全部用的是浏览器原生API——File.text() 读文件返回 Promise，用 await 等待；DOMParser 解析XML，然后用 querySelectorAll 查DOM节点——和查HTML完全一样。这些全部是浏览器内置能力，不需要引入任何第三方库。注意 async/await 让异步代码看起来像同步执行，try/catch 保证了即使解析失败也不会让整个应用崩溃。

---

## 第8页 · 代码讲解② — Array 高阶方法（map / reduce / filter）

> **对应文件：** `trackAnalytics.ts`
> **对应课程知识：** 数组方法 / 函数式编程 / 不可变数据

```javascript
// === 场景：1000个GPS点 → 算出总里程、总爬升、最高点 ===

// ★ 知识点1：map() —— "映射"，把点数组变成距离数组
const segmentDistances = pts.map((p, i, arr) => {
  if (i === 0) return 0;               // 第一个点没有"上一个点"
  return haversine(arr[i - 1], p);     // arr参数 = 原数组引用
});
// 输入: [点1, 点2, 点3, ...]
// 输出: [0, 152.3, 88.7, ...]  ← 每段距离(米)


// ★ 知识点2：reduce() —— "归约"，把数组变成一个值
const totalDist = segmentDistances.reduce(
  (sum, d) => sum + d,    // ← 累加器：每次把距离加到总和上
  0                        // ← 初始值
);
// 152.3 + 88.7 + 201.4 + ... = 12300（米）→ 12.3km


// ★ 知识点3：filter().map() 链式调用 —— "清洗数据"
const elevations = pts
  .filter(p => p.elevation != null && !isNaN(p.elevation))  // 先筛
  .map(p => p.elevation);                                    // 再提
//   ↑ 筛掉空值和NaN                    ↑ 只取数字

// ★ 知识点4：展开运算符 —— 把数组"打散"
const maxElev = Math.max(...elevations);  // = Math.max(1200, 1180, ...)
```

> 🎤 **讲稿：** 第二个重点——JS数组高阶方法。map 把"GPS点数组"映射为"逐段距离数组"，第三个参数 arr 让我们能访问原数组的上一个元素。reduce 把1000段距离归约为一个总里程数字——语义比for循环清晰得多。filter配map做数据清洗——先筛掉脏数据再提取纯数字，最后用展开运算符打散传给Math.max求最高点。这四招组合起来，不到10行代码完成一个完整的统计流程。

---

## 第9页 · 代码讲解③ — Canvas 2D 手绘鹰眼图

> **对应文件：** `OverviewMap.tsx`
> **对应课程知识：** Canvas API / 坐标变换 / 2D渲染管线

```javascript
// ★ 知识点1：经纬度 → Canvas像素坐标的线性映射
const toX = (lon) => ((lon - minLon) / (maxLon - minLon)) * CANVAS_W;
const toY = (lat) => CANVAS_H - ((lat - minLat) / (maxLat - minLat)) * CANVAS_H;
//                                  ↑ Y轴翻转：屏幕Y向下，地理Y(北)向上

// ★ 知识点2：Canvas 2D 绘图管线
ctx.fillStyle = '#0d1117';
ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);     // 1. 背景

ctx.beginPath();
ctx.strokeStyle = track.color;
ctx.lineWidth = 1.2;
ctx.moveTo(toX(startLng), toY(startLat));    // 2. 起笔
track.points.forEach(p => {
  ctx.lineTo(toX(p.lng), toY(p.lat));        // 3. 逐点连线
});
ctx.stroke();                                // 4. 渲染

// ★ 知识点3：Camera视域矩形（从Cesium取→Canvas画）
const rect = cesiumViewer.camera.computeViewRectangle();
// rect: {west, south, east, north}  ← 3D相机当前看到的范围
ctx.fillStyle = 'rgba(88, 166, 255, 0.18)';
ctx.fillRect(toX(west), toY(north), toX(east)-toX(west), toY(south)-toY(north));
```

> 🎤 **讲稿：** 第三个重点是我最满意的Canvas鹰眼图。核心是一个坐标映射函数——把经纬度线性映射到Canvas像素。注意Y轴要翻转因为屏幕坐标Y向下而地图北向上。然后beginPath起笔，forEach逐点lineTo连线，stroke渲染——这就是Canvas的标准绘图管线。最有意思的是蓝色视域矩形——我调用了Cesium的computeViewRectangle拿到3D相机当前看到的经纬度范围，然后直接用Canvas的fillRect画出来。

---

## 第10页 · 代码讲解④ — requestAnimationFrame 节流

> **对应文件：** `OverviewMap.tsx`
> **对应课程知识：** 浏览器渲染循环 / 事件循环 / 性能优化

```javascript
// ★ 问题：Cesium 每秒渲染 60 帧，每帧都重绘 Canvas 会卡
// ★ 答案：dirty 标志位 + requestAnimationFrame 节流

// 第一步：Cesium 渲染完 → 只打标记，不立即绘制
let dirty = true;
cesiumViewer.scene.postRender.addEventListener(() => {
  dirty = true;   // ← 极轻量操作，几乎不消耗CPU
});

// 第二步：浏览器调度 → 只在需要时绘制
function loop() {
  requestAnimationFrame(loop);    // ★ 浏览器控制执行频率
  if (dirty) {
    dirty = false;                // ★ 清除标记
    draw();                       // ★ 真正的Canvas重绘
  }
}
requestAnimationFrame(loop);

// ★ 为什么不用 setInterval？
// setInterval(() => draw(), 16) → 即使页面不可见也在执行，浪费CPU
// requestAnimationFrame → 页面隐藏时自动暂停，可见时恢复
```

> 🎤 **讲稿：** 第四个要讲的是requestAnimationFrame。Cesium每秒钟渲染60帧，如果每帧都跟着重绘Canvas，页面会非常卡。我的做法是加一个dirty布尔标志——Cesium渲染完后只把dirty设为true，这是一个O(1)的极轻量操作。然后requestAnimationFrame循环里检查dirty，如果为true才执行真正的Canvas重绘。为什么不用setInterval？因为setInterval即使浏览器标签页切到后台也在跑，浪费CPU；而rAF在页面不可见时自动暂停——这是浏览器级别的优化。

---

## 第11页 · 代码讲解⑤ — Zustand 状态管理

> **对应文件：** `useAppStore.ts`
> **对应课程知识：** 发布-订阅模式 / 不可变数据 / 状态提升

```javascript
// ★ 知识点1：create() 创建全局store —— 一行代码
export const useAppStore = create<AppState & AppActions>((set) => ({
  // 状态（类似组件的 state）
  tracks: [],
  selectedTrackId: null,

  // 操作（类似组件的 setState）
  // ★ 知识点2：set() 接收一个函数 → 返回新状态（不可变更新）
  addTrack: (track) => set((state) => ({
    tracks: [...state.tracks, track]     // ← 展开旧数组 + 新元素
    //        ↑ 不修改原数组，返回新数组
  })),

  // ★ 知识点3：复杂更新的模式 —— 遍历 + 条件替换
  toggleTrackVisibility: (trackId) => set((state) => ({
    tracks: state.tracks.map(t =>
      t.id === trackId ? { ...t, visible: !t.visible } : t
    )
    //  ↑ 找到匹配的 → 展开+修改visible
    //  ↑ 不匹配的 → 原样返回
  })),
}));

// ★ 知识点4：组件中使用 → 像 useState 一样简单
const tracks = useAppStore(s => s.tracks);    // 订阅tracks
const addTrack = useAppStore(s => s.addTrack); // 获取action
```

> 🎤 **讲稿：** 第五个知识点是状态管理。我用了Zustand——一个只有2KB的库。它的核心思想是发布-订阅：create返回一个hook，任何组件调用这个hook就自动订阅了对应状态。当状态变化时，只有订阅了变化字段的组件会重渲染。注意addTrack里的展开运算符——不修改原数组，返回新数组——这是React不可变数据的核心要求。toggleTrackVisibility展示了更复杂的情况：用map遍历，找到匹配的就展开并修改visible字段，不匹配的原样返回。

---

## 第12页 · 代码讲解⑥ — React 组件与 useEffect

> **对应文件：** `CesiumMap.tsx` (核心逻辑)
> **对应课程知识：** React 生命周期 / Hooks / useRef

```javascript
const CesiumMap: React.FC = () => {
  // ★ 知识点1：useRef —— 跨渲染周期保持引用
  const containerRef = useRef<HTMLDivElement>(null);  // DOM容器
  const viewerRef = useRef<Cesium.Viewer | null>(null); // Cesium实例

  // ★ 知识点2：useEffect(() => {}, []) —— 组件挂载后执行一次
  useEffect(() => {
    const viewer = new Cesium.Viewer(containerRef.current!, {...});
    viewerRef.current = viewer;
    return () => viewer.destroy();  // ★ 知识点3：清理函数 → 组件卸载时调用
  }, []);  // ← 空依赖数组 = 只执行一次

  // ★ 知识点4：useEffect(() => {}, [tracks]) —— tracks变化时执行
  useEffect(() => {
    tracks.filter(t => t.visible).forEach(track => {
      viewer.entities.add({           // Cesium Entity API
        polyline: { positions: [...], material: track.color }
      });
    });
  }, [tracks, selectedTrackId]);  // ← 依赖数组：这些值变了才重新执行
};
```

> 🎤 **讲稿：** 第六个讲React的关键Hooks。useRef用来持有Cesium Viewer实例——它的值在组件整个生命周期保持不变。第一个useEffect空依赖数组表示"组件挂载后执行一次"，返回的清理函数在组件卸载时销毁Cesium实例防止内存泄漏。第二个useEffect依赖tracks和selectedTrackId——当这些值变化时自动重新渲染轨迹。这正是React声明式编程的核心：你只需要描述"当tracks变化时重新画线"，不用手动管理DOM。

---

## 第13页 · LLM 辅助开发心得

```
我的开发流程：

  描述需求             报错调试              代码优化
  ───────             ───────              ───────
  "帮我写一个          "Cesium报            "这段for循环
   Canvas鹰眼图         polygon不           可以用map
   和3D地图联动"        显示"               +reduce改写"
      ↓                  ↓                   ↓
  LLM生成骨架         LLM定位bug          LLM重构代码
  （组件结构          （Cesium API        （从10行for
   +Canvas代码）       参数写错了）         变成3行链式）

LLM 的边界：
  ✅ 擅长：搭架子、查语法、解释报错、写工具函数
  ❌ 不擅长：Cesium 具体 API（常给错）、业务逻辑判断、大项目重构

我的策略：
  写代码前 → 先用 LLM 生成骨架，理解方向
  报错后   → 贴完整错误信息让 LLM 排查
  做完后   → 让 LLM 审查代码，找优化点
  最终决策 → 自己判断 —— LLM 的建议不一定对
```

> 🎤 **讲稿：** 最后说一下LLM怎么辅助我的开发。在搭组件骨架时——比如"写一个Canvas鹰眼图组件"——LLM能快速生成代码框架节省大量时间。在调试时贴报错信息能快速定位问题。但我发现LLM对Cesium这种相对小众的库的API经常给错，这时候必须查阅官方文档验证。我的策略是：LLM做副驾驶提出建议，我做最终判断。

---

## 第14页 · 总结

```
本项目让我掌握：

 ┌─────────────────────────────────────┐
 │  知识领域              具体技术       │
 ├─────────────────────────────────────┤
 │  语言基础        async/await、闭包    │
 │  数组方法        map/reduce/filter   │
 │  Canvas绘图      2D坐标变换、渲染管线  │
 │  DOM/BOM API     DOMParser、File API │
 │  浏览器渲染      requestAnimationFrame│
 │  React框架       Hooks、Zustand状态   │
 │  3D地图引擎      Cesium Entity API   │
 │  工程化          TypeScript、Vite    │
 └─────────────────────────────────────┘

            谢谢！请提问
```

> 🎤 **讲稿：** 总结一下。这个项目从零搭建到完成，让我从"会用React"进阶到"理解JavaScript"。从async/await异步编程到Canvas手绘，从数组高阶方法到requestAnimationFrame渲染优化——这些都是我通过实际写代码、调试、查文档真正掌握的。谢谢大家，欢迎提问。

---

## 附：每页时间分配建议（总计10分钟）

| 页码 | 内容 | 建议时间 |
|------|------|---------|
| 1-2 | 封面+项目背景 | 40秒 |
| 3-4 | 功能一览+技术栈 | 1分钟 |
| 5-6 | 文件结构+组件架构 | 1.5分钟 |
| 7-8 | 异步编程+数组方法 | 2.5分钟 |
| 9-10 | Canvas鹰眼图+rAF | 2分钟 |
| 11-12 | Zustand+React Hooks | 2分钟 |
| 13-14 | LLM心得+总结 | 1.5分钟 |
