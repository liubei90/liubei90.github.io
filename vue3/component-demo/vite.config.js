/*
 * @Author: liubei
 * @Date: 2021-11-06 14:43:59
 * @LastEditTime: 2021-11-14 18:47:33
 * @Description: 
 */
import { createVuePlugin } from 'vite-plugin-vue2'

export default {
    base: './',
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    plugins: [
        createVuePlugin(),
    ]
}