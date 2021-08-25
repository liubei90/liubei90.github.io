/*
 * @Author: liubei
 * @Date: 2021-08-20 13:42:54
 * @LastEditTime: 2021-08-23 11:35:58
 * @Description: 
 */
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'

const { resolve } = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
    // base: '/foo/',
    plugins: [
        // legacy({
        //     targets: ['defaults', 'not IE 11']
        // })
        vue(),
    ],
    build: {
        minify: false,
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                article: resolve(__dirname, 'article.html')
            }
        },
    },
    // server:{
    //     fs: {
    //         allow: ['.'],
    //     },
    // }
})