/*
 * @Author: liubei
 * @Date: 2021-11-14 18:48:30
 * @LastEditTime: 2022-03-11 11:44:29
 * @Description: 
 */
import Vue from 'vue'
// import App from './App.vue'

const app = new Vue({
    el: '#app',
    data() {
        return { count: 1 }
    },
    beforeCreate() {
        console.log('setTimeout1', this.count) // undefined

        setTimeout(() => {
            console.log('setTimeout2', this.count = this.count + 1) // 2
        }, 0)

        let n= 0
        for (let i = 0; i < 10000000000000; i++) {
            n++
        }
        console.log(n)
    },
    render(h) {
        return h('div', this.count) // 2
        // return h(App)
    }

})