/*
 * @Author: liubei
 * @Date: 2021-08-17 13:31:31
 * @LastEditTime: 2021-08-20 09:23:47
 * @Description: 
 */
// 导入变量
import { count, incCount } from './esm_module1.js';
console.log('import.meta.url', import.meta.url);

console.log(count);
incCount();
console.log(count);
