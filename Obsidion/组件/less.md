# less 特性
## 变量

```less
@width: 10px;
@height: @witdh + 10px;

#header {
    width: @width;
    height: @height;
}
```

变量除了用在 css rules 中，还能用在选择器名称、urls、`@import` 语法中

```less
@selector: banner;
.@{selector} {}
// 输出：
.banner {}

@images: "../imags";
.banner: {
    background: url("@{images}/banner.png")
}

@import "@images/index.less";

@property: color;
.banner {
    @{property}: white;
    background-@{property}: black;
}
```

变量有 `lazy evaluation` 特性，类似 js 中的变量提升，变量可以在定义之前使用。该特性和原生 CSS 变量很类似。

```less
.button {
    color: @color;
}
@color: blue;
```

3.x 版本的 less 还增加了 properties as variables 的特性，支持将 css rules 中的属性作为变量使用。

```less
.button {
    color: #fff;
    background-color: $color; // 会将当前规则中的 color 属性值 作为 $color 的值
}
```

properties as variables 变量用 `$` 开头，普通变量定义和使用时用 `@` 开头，变量插值的语法使用 `@{}` 。

## mixins

类选择器和 id 选择器都可以通过混入调用将自身的 rulesets 混入到目标选择器中。

```less
#id1 {
    padding-bottom: 10px;
}
.a {
    padding-top: 10px;
}
.b {
    .a();
    #id1();
}
```

mixins 的定义可以时类选择器或 id 选择器，可以在选择器后加上 `()` ，这样输出将不包含 mixins 的定义。mixins 通过 `()` 使用，历史版本中可以省略 `()` ,这种方式已经被废弃。

mixins 可以有一个 guard，当 guard 的值为 `true` 时，mixins 才生效。

```less
.my-mixin() when (@mode = huge) {
    color: white;
}
```

可以将 mixins 分配给变量，通过调用该变量实现 mixins 的调用。

```less
.my-mixin() {
    color: white;
}

.button {
    @color: .my-mixin();
    @color();
    background-color: @color[color];
}
```

mixins 分配给变量时，必须使用 `()` 语法，因为不使用 `()` 时，变量作为插值使用时存在语法冲突。

```less
.my-mixin() {
    color: white;
}

.button {
    @color: .my-mixin; // 此时 my-mixin 会被用作插值
    @{color} {
        a: b;
    }
}

// 输出：
.button {
    .my-mixin {
        a: b;
    }
}
```

## css guards

guard 除了可以在 mixins 中使用，还可以用在选择器中，用来通过条件判断启用或禁用选择器

```less
.button when (@dark-mode = true) {
    color: white;
}
```

## operations

less 支持属性值类型是 `number`，`color`，`变量` 的 `+`,`-`,`*`,`/` 操作，操作数有单位时会先尝试转换单位，不能转换时（`10px + 10%`）忽略单位。

## escaping

转义可以看成插值操作，将定义的任何字符串替换到目标变量。从语法上看和变量定义类似，可以在非属性值中使用。

```less
@min768: ~"(min-width: 768px)";
// 或 @min768: (min-width: 768px);

@media @min768 {

}

// 输出：
@media (min-width: 768px) {

}
```

## Namespaces and Accessors

通过 namespaces 将样式集合在一个命名空间下，方便管理

```less
#bundle() {
    .button {
        border: 1px solid gray;
    }
    .tab {
    }
}

#header a {
    #bundle.button();
}
```

## Maps

可以定义 Maps 结构，将属性集合在一个 Maps 下。Maps 本质上是 mixins。

```less
#colors() {
    primary: blue;
    secondary: green;
}

.button {
    color: #colors[primary];
}
```

## Scope

less 使用变量和 mixins 时，会先从本地定义开始查找，沿着嵌套结构向上查找。

```less
@var: red;
#page {
    @var: blue;
    #header {
        color: @var;
    }
}
```

