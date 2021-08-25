/*
 * @Author: liubei
 * @Date: 2021-08-23 10:12:31
 * @LastEditTime: 2021-08-23 14:28:22
 * @Description: 
 */
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';

import App from './app.vue';
import ArticleList from './pages/article_list.vue';
import ArticleDetail from './pages/article_detail.vue';
// import marked from 'marked';

const routes = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', component: ArticleList },
        { path: '/article/:id', component: ArticleDetail, props: true },
    ]
})


createApp(App).use(routes).mount('#app');
