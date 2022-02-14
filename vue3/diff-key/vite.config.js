/*
 * @Author: liubei
 * @Date: 2021-11-06 14:43:59
 * @LastEditTime: 2022-02-11 16:56:23
 * @Description: 
 */
import vuePlugin from '@vitejs/plugin-vue'

export default {
    resolve: {
        alias: {
            'vue': 'vue/dist/vue.esm-bundler.js',
        },
    },
    plugins: [
        vuePlugin(),
    ]
}