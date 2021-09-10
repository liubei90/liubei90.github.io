/*
 * @Author: liubei
 * @Date: 2021-09-07 09:47:52
 * @LastEditTime: 2021-09-07 09:58:27
 * @Description: 
 */
import { foo } from './esm_cycle2.mjs';


// export var bar = 'baz'; // 循环依赖时，未赋值之前就引用bar，值为undefined
export const bar = 'baz'; // 循环依赖时，未赋值之前就引用bar，程序报错 // ReferenceError: Cannot access 'bar' before initialization

console.log('m1->bar:', bar);
console.log('m1->foo:', foo);
