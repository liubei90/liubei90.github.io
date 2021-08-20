/*
 * @Author: liubei
 * @Date: 2021-08-17 17:36:17
 * @LastEditTime: 2021-08-17 17:37:54
 * @Description: 
 */
var p = new Promise(function(resolve, reject) {
    resolve();
}).then(function() {
    console.log(1);
    throw new Error();
}).catch(function() {
    console.log(2);
}).finally(function() {
    console.log(3);
});