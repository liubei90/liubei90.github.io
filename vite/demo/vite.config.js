/*
 * @Author: liubei
 * @Date: 2021-08-20 13:42:54
 * @LastEditTime: 2021-08-21 20:24:26
 * @Description: 
 */
import legacy from '@vitejs/plugin-legacy'

const { resolve } = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
    base: '/foo/',
    plugins: [
        // legacy({
        //     targets: ['defaults', 'not IE 11']
        // })
    ],
    build: {
        minify: false,
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                article: resolve(__dirname, 'article.html')
            }
        },
    }
})