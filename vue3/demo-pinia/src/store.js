/*
 * @Author: liubei
 * @Date: 2022-03-03 16:38:56
 * @LastEditTime: 2022-03-03 16:44:16
 * @Description: 
 */
import { defineStore } from 'pinia'

// defineStore 返回的 hook 函数，执行结果是唯一的
export default defineStore('app', {
    state: () => ({ count: 1 }),
    actions: {
        add() {
            this.count = this.count + 1
        }
    }
})