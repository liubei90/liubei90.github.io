// 使用 node dynamic_demo.js 执行该脚本，该脚本不是全局作用域！！！

var { createFunction, createFunction2 } = require('./dynamic_module.js');

// 该变量不是定义在全局作用域内！！！
var a = 0;

// globalThis 和全局作用域的关系是什么？？？
globalThis.a = -100;

console.log(createFunction()());
console.log(createFunction2()());
