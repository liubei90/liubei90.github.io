// 导出变量
let count = 1;
// export const CONST_VAR = 'CONST_VAR';
// 导出函数
function incCount() {
    count += 1;
}

export {
    count,
    incCount,
}


// // 导出类
// export class Demo {

// }

// function add(x) {
//     return x + count;
// }
// // 使用export导出一组变量
// export {
//     add,
//     // 使用as重命名导出的变量
//     add as addCount,
// }

// // 导出default
// export default add

// // 合并导出其他模块的变量
// export { name } from './esm_module2.js'
// export * from './esm_module2.js'