/*
 * @Author: liubei
 * @Date: 2021-09-07 09:47:55
 * @LastEditTime: 2021-09-07 09:57:09
 * @Description: 
 */
import { bar } from './esm_cycle1.mjs';


export const foo = 'foz';

console.log('m2->bar:', bar); // ReferenceError: Cannot access 'bar' before initialization
console.log('m2->foo', foo);
