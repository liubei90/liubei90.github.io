# vite 的实现细节

## 作为开发服务器时 

### 构建模块图

### import

importAnalysisPlugin 插件用来识别模块中的 import 语句，通过重写 import 语句实现对 import 的增强。比如支持导入 css 文件，支持裸导入。

- 识别导入脚本中的 import 语句
  - 相对 url 重写为绝对 url
  - 裸导入重写为 /node_module/.vite/xxx 导入
  - 裸导入的模块会被预构建，将 commonjs 和 umd 格式转换为 esm


###  转换（transformMiddleware）

transformMiddleware 中间件只处理 get 请求，依次执行 resolveId、load 和 transform 三个钩子。主要用来转换请求


### 转换 index.html
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


### url 后的 query
- ?import 标识请求是通过 import 发起，需要进行转换。否则从 /public 文件夹读取
- ?html-proxy&index=1.js 返回 html文件中索引为 1 的内联 script 内的脚本内容
    这么做的目的，应该是需要对 js 统一处理，所有 js 都需要经过统一的处理中间件。如果还放在 html 中，需要中间件处理 html，增加中间件实现的复杂度
- ?direct 用在 css 请求中，标识样式不需要预处理器处理
- ?worker 和 ?sharedworker 标识请求是一个 web worker
- ?raw 将请求内容作为纯文本导出，类似这样 `export default ${JSON.stringify(fs.readFileSync(file, 'utf-8'))}`。支持导入 /public 文件夹下文件和根目录下文件
- ?url 将请求 url 转换为 url 导出，类似`export default ${JSON.stringify(url)}`。开发模式下转换后的 url 为绝对路径，且路径和源码中的位置相同。build 模式下，url 转换为打包后的绝对路径。



### url 重写 与 config.base

config.base 配置会影响 url 重写的策略，且服务器响应重写的 url，需要转换会原始 url。

- 重写 url
- 服务器中间件会将 req.url 重写，移除 req.url 中的 base。如果是请求 / 或 /index.html，将请求重定向到 base。否则返回 404。


### ws 与 hmr


