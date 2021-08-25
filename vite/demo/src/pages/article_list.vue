<!--
 * @Author: liubei
 * @Date: 2021-08-23 10:09:54
 * @LastEditTime: 2021-08-23 14:02:07
 * @Description: 
-->
<template>
    <ul>
        <li v-for="item in articleList" :key="item['id']">
            <router-link :to="'/article/' + item['id']">{{ item['title'] }}</router-link>
        </li>
    </ul>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';

import { fetchArticles } from '../api/article.js';

export default defineComponent({
    setup() {
        const articleList: any = reactive([]);

        fetchArticles().then((artList: any[]) => {
            artList.forEach(art => {
                articleList.push(art);
            });
        });

        return {
            articleList,
        }
    },
})
</script>
