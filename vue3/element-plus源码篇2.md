<!--
 * @Author: liubei
 * @Date: 2022-01-10 10:47:17
 * @LastEditTime: 2022-01-12 13:41:06
 * @Description: 
-->
# 核心包
从 element-plus 项目的 package.json 文件可以看出，整个项目使用 pnpm 进行管理，使用 monorepo 架构。子包包括 packages 文件夹下的内容、play 包和 docs 包。play 包是一个测试用的项目，docs 包用来构建文档站点。核心逻辑都在 packages 下，也是我们这篇文章分析的重点。

```json
  "packageManager": "pnpm@6.25.1",
  "workspaces": [
    "packages/*",
    "play",
    "docs"
  ],
```

## @element-plus/directives
在 packages/directives 下，定义了在组件中常用的 5 个指令，比如 click-outside、mousewheel 等。我们可以单独引入该包或者全量引入整个 element-plus 来使用

```
<div v-click-outside="outside">hello, world</div>

import { ClickOutside as vClickOutside } from '@element-plus/directives'
// import { ClickOutside as vClickOutside } from 'element-plus'
```

## @element-plus/locale
在 packages/locale 下，提供了组件相关的多个国家的语言文本

## @element-plus/test-utils
在 packages/test-utils 下，定义了一些测试时用到的函数

## @element-plus/theme-chalk
在 packages/theme-chalk 下，组件库的样式实现。之所以不把样式写在组件内部，而是把样式单独放在一个项目下维护，是为了能实现自定义主题功能，且主题的制作不影响组件库。element 官方提供了三种方式更换主题

### 在线主题编辑器
通过[在线主题编辑器](https://element.eleme.cn/#/zh-CN/theme/preview)，用户可以个性化自己的主题并导出。导出的文件是一个全量的主题包，包含所有组件的样式。这种方式的缺点是包体积大，且只支持旧版本组件库，新版本的 element-plus 的实现会有变动，不能直接使用。

### 覆盖 scss 变量
在项目样式文件中自定义相关的变量，在之后再导入 element-plus 的样式入口文件。
```scss
// styles/element/index.scss
/* just override what you need */
@forward 'element-plus/theme-chalk/src/common/var.scss' with (
  $colors: (
    'primary': (
      'base': green,
    ),
  )
);

// If you just import on demand, you can ignore the following content.
// 如果你想导入所有样式:
// @use "element-plus/theme-chalk/src/index.scss" as *;

```

这种方式也是全量导入样式，使用工具 unplugin-element-plus/vite 和 unplugin-vue-components/vite，可以实现按需导入组件和样式。

### 命令行主题工具
element 官方还提供了一个样式库的[仓库](https://github.com/ElementUI/theme-chalk)和一个命令行工具 element-theme，用来让用户自己自定义主题样式。这个仓库的代码是从旧版组件库中拷贝的，所以只适用旧版组件，在 element-plus 中已经被废弃。

## @element-plus/hooks
在 packages/hooks 下，定义了一些通用的基于 Composition API 的工具方法，用在组件的 setup 函数中。比如 useSize 函数用来获取组件的尺寸定义，由于 size 可能来源于全局定义，form 组件上下文，formItem 组件上下文，组件自己的 props 等，所以将这部分逻辑抽离出来放在 useSize 函数中实现。

## @element-plus/tokens
在 packages/tokens 下，导出了组件 provide 注入上下文时使用的 key，以及上下文的类型。现在的 tokens 包只有有限的几个组件。这个包的作用是把组件注入上下文的定义给抽离出来，提供给其它模块使用。比如 @element-plus/hooks 包中的 useGlobalConfig 函数，该函数使用 configProviderContextKey 获取 config-provider 组件上的配置信息。

### 组件间通信 provide/inject
在 element-plus 中大量使用了 provide/inject 作为组件间通信的基础，组件通过 provide 注入数据或方法，组件内整个组件树都可以通过 inject 获取到被注入的数据和方法。比较典型的实现比如，config-provider 组件通过 provide 注入 size、zIndex、locale，form 组件通过 provide 注入 labelWidth 等。这么做的好处是，在父组件上设置一个属性，其内部的所有子孙组件都能生效。

由于 table 的复杂性，组件内部实现了自己的状态管理功能，用来在组件内部做通信，共享状态。

## element-plus
在 packages/element-plus 下，这个包用来构建 element-plus 整个项目。其内部引入了其它 @element-plus/ 开头的包

```ts
import installer from './defaults'
export * from '@element-plus/components'
export * from '@element-plus/directives'
export * from '@element-plus/hooks'
export * from '@element-plus/tokens'
export * from '@element-plus/utils/popup-manager'
export { makeInstaller } from './make-installer'

export const install = installer.install
export const version = installer.version
export default installer
```

前面说过，element-plus 项目使用了 monorepo 架构，项目内部的多个包都被拆开来单独打包。这样做的好处是降低项目的复杂性，方便维护，且可以实现按需导入。所有整个项目只是一个维护项目，用来维护这些单独的包。element-plus 包用来全量打包所有功能，让浏览器能使用单个文件导入。


# 总结
这篇文章分析了 element-plus 项目中核心包的功能，了解 monorepo 架构的一些实践细节。monorepo 架构把整个项目按 directives、hooks、components 等拆分为多个模块，简化了项目的复杂度，更利于开发维护。且可以把一些更通用的功能单独发布出去供其他人使用。阅读源码可以让我们能更有效的使用 element-plus，遇到问题也能知道导致的原因，甚至自己想出解决方案。
