# vite 的实现思想

让我们来考虑下，浏览器已经普遍支持 esm 的情况下，为什么还需要 webpack、rollup、vite 这些打包工具。原因是 esm 的功能不满足我们的需求，比如说裸导入、导入 css、tree sharking、typescript、es678 等等。拿 webpack 处理导入css 举例来说，webpack 识别到`import 'raw.css';`这段代码时，会读取 raw.css 样式文件并转换为对应 js 代码。这个 js 文件在浏览器中执行，将 css 样式创建为 style 标签并插入到文档中。如果是 esm 执行到这段代码，会报错说我只想要一个 js 模块脚本，你个的 css 文件我执行不了。

和 webpack、rollup 相比，vite有什么优势呢？在 vite 官网上给的答案是，为了解决开发服务器启动缓慢和热更新缓慢的问题，提升开发效率和开发幸福感！拿 webpack 来说，开发服务器启动时，webpack 会通过入口文件，解析出所有依赖的资源，并执行这些资源的转义操作，构建出整个应用后才能提供服务。当一个项目包含上千个模块时，一次构建出整个应用的模式就遇到性能瓶颈了。vite 的做法是抛弃打包过程，按需构建，前端请求到哪个模块，再去构建这个模块。并且 vite 还使用了 esbuild 和预构建第三方库的优化手段，进一步提升按需构建的速度。


# vite 的实现

## 开发服务器的启动流程

vite 的开发服务器使用 http + connect 实现，主要代码如下
```js
import connect from 'connect';
import http from 'http';

// 请求中间件
const middlewares = connect();
// 开发服务器
const httpServer = http.createServer(middlewares);

// 添加各种中间件
// middlewares.use(xxx);

// 启动服务器
httpServer.listen(port, () => {
    console.log('http://localhost:' + port);
});
```
connect 是一个 node 中间件（middleware）框架，起源与 express。具体用法可以看[这里](https://github.com/senchalabs/connect)。vite 中有几个比较重要的中间件，可以在源码的`src/node/server/middlewares/`目录下找到

### baseMiddleware
baseMiddleware 用来处理配置项中的 base 选项（开发或生产环境服务的公共基础路径）。我们的代码在部署到生产环境时，一般会部署到某一个特定的目录下，这时访问请求的 url 会带上这个特定目录的前缀，也就是这里的 base 选项。baseMiddleware 会删除 base 前缀。

### servePublicMiddleware
响应 public 文件夹下的请求。vite 默认会将 public 文件夹下的文件当作项目根目录下的文件，且不做任何转义处理。

### transformMiddleware
transformMiddleware 用来转义处理 js、ts、css、png 等资源文件，这是 vite 最核心的代码实现。在这个中间件中会执行 resolveId、load、transform 这三个钩子函数。如果我们想对代码做些什么，可以通过写插件的方式实现这三个钩子。

### serveStaticMiddleware
serveStaticMiddleware 用来响应不需要转义的的资源文件请求，比如页面中的 img 标签发出的图片请求。

### indexHtmlMiddleware
indexHtmlMiddleware 用来处理 html 文件请求。其内部会调用所有插件的 transformIndexHtml 钩子。vite 内部实现了一个叫 devHtmlHook 的 transformIndexHtml 钩子，用来遍历 html 节点，将元素的 src 属性添加上 base 前缀，将内联脚本转换为网络请求。会被重写的节点属性如下
```js
{
    link: ['href'],
    video: ['src', 'poster'],
    source: ['src', 'srcset'],
    img: ['src', 'srcset'],
    image: ['xlink:href', 'href'],
    use: ['xlink:href', 'href']
}
```

## 几个重要的插件

vite 的核心功能之一是对 esm 的增强，比如实现裸导入，导入 css 等。这些功能都是通过他的插件实现。transformMiddleware 中间件用来执行resolveId、load、transform 三个插件钩子。具体源码在`src/node/plugins/`文件夹下。

### importAnalysisPlugin
importAnalysisPlugin 插件实现了 transform 钩子，当请求的是 js 脚本时，会通过 es-module-lexer 这个库分析出所有 import 语句。如果是裸导入，就分析出这个裸导入真正要导入的文件地址，然后转换为正确的导入 url。这个插件还会对 import.meta 进行增强，实现一些标准没有的功能，比如`import.meta.hot`。

### assetPlugin
assetPlugin 实现了 load 钩子，让我们可以在代码中通过`import imgUrl from './logo.png';`的方式获得资源的 url。通过 import 导入的 png 图片，服务器不直接返回图片的数据，而是返回一个 js 模块，在模块中通过 `export default ${imgUrl}`的方式导出要请求的图片的 url。

### resolvePlugin
resolvePlugin 实现了 resolveId 钩子，是一个比较重要的插件，用来转换 url 为真实路径。importAnalysisPlugin 插件中获取裸导入真正的文件地址的功能就是调用了这个插件实现的。

### esbuildPlugin
esbuildPlugin 实现了 transform 钩子，使用 esbuild 将ts、tsx 转换为 js。


## url 中的 query 参数
vite 会在请求后添加 query 参数的方式，用来标识当前请求的处理逻辑。有些是暴漏给开发者使用，有些是框架内部使用

- ?import 用在 js 中导入的静态资源上，防止使用浏览器缓存的静态资源。
- ?html-proxy 用来标识请求 html 中的内联模块。
- ?worker 和 ?sharedworker 标识请求是一个 web worker。
- ?url 用在导入 js 模块时，用来返回 js 模块的真实 url，而不是返回该模块
- ?raw 用来将资源以纯文本的格式导入

# 总结

这篇文章主要介绍了 vite 源码里比较核心的几个中间件和插件。看起来 vite 只是解决了开发时的效率问题，在构建生产环境代码时，vite 依然选择了使用 rollup 将代码打包。假如 webpack 和 rollup 也像 vite 一样提供按需打包的功能，是否可行呢？vite 的实现模拟了 rollup 的打包过程，在特定时机会调用 rollup 同名的钩子，这样可以复用现存的 rollup 插件。如果 rollup 要实现按需打包功能，肯定也是要兼容本身的插件机制的。假如 webpack 和 rollup 也实现了相同的功能，会不会 vite 突然就不香了呢？
