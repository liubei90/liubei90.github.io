/*
 * @Author: liubei
 * @Date: 2021-09-29 16:14:37
 * @LastEditTime: 2021-09-30 08:54:37
 * @Description: 
 */

// 该变量定义在模块作用域内，不是全局作用域！！！
var a = 50;

function createFunction() {
    var a = 100;
    // Function 构造的对象，其作用域在全局作用域
    return new Function('return a');
}

function createFunction2() {
    var a = 200;

    return function () {
        // 由于词法作用域，当前闭包返回 a 的值为 200
        return a;
    }
}

export {
    createFunction,
    createFunction2,
}
