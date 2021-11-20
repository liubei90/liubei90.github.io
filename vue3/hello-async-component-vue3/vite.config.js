/*
 * @Author: liubei
 * @Date: 2021-11-14 18:26:51
 * @LastEditTime: 2021-11-19 17:54:19
 * @Description: 
 */
import vuePlugin from '@vitejs/plugin-vue'
import path from 'path'
import pkg from './package.json'

export default {
    base: './',
    build: {
        minify: false,
        cssCodeSplit: true,
        outDir: 'hello-async-component',
        lib: {
            target: 'esnext',
            formats: ['umd'],
            // formats: ['iife', 'umd', 'es', 'cjs'],
            entry: path.resolve(__dirname, 'lib/index.js'),
            name: 'HelloAsyncComponent',
            fileName: (format) => `index.${pkg.version}.${format}.js`
        },
        rollupOptions: {
            // 确保外部化处理那些你不想打包进库的依赖
            external: ['vue'],
            output: {
                // chunkFileNames: 'chunks_[name].js',
                // format: 'amd',
                // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
                globals: {
                    vue: 'Vue'
                }
            }
        }
    },
    plugins: [
        vuePlugin(),
    ]
}
