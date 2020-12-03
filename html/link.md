# link标签
规定了当前文档与外部资源的关系

## href
此属性指定被链接资源的URL。 URL 可以是绝对的，也可以是相对的。

## media
外部资源适用的[媒体查询类型](https://developer.mozilla.org/zh-CN/docs/Web/Guide/CSS/Media_queries), 可以用来制作响应式页面

## rel
当前文档与外部资源的关系（[链接类型](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Link_types)）。

比较常用的有```stylesheet```, ```preload```,```icon```

## type
外部资源的内容的MIME类型

## crossorigin
加载相关资源时是否必须使用 CORS，可用的值有：
- anonymous 会发起一个跨域请求(即包含 Origin: HTTP 头). 但不会发送任何认证信息 (即不发送 cookie, X.509 证书和 HTTP 基本认证信息). 如果服务器没有给出源站凭证 (不设置 Access-Control-Allow-Origin: HTTP 头), 资源就会被污染并限制使用.
- use-credentials 会发起一个带有认证信息 (发送 cookie, X.509 证书和 HTTP 基本认证信息) 的跨域请求 (即包含 Origin: HTTP 头). 如果服务器没有给出源站凭证 (不设置 Access-Control-Allow-Origin: HTTP 头), 资源就会被污染并限制使用

## as
rel="preload" 时才能使用， 指定了加载资源的类型（和type不同）。用于浏览器判断优先级、请求匹配、正确的内容安全策略的选择以及正确的 Accept请求头的设置。


# 通过rel="preload"进行内容预加载
head中如果包含rel="preload"的外部资源，浏览器会在渲染之前开始预加载该资源。优点是不易阻塞页面的渲染，提升页面性能。[mdn文档](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Preloading_content)

