# vite 的实现思想

webpack、rollup 等打包工具的工作原理是，构建模块依赖图，将多个模块打包在一个包里发送给浏览器执行。目的是在开发时可以使用 esm 或 cjs 的语法将应用程序拆分到多个模块中，运行时能让传统浏览器正常执行这些模块。当项目中模块数量太大，通过模块依赖图构建整个包就会出现性能瓶颈，导致开发体验特别差。后来引入的 hmr 依然不能彻底解决构建时的性能问题。

在现代浏览器对 esm 的支持度已经非常高的环境下，vite 放弃实时构建模块依赖图的思路，将这个构建过程做成按需构建的模式。这个按需的底层逻辑是，只有浏览器请求到的模块，才会被构建并加入到模块依赖图中。为什么浏览器支持了 esm，就可以实现按需构建呢？

既然是按需构建，就不会有打包的过程。浏览器直接请求入口文件，执行入口文件的过程中通过网络请求拿到依赖模块。在不支持 esm 的浏览器中，我们可以使用动态创建 script 节点的方式实现。但是我们的代码使用的是 esm 的语法，浏览器如何将 esm 中的 import 转换为可识别的导入语句呢？一种可行的方法是使用 systemjs + systemjs-babel 在浏览器端直接解析 import 为 systemjs 的导入语法。第二种方法是将 import 的解析过程交给开发服务器。这两种情况都需要将同步的 import 转换为异步操作。在 esm 可用的情况下，这种转换过程就不存在了，浏览器能正常实现 import 的同步加载功能。vite 对 esm 的功能做了扩展，使我们的代码和使用 webpack、rollup时保持一致，并且通过和 rollup 的整合，实现对传统浏览器的支持。

这就是 vite 的实现思想，将尽可能多的工作转移到浏览器上执行，并且对开发服务器的解析过程进行优化，达到开发时的极限性能。


# vite 的实现细节

vite 可以作为开发服务器使用，用户在开发时将能体验到 vite 极速的冷启动和 hmr。发布生产时通过预配置 Rullup 打包程序，默认的打包格式是 esm，也可以通过插件生成传统打包格式。vite 的亮点就是作为开发服务器时的极速体验。开发服务器在处理请求时，会模拟 Rollup 的打包过程，并触发同名的钩子，使 Rollup 插件能在开发环境使用（不得不说，vite 这个做法有点厉害，直接省去了插件生态的构建）。下面主要分析下开发服务器的启动流程，服务器加载的各种中间件，插件的执行时机，以及一些重要的插件实现。

## 开发服务器的启动流程


## 构建模块图

## import

importAnalysisPlugin 插件使用 es-module-lexer 这个库来解析、识别模块中的 import 语句，通过重写 import 语句实现对 esm 的增强。比如对 import.meta 的扩展。

### 扩展 import.meta

- import.meta.glob 被转换为模块的动态导入
  ```js
    // { "./src/api/article.js": () => import("/src/api/article.js"),}
    import.meta.glob('./src/api/**/*')
  ```
- import.meta.hot 被识别出来，表示该文件为 hmr 边界。在文件头添加如下导入语句，初始化 import.meta.hot 对象
  ```js
    // import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/normalize-url.html?html-proxy&index=0.js");
    import.meta.hot.accept((m) => { console.log(m) });
  ```
- import.meta.env 被识别出来，在文件头注入 env 对象
  ```js
    // import.meta.env = {"BASE_URL":"/","MODE":"development","DEV":true,"PROD":false,"SSR":false};
    console.log(import.meta.env);
  ```

### 同步导入模块的 url 重写
- 导入文件在服务器根目录外部时，url 添加 /@fs/ 前缀。
  ```js
    // import { add } from '/@fs/C:/Users/xxx/vite/test.js'
    import { add } from '../test.js'
  ```
- 将 url 转换为就绝对路径
  ```js
    // import { add } from '/test.js'
    import { add } from './test.js'
  ```
