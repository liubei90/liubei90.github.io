/*
 * @Author: liubei
 * @Date: 2021-11-06 14:43:59
 * @LastEditTime: 2022-03-03 16:34:37
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