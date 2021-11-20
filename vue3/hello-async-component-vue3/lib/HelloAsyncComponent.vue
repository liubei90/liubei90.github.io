<!--
 * @Author: liubei
 * @Date: 2021-11-14 18:30:06
 * @LastEditTime: 2021-11-19 17:54:40
 * @Description: 
-->
<template>
  <div class="hello-async-component" v-html="markedStr"></div>
</template>

<script>
import { ref } from 'vue'
// 同步加载 marked, 打包器会将依赖打包到脚本中
import { marked } from 'marked'

export default {
    name: 'HelloAsyncComponent',
    setup() {

      const markedStr = ref('') 

      // 同步加载 marked
      markedStr.value = marked('- hello, async component vue3')

      // 使用异步加载，打包器会自动拆分依赖到 chunk 文件中
      // NOTE: iife 和 UMD 格式不支持 code-splitting
      // import('marked').then((m) => {
      //   markedStr.value = m.marked('- hello, async component vue3')
      // })

      return {
        markedStr,
      }
    }
}
</script>

<style scoped>
.hello-async-component {
  font-size: 20px;
}
</style>