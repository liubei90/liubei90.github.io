/*
 * @Author: liubei
 * @Date: 2021-08-20 11:14:39
 * @LastEditTime: 2021-09-11 18:02:31
 * @Description: 
 */

// 转换后（预构建）
// marked是esm标准，没有特别转换
// import marked from '/node_modules/.vite/marked.js?v=16f722e1';
// qs是commonjs标准，会转换成esm标准
// import __vite__cjsImport1_qs from "/node_modules/.vite/qs.js?v=16f722e1"; const qs = __vite__cjsImport1_qs;

// build构建后
// import { a as fetchArticleById } from "./article.ab7e3d6e.js";
// import { l as lib, m as marked_1 } from "./vendor.f9fdba10.js";

// 使用@vitejs/plugin-legacy构建后
// 通过systemjs注册和导入

import marked from 'marked';
import * as qs from 'qs';

import './styles/index.css';


import { fetchArticleById } from './api/article.js';

document.addEventListener('DOMContentLoaded', function() {
    pageInit();
});

function pageInit() {
    const queryParams = qs.parse(window.location.search.replace('?', ''));

    if (queryParams['id']) {
        fetchArticleById(queryParams['id']).then(art => {
            buildApp(art);
        });
    }
}

function buildApp(art) {
    const app = document.querySelector('#app');
    const { title, content } = art;
    const head = document.createElement('h1');
    const div = document.createElement('div');

    head.textContent = title;
    div.innerHTML = marked(content);

    app.innerHTML = '';
    app.appendChild(head);
    app.appendChild(div);
}
