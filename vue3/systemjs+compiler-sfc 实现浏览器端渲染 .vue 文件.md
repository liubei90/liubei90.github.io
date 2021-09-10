# 为什么要写这篇文章
最近接手了新公司的后台管理项目的前端开发工作，这个项目由于开始的比较早，使用了jquery+bootstrap搭建的传统多页面应用。由于用惯了 vue 的组件化和双向数据绑定功能，使用 jquery 实在是痛苦。就萌生了将项目迁移到 vue 上的想法。大致的目标是

1. 新增页面使用 vue3 开发，不引入打包构建工具，直接在浏览器解析 .vue 文件。
2. 使用多页模式来兼容旧系统发布流程
3. 有时间就依次将旧页面切换到 vue3 实现
4. 最终将整个系统切换为vue3实现，引入 vite，支持es6等新特性、less、eslint

真正开始实践时还是比较困难的，由于不引入打包工具，等于要把构建的流程在浏览器走一遍。在网上没有相似的解决方案，自己尝试时也碰到了很多坑。最终在分析 vite 源码时，让我找到了systemjs + compiler-sfc 的解决方案。


# 实现步骤
## 直接通过 esm 引入 .vue 文件
我们写 .vue 时，普遍都使用 esm 做导入导出。webpack 可以将 esm 模块打包在一起。现代浏览器对 esm 支持率也很高了。如果将 .vue 当作 esm 模块直接导入会发生什么情况呢？
```html
<!-- index.html -->
<body>
    <div id="app"></div>

    <script src="./js/vue3/vue.global.js"></script>
    <script type="module">
        import Main from './main.vue';
        var app = Vue.createApp(Main).mount('#app');
    </script>
</body>
```

果不其然，下载完 .vue 文件后直接报错。这个报错的意思是，期望服务端响应一个 JavaScript module script，但是响应了一个 `application/octet-stream` 类型的文件。
```js
// Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "application/octet-stream". Strict MIME type checking is enforced for module scripts per HTML spec.
```

## 通过 systemjs 引入 .vue 文件
现在我们遇到两个问题：
1. 怎么让浏览器加载并执行 .vue 文件
2. 怎么让浏览器识别 esm 中的 import 和 export，以便加载依赖。

找来找去发现 systemjs 可以解决上面两个问题。根据 github 上的介绍，systemjs 是一个可 hook 的、基于标准模块加载器，可以将 esm 格式的模块转换为 System.register 模块格式，以便在不支持原生模块的旧浏览器中工作。

可 hook 意味着我们可以拦截对 .vue 文件的请求，将 .vue 文件转换为 esm。转换 esm 可以让我们识别 esm 中的 import 和 export，进行依赖加载。

先来测试一下加载 .vue 文件

```html
<div id="app"></div>

<script src="./js/systemjs-6.10.3/system.js"></script>
<script>
    function isVue(url) {
      return (url + "").indexOf(".vue") > -1;
    }

    System.constructor.prototype.shouldFetch = function () {
        return true;
    };

    var oldFetch = System.constructor.prototype.fetch;

    // 重写 fetch 钩子，获取 .vue 文件内容
    System.constructor.prototype.fetch = function(url, options) {
      return oldFetch(url, options).then(function (res) {
        if (!isVue(res.url)) {
            return res;
        }

        return res.text().then(function(t) {
            // 返回一个 console.log 语句，将 .vue 内容打印到控制台
            return new Response(
                new Blob(['console.log('+ JSON.stringify(t) +')'], { type: "application/javascript" })
            );
        });
      });
    }
</script>
<script >
    System.import('./main.vue').then(function(m) {
        console.log(m); // Module {Symbol(Symbol.toStringTag): "Module"}
    });
</script>
```

## 使用 @vue/compiler-sfc 转换 .vue 文件
通过 systemjs 拿到 .vue 文件后，怎么解析呢？我们知道 vite、webpack、rollup 这些打包工具都支持 .vue 文件。通过分析 vite 的 @vitejs/plugin-vue 插件可以知道，其使用了 @vue/compiler-sfc 这个包解析 .vue 文件。主要的步骤是识别 .vue 文件中的 template、script、style 标签中的文本内容，然后解析拼装为 esm 格式的脚本文件。让我们仿照这个插件实现重写 systemjs 的 fetch 钩子

