/*
 * @Author: liubei
 * @Date: 2021-08-20 13:42:54
 * @LastEditTime: 2021-09-13 16:49:32
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
        {
            resolveId(id) {
                if (id == 'virtual-test') { return id; }
            },
            load(id, ssr) {
                if (id == 'virtual-test') {
                    return `console.log(${JSON.stringify(id)}); export default ${JSON.stringify(id)}`;
                };
            },
        }
    ],
    build: {
        minify: false,
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                article: resolve(__dirname, 'article.html'),
                query: resolve(__dirname, 'query.html'),
            }
        },
    },
    // server:{
    //     fs: {
    //         allow: ['.'],
    //     },
    // }
})