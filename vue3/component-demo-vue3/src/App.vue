<!--
 * @Author: liubei
 * @Date: 2021-11-14 18:49:37
 * @LastEditTime: 2021-11-19 17:56:43
 * @Description: 
-->
<template>
    <div>
        <button @click="handleImport()">click</button>
        <component :is="comp"></component>
    </div>
</template>

<script>
import { markRaw } from 'vue'
export default {
    data() {
        return {
            path: '/components/hello-async-component/index.1.0.0.umd.js',
            // path: 'http://localhost:8000/components/hello-async-component/index.1.0.0.umd.js',
            // path: 'http://localhost:8000/components/hello-async-component/index.1.0.0.es.js',
            // path: '/components/hello-async-component/index.1.0.0.es.js',
            // path: '/components/hello-async-component/index.1.0.0.amd.js',
            // path: 'http://localhost:8000/components/hello-async-component/index.1.0.0.amd.js',
            comp: 'div',
        }
    },
    created() {
        
    },
    methods: {
        handleImport() {
            // amd
            requirejs([this.path], (m) => {
                console.log(m)
                this.comp = markRaw(m)
            })

            // system
            // System.import(this.path).then((m) => {
            //     console.log(m)
            // })

            // esm
            // import(this.path).then(m => {
            //     console.log(m)
            //     this.comp = markRaw(m.default)
            // })
        },
    },
}
</script>

<style>

</style>