/*
 * @Author: liubei
 * @Date: 2021-11-14 18:48:30
 * @LastEditTime: 2021-11-19 17:56:20
 * @Description: 
 */
import * as Vue from 'vue'
import App from './App.vue'


// 在 AMD 中定义公共依赖
// @ts-ignore
// require.config({
//     // baseUrl: '',
//     nodeIdCompat: false,
// })
// @ts-ignore
define("vue", [], function() { return Vue });

const { createApp } = Vue

createApp(App).mount('#app')
