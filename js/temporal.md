<!--
 * @Author: liubei
 * @Date: 2021-11-27 15:43:32
 * @LastEditTime: 2021-11-28 19:05:28
 * @Description: 
-->
# Temporal
Temporal 是 javascript 中关于日期时间的API，处于 tc39 流程的第三个阶段。用来取代现有的 Data 对象

## Data 对象
由于历史原因，js 语言的 Data 对象完全复制了 java 中的 Data 类。Data API 存在一些问题

1. Date 对象是可变的
2. 仅支持 UTC 和本地时区
3. 从字符串中解析日期的不可靠
4. 不支持公历以外的其他历法

<!-- 补充 解析日期的不可靠性的例子 -->
<!-- 补充 时区的例子 -->


## GMT和UTC
GMT叫格林尼治标准时间，格林尼治是地球本初子午线的标界处。太阳每天经过格林尼治正上方的时间就是中午12点。由于地球自转变慢，导致 GMT 越来越不准确。UTC叫做协调世界时，使用原子钟来计时，可以做到50亿年误差一秒。UNIX时间是类UNIX系统上使用的时间表示方式，使用UTC时1970年1月1日0时0分0秒起到现在的总秒数

## 时区
因为经度不同，世界各地的时间也不相同，时区用来表示这种时间上的偏移。一些国家因为各种原因，不会严格按照经度来划分时区，比如中国使用 Asia/Shanghai 和 Asia/Urumqi 这两个时区。为了节约能源而出现的夏令时，会在夏季把时间人为调快一个小时，改变了正常使用的时区。TZ database 是一个全球时区信息的仓库，由 IANA 维护。记录了一组世界各地时间历史的代码和数据。包括时区ID，对应的 UTC 偏移量，夏令时相关信息。

## ISO 8601
ISO 8601 日期和时间表示方法的国际标准，全称《数据存储和交换形式·信息交换·日期和时间的表示方法》。主要有
- 日期表示法：2004年5月3日可写成2004-05-03或20040503
- 时间表示法：UTC时间下午2点30分5秒可写成14:30:05Z或143005Z，北京时间下午2点30分5秒可写成14:30:05+08:00或143005+0800
- 日期和时间组合表示法：将日期和时间连在一起，中间加大写字母T。比如北京时间2004年5月3日下午2点30分5秒可写成2004-05-03T14:30:05+08:00或20040503T143005+0800

通常我们编程时使用的格式是 yyyy-MM-dd HH:mm:ss，这种格式不是标准的 ISO 8601 格式

## Temporal 的实现
Temporal 的实现主要包含四个概念，精确时间、日历日期和钟表时间、时区。之前说的 UTC 时间使用原子钟计时，和时区没有关系，具有确定性和精确性。UNIX 时间基于 UTC 时间，也具有确定性。

Temporal.Instant 对象保存的就是 UNIX 时间，有epochMicroseconds、epochMilliseconds、epochNanoseconds、epochSeconds 四个属性，分别对应距离 UTC 时1970年1月1日0时0分0秒起到当前时间的微秒、毫秒、纳秒、秒。

Temporal.Calendar 对象代表一个日历系统，我们可以拿以前使用的挂历来做例子，挂历上有两套日历，一套是国际上通用的公历，还有一套是中国的阴历。不同的日历系统表达同一天存在差异，比如 2021年11月28号，阴历就是十月廿（niàn）四。Temporal 使用的默认日历是 iso8601

Temporal.PlainDate 对象代表的和时区无关的日历日期，每个对象相当于挂历上的一个日期
```js
// PlainDate 构造函数传入的日期需要是 iso8601 日历的日期
const date2 = new Temporal.PlainDate(2021, 11, 28, 'hebrew')
console.log(date2.toString()) // 2021-11-28[u-ca=hebrew]
console.log(date2.year) // 5782
console.log(date2.calendar.year(date2)) // 5782
console.log(date2.month) // 3
console.log(date2.day) // 24
console.log(date2.daysInYear) // 384
console.log(date2.monthsInYear) // 13
console.log(date2.daysInMonth) // 30
```