```js
// systemjs-vue-0.0.1.js

var systemJSPrototype = System.constructor.prototype;

if (!VueCompilerSFC) {
    throw new Error('VueCompilerSFC 不存在，将不能解析 .vue 文件！');
}

function isVue(url) {
    return (url + "").indexOf(".vue") > -1;
}

systemJSPrototype.shouldFetch = function () {
    return true;
};

var fetch = systemJSPrototype.fetch;
systemJSPrototype.fetch = function (url, options) {
    return fetch(url, options).then(function (res) {
        if (!isVue(res.url)) {
            return res;
        }

        return res.text().then(function (source) {
            var id = hash.sum(url + source);
            var dataVId = 'data-v-' + id;
            var parseResult = VueCompilerSFC.parse(source, { sourceMap: false });
            var descriptor = parseResult.descriptor;
            var hasScoped = descriptor.styles.some((s) => s.scoped);

            var template = VueCompilerSFC.compileTemplate({ 
                id: id, 
                source: descriptor.template.content,
                scoped: hasScoped,
                compilerOptions: {
                    scopeId: hasScoped ? dataVId : undefined,
                }
            });
            var script = VueCompilerSFC.compileScript(descriptor, { 
                id: id,
                templateOptions: {
                    scoped: hasScoped,
                    compilerOptions: {
                        scopeId: hasScoped ? dataVId : undefined,
                    }
                },
            });

            // 处理 style 标签
            var styles = descriptor.styles;
            var styleCodes = [];

            if (styles.length) {
                for (var i = 0; i < styles.length; i++) {
                    var styleItem = styles[i];
                    styleCodes.push(VueCompilerSFC.compileStyle({ 
                        source: styleItem.content, 
                        id: dataVId,
                        scoped: styleItem.scoped,
                    }).code);
                }
            }

            var styleCode = styleCodes.join('\n');
            var styleUrl = url + '.css';

            styleCode = styleCode.replace(/url\(\s*(?:(["'])((?:\\.|[^\n\\"'])+)\1|((?:\\.|[^\s,"'()\\])+))\s*\)/g, function (match, quotes, relUrl1, relUrl2) {
                return 'url(' + quotes + resolveUrl(relUrl1 || relUrl2, styleUrl) + quotes + ')';
              });
            var styleSheet=new CSSStyleSheet();

            styleSheet.replaceSync(styleCode);
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];

            var renderName = '_sfc_render';
            var mainName = '_sfc_main';

            // 处理 template 标签
            var templateCode = template.code.replace(
                /\nexport (function|const) (render|ssrRender)/,
                '\n$1 _sfc_$2'
              );

            // 处理 script 标签
            var scriptCode = VueCompilerSFC.rewriteDefault(script.content, mainName);

            // 导出组件对象
            var output = [
                scriptCode,
                templateCode,

                mainName + '.render=' + renderName,
                'export default ' + mainName,
            ];

            if (hasScoped) {
                output.push(mainName + '.__scopeId = ' + JSON.stringify(dataVId));
            }

            var code = output.join('\n');

            console.log(code);

            return new Response(
                new Blob([code], { type: "application/javascript" })
            );
        });
    });
};

```

上面的代码，比较重要的是这些
- VueCompilerSFC.parse 解析 .vue 文件内容，将 template、script、style 分别拆分到不同的对象中
- VueCompilerSFC.compileTemplate 编译 template 为 render 函数
- VueCompilerSFC.compileScript 编译 script，提供对 setup 类型的支持
- VueCompilerSFC.compileStyle 编译 style，提供各种 css 预处理器的支持，提供 scoped 的支持

如果大家有兴趣，可以将每个函数的返回值输出，看一下转换结果。值得注意的是，转换后的 style 需要特殊处理，我这边在加载 .vue 文件时，直接生成一个 CSSStyleSheet 对象并插入到文档中。这么处理是不正确的，应该在 .vue 导出的组件被构建出来，并且插入到文档时，style 才生效。

## 引入 systemjs-babel 以支持 esm
通过上面的步骤，我们可以拿到转换后的 .vue 文件，此时的代码已经是可执行的 esm 格式的脚本了。但是存在一个致命的问题，如果我在 .vue 文件中 import 另一个 .vue 文件时，fetch 钩子不会做任何处理。如果我们直接执行 esm 脚本，浏览器虽然可以执行，但不能识别脚本内部对 .vue 文件的导入。所有我们需要将所有脚本文件再转换一次，转换为 systemjs 格式的导入导出，这样对 .vue 文件的导出都会被 fetch 钩子处理。systemjs-babel 这个库提供了转换的功能
```html
<script src="./js/vue3/compiler-sfc.global.js"></script>
<script src="./js/systemjs-6.10.3/system.js"></script>
<!-- 解析 .vue 文件的钩子 -->
<script src="./js/systemjs-vue-0.0.1.js"></script>
<!-- 转换 esm 的钩子 -->
<script src="./js/systemjs-babel-0.3.1/systemjs-babel.js"></script>
```

需要注意的是，systemjs-vue-0.0.1.js 脚本需要先于systemjs-babel.js 脚本引入，用来确保 .vue 文件先被解析为 esm 格式。

## 最终的项目文件
```
index.html
main.vue
js
|--systemjs-vue-0.0.1.js // 定义 fetch 钩子，用来解析对 .vue 文件的请求
|--hash-sum.js
|--systemjs-6.10.3
|--systemjs-babel-0.3.1 // 转换 js 文件中的 import 和 export 为 systemjs 格式
|--vue3
   |--compiler-sfc.global.js
   |--vue.global.js
```

源码可以在 [https://gitee.com/liubei90/sfc](https://gitee.com/liubei90/sfc) 找到