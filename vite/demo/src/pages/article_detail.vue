<!--
 * @Author: liubei
 * @Date: 2021-08-23 10:10:09
 * @LastEditTime: 2021-08-23 14:25:43
 * @Description: 
-->
<template>
    <div>
        <h1>{{ art.title }}</h1>
        <p v-html="art.html"></p>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import marked from 'marked';

import { fetchArticleById } from '../api/article.js';

export default defineComponent({
    props: ['id'],
    setup({ id }) {
        const art = ref<{ [propName:string]: any }>({});

        fetchArticleById(id).then(res => {
            art.value = res;
            art.value.html = marked(res['content']);
        });

        return { art }
    },
})
</script>