Temporal.PlainTime 对象代表和时区无关的钟表时间，比如 2:30
```js
const time = new Temporal.PlainTime(2, 30, 0)
console.log(time.toString()) // 02:30:00
console.log(Temporal.PlainTime.from('2021-11-28T02:30:00').toString()) // 02:30:00
console.log(Temporal.PlainTime.from('2021-11-28T02:30:00+08:00').toString()) // 02:30:00
```

Temporal.PlainDateTime 可以看作是日历日期和钟表时间的结合体。我们在编程时，如果对时区不敏感的情况下，使用的都是 PlainDateTime。比如一个时间选择组件，选取的时间格式就是 yyyy-MM-dd HH:mm:ss。

Temporal.TimeZone 代表一个时区，所有可使用的时区可以在 TZ database 中找到。TimeZone 可以将一个 PlainDateTime 对象转换为 Instant，也可以将 Instant 对象转换为 PlainDateTime。
由于夏令时的存在，PlainDateTime 转 Instant 可能存在歧义。比如1986的中国，国家要求开始实施夏令时，每年的四月中旬第一个星期日的凌晨2时整（北京时间），将时钟拨快一小时，即将表针由2时拨至3时，夏令时开始，到九月中旬第一个星期日的凌晨2时整，再将时钟拨回一小时，即将表针由2时拨至1时，夏令时结束。钟表由2时拨到3时，其中的一个小时就“消失”了，这一天的 2:30 代表的就是一个不存在的时间。当退出夏令时时，需要将钟表由2时拨至1时，这一天的 1:30 就有两个。Temporal 对于这种转换的歧义，以及处理时间间隔上都做了很好的处理，有兴趣的可以具体了解下，这里就不具体说了（我也没看太懂@.@）。

Temporal 提供用于修改日期和时间的 API，这就保证了时间对象的不可变特性。TimeZone 对象的加入，可以表示几乎所有已存在的时区。Temporal 类型都有一个字符串表示，对应着 ISO 8601 标准，以及对标准的扩展。这些特性很好的解决了 Date 对象的不足。

## 语言环境
在日期处理中，日期的展示是一个比较麻烦的事情。我记得刚开始写 js 代码时，需要格式化 Date 对象，就上网找了一个格式化函数，这个函数流传很广，写 js 的朋友应该都不陌生。
```js
function dateFormat(fmt, date) {
    let ret;
    const opt = {
        "Y+": date.getFullYear().toString(),        // 年
        "m+": (date.getMonth() + 1).toString(),     // 月
        "d+": date.getDate().toString(),            // 日
        "H+": date.getHours().toString(),           // 时
        "M+": date.getMinutes().toString(),         // 分
        "S+": date.getSeconds().toString()          // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        };
    };
    return fmt;
}
```

不同的语言环境，对日期的展示格式也不太一样。为了解决这个展示问题，js 引入了 Intl 对象，用来处理日期时间格式化。Temporal 中的 toLocaleString 函数也是用来格式化日期时间的，和Intl 的实现一致。
```js
const date = Temporal.PlainDate.from({ year: 2021, month: 11, day: 28 });

console.log(date.toString()) // 2021-11-28
// 本人的浏览器环境就是中文简体，默认和 zh-Hans-CN 一致
console.log(date.toLocaleString()) // 2021/11/28
// 'zh-Hans-CN': 中国（地区）用简体字（文字）书写的中文（语言）
console.log(date.toLocaleString('zh-Hans-CN')) // 2021/11/28
// 'hi': Hindi 印地语
console.log(date.toLocaleString('hi')) // 28/11/2021
// 'de-AT': 奥地利（地区）使用的德语（语言）
console.log(date.toLocaleString('de-AT')) // 28.11.2021
console.log(date.calendar.id) // iso8601
```

具体支持哪些语言环境，可以在 mdn 上看到
https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl


# 总结
Date 由于历史原因导致的众多问题，已经没法通过修改 Date 对象来修复了，否则会引起现存的很多网站出问题。tc39 的 Temporal 提案重新设计了日期时间相关的 API，让我们未来能更好的处理代码中的时间。现在就想尝试使用的朋友，可以在提案的 github 仓库找到 polyfill。
