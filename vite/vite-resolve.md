<!--
 * @Author: liubei
 * @Date: 2021-09-27 09:35:10
 * @LastEditTime: 2021-09-27 18:36:31
 * @Description: 
-->

# 写在之前
最近在研究 vite 的源码，发现 vite 支持裸导入 node_modules 里的包。实现的原理是也很简单，在开发阶段，通过重写 import 语句，将裸导入转换为正确的导入。构建阶段，使用 rollup 打包依赖。下面我会模仿 vite 的实现，让浏览器支持裸导入。

# 创建测试用例
首先创建一个测试用例，通过 marked 这个第三方工具将 md 的内容转换为 html 字符串，然后输出到控制台。源码如下

```html
<!-- index.html -->
<script src="./index.js" type="module"></script>
```

```js
// index.js
import marked from 'marked'; // 裸导入

console.log(marked('# hello\n- world\n'));
```

执行```npm i marked```安装依赖

## 创建开发服务器
创建完测试用例后，需要一个服务器提供服务。这里使用 http、connect、sirv 这三个模块构建开发服务器。connect 是一个可扩展的 HTTP 服务器框架，可以让我们用中间件插件的方式处理请求。sirv 是一个优化过的轻量级中间件，用来处理静态资源请求。

```js
// server.js
import path from 'path';
import connect from 'connect';
import http from 'http';
import fs from 'fs';
import sirv from 'sirv';

// 请求中间件
const middlewares = connect();
// 开发服务器
const httpServer = http.createServer(middlewares);
const port = 3000;
const root = path.resolve('./');

// 静态文件
middlewares.use(serveStaticMiddleware(root));

httpServer.on('error', (err) => {
    console.error(err);
});

httpServer.listen(port, () => {
    console.log('http://localhost:' + port);
});

function serveStaticMiddleware( dir ) {
    const serve = sirv(dir, {})

    return function viteServeStaticMiddleware(req, res, next) {
        // 将其它请求当作静态文件处理
        serve(req, res, next);
    }
}
```

执行 ```node server.js```启动服务，然后在浏览器打开```http://localhost:3000```可以看到 index.js 文件报错。
```
// Uncaught TypeError: Failed to resolve module specifier "marked". Relative references must start with either "/", "./", or "../".
```

浏览器的意思是不能解析模块 marked 。模块导入语句必须用 "/"、"./"或"../"开头。

# 重写 esm 中的裸导入
我们写一个拦截 js 文件的中间件，用来重写 js 文件中的裸导入语句。
```js
// server.js
import { init, parse as parseImports } from 'es-module-lexer';
import resolve from 'resolve';
import MagicString from 'magic-string';

function serveJsMiddleware(root) {
    return function jsMiddleware(req, res, next) {
        if (path.extname(req.url) !== '.js') {
            return next();
        }

        // 读取 js 文件
        const url = req.url;
        const file = path.resolve(root, url.startsWith('/') ? url.slice(1) : url);
        const code = fs.readFileSync(file, 'utf-8');
        const s = new MagicString(code);

        // 解析 js 文件中的 import
        await init;
        const imports = parseImports(code)[0];
        console.log(imports);

        for (let i = 0; i < imports.length; i++) {
            // 拿到导入模块信息
            const {
                s: start,
                e: end,
                ss: expStart,
                se: expEnd,
                d: dynamicIndex,
                n: specifier
            } = imports[i];

            const bareImportRE = /^[\w@](?!.*:\/\/)/
    
            // 裸导入
            if (bareImportRE.test(specifier)) {
                const resolvedSrc = resolve.sync(specifier, {
                    basedir: path.dirname(file),
                });
                console.log(resolvedSrc);

                if (resolvedSrc.startsWith(root)) {
                    let specifierUrl = resolvedSrc.slice(root.length);
                    // 兼容 window 系统的路径格式
                    specifierUrl = specifierUrl.replace(/\\/g, '/');
                    s.overwrite(start, end, specifierUrl);
                }
            }

        }

        res.setHeader('Content-Type', 'application/javascript');
        res.statusCode = 200;
        res.end(s.toString());
    }
}
```
可以看到，我们用了 es-module-lexer、resolve、magic-string 模块。es-module-lexer 模块的作用是识别出 js 文件中的 import 语句。resolve 用来解析出裸导入的真实路径。magic-string 模块用来做代码的文本替换。

重新启动开发服务器后，看到裸导入已经重写成功了
```js
import marked from '/node_modules/marked/src/marked.js';
```

我们使用的是 esm 导入，marked 模块默认导出格式是 cjs，导致导入的 marked.js 报错。好在 marked 模块提供的有 esm 的入口，我们配置下 resolve，然后重启开发服务器。
```js
resolve.sync(specifier, {
    basedir: path.dirname(file),
    packageFilter: function packageFilter(pkg) {
        if (pkg.module) {
            // 用 esm 入口替换主入口
            pkg.main = pkg.module;
            delete pkg.module;
        }
        return pkg;
    }
});
```

# 总结

至此我们实现了让浏览器支持裸导入，这也是 vite 的核心功能，即通过开发服务器拦截请求并转换成浏览器可运行的 esm 语句，达到按需打包的目标。接下来的文章，我会梳理总结一下 vite 开发服务器的整个框架运行机制，和对 rollup 的打包机制模拟的逻辑。
