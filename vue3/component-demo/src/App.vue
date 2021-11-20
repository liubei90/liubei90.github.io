<!--
 * @Author: liubei
 * @Date: 2021-11-14 18:49:37
 * @LastEditTime: 2021-11-16 17:03:45
 * @Description: 
-->
<template>
    <div>
        <button @click="handleImport()">click</button>
        <component :is="comp"></component>
    </div>
</template>

<script>
import { requireEnsure } from './ensure'
export default {
    data() {
        return {
            path: '/components/hello-async-component/index.1.0.0.umd.js',
            comp: 'div',
        }
    },
    created() {
        
    },
    methods: {
        handleImport() {
            requireEnsure(this.path).then((m) => {
                console.log(m)
                this.comp = m.default;
            })
        },
    },
}
</script>

<style>

</style>