- 导入非 js 或 css 类型文件时，添加 import 查询参数，为后续处理做标识
  ```js
    // import User from '/src/user.json?import'
    import User from './src/user.json'
  ```
- 通过插件实现的虚拟模块，url 添加 /@id/ 前缀
  ```js
    // import vt from '/@id/virtual-test'
    import vt from 'virtual-test'
  ```
- 设置 base 为 foo，将处理过的 url 添加 base 前缀
  ```js
    // import { add } from '/foo/test.js'
    import { add } from './test.js'
  ```
- 裸导入，将 url 转换为 /node_modules/ 中预构建缓存地址（预构建缓存是否存在不做校验）
  ```js
    // 导入 esm
    // import marked from '/node_modules/.vite/marked.js?v=fc6436e4'
    import marked from 'marked'

    // 导入 cjs
    // 命名空间导入
    // import __vite__cjsImport1_qs from "/node_modules/.vite/qs.js?v=fc6436e4"; const qs = __vite__cjsImport1_qs
    import * as qs from 'qs'

    // default 导入
    // import __vite__cjsImport2_qs from "/node_modules/.vite/qs.js?v=fc6436e4"; const qsdef = __vite__cjsImport2_qs.__esModule ? __vite__cjsImport2_qs.default : __vite__cjsImport2_qs
    import qsdef from 'qs'

    // 正常导入
    // import __vite__cjsImport3_qs from "/node_modules/.vite/qs.js?v=fc6436e4"; const parse = __vite__cjsImport3_qs["parse"]
    import { parse } from 'qs'
  ```

### 异步导入模块的 url 重写

使用 import() 异步导入的模块，url 重写逻辑和同步导入相同


##  转换（transformMiddleware）

transformMiddleware 中间件只处理 get 请求，依次执行 resolveId、load 和 transform 三个钩子。主要用来转换请求


## 转换 index.html
vite 使用 indexHtmlMiddleware 中间件处理 html 文件。包括执行插件中的 transformIndexHtml 钩子，以及内置的 devHtmlHook 函数。devHtmlHook 函数用来重写 html 中资源路径，具体如下：

- script 的 src，以 / 开头的绝对路径，在开头添加 config.base 前缀。以 ./ 开头的相对路径不重写
- 一些非 script 标签的 src 或 href 属性也会被重写（重写逻辑同 script）
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
- type 等于 module 的内联 script，其脚本内容会被移除，src 重写为 `config.base + htmlPath + ?html-proxy&index=${scriptModuleIndex}.js`。script 的内容会在 htmlInlineScriptProxyPlugin 插件处理并返回。


## url 后的 query
- ?import 标识请求是通过 import 发起，需要进行转换。否则从 /public 文件夹读取
- ?html-proxy&index=1.js 返回 html文件中索引为 1 的内联 script 内的脚本内容
    这么做的目的，应该是需要对 js 统一处理，所有 js 都需要经过统一的处理中间件。如果还放在 html 中，需要中间件处理 html，增加中间件实现的复杂度
- ?direct 用在 css 请求中，标识样式不需要预处理器处理
- ?worker 和 ?sharedworker 标识请求是一个 web worker
- ?raw 将请求内容作为纯文本导出，类似这样 `export default ${JSON.stringify(fs.readFileSync(file, 'utf-8'))}`。支持导入 /public 文件夹下文件和根目录下文件
- ?url 将请求 url 转换为 url 导出，类似`export default ${JSON.stringify(url)}`。开发模式下转换后的 url 为绝对路径，且路径和源码中的位置相同。build 模式下，url 转换为打包后的绝对路径。



## url 重写 与 config.base

config.base 配置会影响 url 重写的策略，且服务器响应重写的 url，需要转换会原始 url。

- 重写 url
- 服务器中间件会将 req.url 重写，移除 req.url 中的 base。如果是请求 / 或 /index.html，将请求重定向到 base。否则返回 404。


## ws 与 hmr


