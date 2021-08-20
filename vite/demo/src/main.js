/*
 * @Author: liubei
 * @Date: 2021-08-19 16:46:46
 * @LastEditTime: 2021-08-19 16:48:02
 * @Description: 
 */
const app = document.querySelector('#app');
let count = 1;

setInterval(function() {
    app.textContent = count++;
}, 2000);
