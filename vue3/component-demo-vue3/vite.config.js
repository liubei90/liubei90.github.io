/*
 * @Author: liubei
 * @Date: 2021-11-06 14:43:59
 * @LastEditTime: 2021-11-18 16:52:42
 * @Description: 
 */
import vuePlugin from '@vitejs/plugin-vue'

export default {
    base: './',
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    plugins: [
        vuePlugin(),
    ]
}